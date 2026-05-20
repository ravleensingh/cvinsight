const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Resume = require('../models/Resume');
const auth = require('../middleware/auth');
const { parseResumeFile, mergeParsedData } = require('../services/resumeParsingService');
const {
  screenResumeAgainstJobDescription,
  normalizeJobDescription,
  inferJobRequirementsFromDescription
} = require('../services/screeningService');
const {
  generateScreeningNarrative,
  enrichJobDescriptionInput,
  evaluateResumeQualityWithModel
} = require('../services/insightService');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const hasPdfExtension = `${file.originalname || ''}`.toLowerCase().endsWith('.pdf');

    if (isPdfMime || hasPdfExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

const router = express.Router();

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value.split(/,|\n/).map(item => item.trim()).filter(Boolean);
  }

  return [];
}

async function buildAdHocJobDescription(payload = {}) {
  const directDescription = [
    payload.jobDescriptionText,
    payload.description,
    payload.jobDescription,
    payload.jdText,
    payload.jd
  ]
    .map(value => `${value || ''}`.trim())
    .filter(Boolean)
    .join('\n\n');

  const title = `${payload.jobTitle || payload.title || ''}`.trim();
  const company = `${payload.company || ''}`.trim();
  const roleDetails = `${payload.roleDetails || payload.roleSummary || ''}`.trim();
  const requirementsNotes = `${payload.requirementsNotes || payload.jobNotes || ''}`.trim();

  if (!directDescription && !title && !roleDetails && !requirementsNotes) {
    return null;
  }

  const modelEnrichment = await enrichJobDescriptionInput({
    jobTitle: title,
    company,
    description: directDescription,
    roleDetails,
    requirementsNotes
  });

  const modelData = modelEnrichment.data || {};
  const description = `${modelData.description || directDescription}`.trim();

  if (!description) {
    return null;
  }

  const enrichedRequirements = inferJobRequirementsFromDescription(description, {
    requiredSkills: toArray(payload.requiredSkills).length ? toArray(payload.requiredSkills) : toArray(modelData.requiredSkills),
    preferredSkills: toArray(payload.preferredSkills).length ? toArray(payload.preferredSkills) : toArray(modelData.preferredSkills),
    keywords: toArray(payload.keywords).length ? toArray(payload.keywords) : toArray(modelData.keywords),
    requirements: toArray(payload.requirements).length ? toArray(payload.requirements) : toArray(modelData.requirements),
    educationRequirements: toArray(payload.educationRequirements).length
      ? toArray(payload.educationRequirements)
      : toArray(modelData.educationRequirements),
    minimumExperience: Number(payload.minimumExperience || modelData.minimumExperience || 0)
  });

  return normalizeJobDescription({
    id: 'ad-hoc-jd',
    title: modelData.title || title || 'Custom Job Description',
    company: modelData.company || company,
    description,
    roleDetails,
    requirementsNotes,
    ...enrichedRequirements,
    autoShortlistThreshold: Number(payload.autoShortlistThreshold || modelData.autoShortlistThreshold || 70)
  });
}

function validateObjectId(id) {
  return mongoose.isValidObjectId(id);
}

// GET /api/resume - Get all resumes for user
router.get('/', auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: `Found ${resumes.length} resumes`,
      data: resumes
    });
  } catch (err) {
    console.error('Get resumes error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch resumes',
      data: null
    });
  }
});

// GET /api/resume/:id - Get single resume
router.get('/:id', auth, async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resume ID',
        data: null
      });
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
        data: null
      });
    }

    return res.json({
      success: true,
      message: 'Resume retrieved successfully',
      data: resume
    });
  } catch (err) {
    console.error('Get resume error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch resume',
      data: null
    });
  }
});

// POST /api/resume/upload - Upload resume
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'A PDF resume file is required',
        data: null
      });
    }

    const filename = `${Date.now()}_${req.file.originalname}`;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;
    const parsedResume = await parseResumeFile(req.file, originalName);
    const parsedData = mergeParsedData(parsedResume.parsedData, {
      ...req.body,
      skills: toArray(req.body.skills)
    });
    const hasStructuredData = parsedData.skills.length > 0
      || parsedData.email
      || parsedData.phone
      || parsedData.summary
      || (parsedData.projects || []).length > 0;

    const resume = await Resume.create({
      userId: req.user.userId,
      filename,
      originalName,
      fileSize,
      mimeType,
      rawText: parsedResume.rawText,
      status: hasStructuredData ? 'parsed' : 'uploaded',
      parserNotes: parsedResume.parserNotes,
      parsedData
    });

    return res.status(201).json({
      success: true,
      message: hasStructuredData
        ? 'Resume uploaded and parsed successfully'
        : 'Resume uploaded successfully',
      data: resume
    });
  } catch (err) {
    console.error('Upload resume error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to upload resume',
      data: null
    });
  }
});

// PUT /api/resume/:id - Update resume
router.put('/:id', auth, async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resume ID',
        data: null
      });
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
        data: null
      });
    }

    const nextOriginalName = typeof req.body.originalName === 'string' && req.body.originalName.trim()
      ? req.body.originalName.trim()
      : resume.originalName;

    const nextParsedData = mergeParsedData(
      resume.parsedData || {},
      req.body.parsedData || req.body
    );

    resume.originalName = nextOriginalName;
    resume.parsedData = nextParsedData;
    if (
      nextParsedData.skills.length > 0
      || nextParsedData.email
      || nextParsedData.phone
      || nextParsedData.summary
      || (nextParsedData.projects || []).length > 0
    ) {
      resume.status = resume.latestScreening?.isShortlisted ? 'shortlisted' : 'parsed';
    }
    await resume.save();

    return res.json({
      success: true,
      message: 'Resume updated successfully',
      data: resume
    });
  } catch (err) {
    console.error('Update resume error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update resume',
      data: null
    });
  }
});

router.post('/:id/screen', auth, async (req, res) => {
  try {
    const {
      jobTitle,
      company,
      jobDescriptionText,
      description,
      jobDescription,
      jdText,
      jd,
      roleDetails,
      requirementsNotes
    } = req.body;

    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resume ID',
        data: null
      });
    }

    if (!(jobDescriptionText || description || jobDescription || jdText || jd || jobTitle || roleDetails || requirementsNotes)) {
      return res.status(400).json({
        success: false,
        message: 'Provide a job title, job description, or role details for screening',
        data: null
      });
    }

    // Get resume
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
        data: null
      });
    }

    const resolvedJobDescription = await buildAdHocJobDescription({
      ...req.body,
      jobTitle,
      company,
      jobDescriptionText: jobDescriptionText || description || jobDescription || jdText || jd,
      roleDetails,
      requirementsNotes
    });

    if (!resolvedJobDescription) {
      return res.status(400).json({
        success: false,
        message: 'A valid role profile could not be created for screening',
        data: null
      });
    }

    const aiQualityAssessmentResult = await evaluateResumeQualityWithModel(resume, resolvedJobDescription);
    const aiQualityAssessment = aiQualityAssessmentResult.success ? aiQualityAssessmentResult.data : null;

    const screeningResult = screenResumeAgainstJobDescription(resume, resolvedJobDescription, {
      aiAssessment: aiQualityAssessment
    });
    const narrativeResult = await generateScreeningNarrative(resume, resolvedJobDescription, screeningResult);
    const analysis = narrativeResult.success ? narrativeResult.analysis : '';

    if (analysis) {
      screeningResult.analysis = analysis;
    } else if (aiQualityAssessment?.summary) {
      screeningResult.analysis = aiQualityAssessment.summary;
    }

    if (!narrativeResult.success && narrativeResult.error) {
      screeningResult.analysisFallback = 'Structured screening completed without LLM summary.';
      screeningResult.analysisError = narrativeResult.error;
    }

    resume.status = screeningResult.isShortlisted ? 'shortlisted' : 'screened';
    resume.lastScreenedAt = new Date();
    resume.latestScreening = {
      jobDescriptionId: screeningResult.jobDescriptionId,
      jobTitle: screeningResult.jobTitle,
      overallScore: screeningResult.overallScore,
      shortlistThreshold: screeningResult.shortlistThreshold,
      isShortlisted: screeningResult.isShortlisted,
      matchedRequiredSkills: screeningResult.matchedRequiredSkills,
      missingRequiredSkills: screeningResult.missingRequiredSkills,
      matchedPreferredSkills: screeningResult.matchedPreferredSkills,
      missingPreferredSkills: screeningResult.missingPreferredSkills,
      scoreBreakdown: screeningResult.scoreBreakdown,
      qualitySignals: screeningResult.qualitySignals,
      riskSignals: screeningResult.riskSignals,
      strengths: screeningResult.strengths,
      concerns: screeningResult.concerns,
      resumePositives: screeningResult.resumePositives,
      resumeNegatives: screeningResult.resumeNegatives,
      recommendation: screeningResult.recommendation,
      analysis: screeningResult.analysis || analysis || '',
      screenedAt: new Date()
    };
    resume.screeningHistory = [
      {
        jobDescriptionId: screeningResult.jobDescriptionId,
        jobTitle: screeningResult.jobTitle,
        overallScore: screeningResult.overallScore,
        isShortlisted: screeningResult.isShortlisted,
        screenedAt: new Date()
      },
      ...(resume.screeningHistory || [])
    ].slice(0, 10);
    await resume.save();

    return res.json({
      success: true,
      message: screeningResult.isShortlisted
        ? 'Resume screened and marked for shortlist review'
        : 'Resume screened successfully',
      data: screeningResult
    });
  } catch (err) {
    console.error('Screen resume error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to screen resume',
      data: null
    });
  }
});

// DELETE /api/resume/:id - Delete resume
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resume ID',
        data: null
      });
    }

    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
        data: null
      });
    }

    return res.json({
      success: true,
      message: 'Resume deleted successfully',
      data: resume
    });
  } catch (err) {
    console.error('Delete resume error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete resume',
      data: null
    });
  }
});

module.exports = router;
