const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  rawText: {
    type: String,
    default: ''
  },
  parsedData: {
    name: String,
    email: String,
    phone: String,
    summary: String,
    skills: [String],
    projects: [{
      title: String,
      description: String,
      technologies: [String]
    }],
    yearsOfExperience: {
      type: Number,
      default: 0
    },
    experience: [{
      title: String,
      company: String,
      duration: String,
      description: String
    }],
    education: [{
      degree: String,
      institution: String,
      year: String,
      rawText: String
    }]
  },
  status: {
    type: String,
    enum: ['uploaded', 'parsed', 'screened', 'shortlisted'],
    default: 'uploaded'
  },
  lastScreenedAt: Date,
  parserNotes: [String],
  latestScreening: {
    jobDescriptionId: String,
    jobTitle: String,
    evaluationProvider: String,
    overallScore: Number,
    shortlistThreshold: Number,
    isShortlisted: Boolean,
    matchedRequiredSkills: [String],
    missingRequiredSkills: [String],
    matchedPreferredSkills: [String],
    missingPreferredSkills: [String],
    scoreBreakdown: {
      requiredSkillScore: Number,
      preferredSkillScore: Number,
      keywordScore: Number,
      experienceScore: Number,
      educationScore: Number,
      roleAlignmentScore: Number,
      projectRelevanceScore: Number,
      resumeQualityScore: Number,
      atsReadinessScore: Number
    },
    qualitySignals: [String],
    riskSignals: [String],
    strengths: [String],
    concerns: [String],
    resumePositives: [String],
    resumeNegatives: [String],
    mlEvaluation: {
      success: Boolean,
      modelId: String,
      algorithm: String,
      taskType: String,
      prediction: String,
      probabilities: {
        type: Map,
        of: Number
      },
      confidence: Number,
      rawFitProbability: Number,
      calibratedFitProbability: Number,
      decisionThreshold: Number,
      usedForPrimaryScoring: Boolean,
      inputQuality: {
        resumeWordCount: Number,
        jobWordCount: Number,
        requiredSkillCount: Number,
        useAsPrimarySignal: Boolean,
        warnings: [String]
      },
      fitScore: Number,
      error: String
    },
    recommendation: String,
    analysis: String,
    screenedAt: Date
  },
  screeningHistory: [{
    jobDescriptionId: String,
    jobTitle: String,
    evaluationProvider: String,
    overallScore: Number,
    isShortlisted: Boolean,
    mlModelId: String,
    screenedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, status: 1 });
resumeSchema.index({ 'latestScreening.overallScore': -1 });

module.exports = mongoose.model('Resume', resumeSchema);
