const axios = require('axios');

function sanitizeText(value = '') {
  return `${value || ''}`.trim();
}

function extractJsonObject(text = '') {
  const trimmed = sanitizeText(text);
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeText(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/,|\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildFallbackJobDescription(input = {}) {
  const title = sanitizeText(input.jobTitle) || 'General role';
  const company = sanitizeText(input.company);
  const directDescription = sanitizeText(input.description);
  const roleDetails = sanitizeText(input.roleDetails);
  const requirementsNotes = sanitizeText(input.requirementsNotes);

  if (directDescription) {
    return directDescription;
  }

  const pieces = [
    `Role: ${title}${company ? ` at ${company}` : ''}.`,
    roleDetails && `Role details: ${roleDetails}`,
    requirementsNotes && `Requirements and expectations: ${requirementsNotes}`,
    'Evaluate the candidate based on role alignment, relevant skills, project quality, experience, resume quality, and ATS readiness.'
  ].filter(Boolean);

  return pieces.join(' ');
}

function getProviderConfig() {
  const provider = (process.env.MODEL_PROVIDER || 'groq').toLowerCase();

  if (provider === 'groq') {
    return {
      provider,
      url: process.env.MODEL_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions',
      model: process.env.MODEL_NAME || 'llama-3.3-70b-versatile',
      apiKey: process.env.MODEL_API_KEY || process.env.GROQ_API_KEY
    };
  }

  return {
    provider,
    url: process.env.MODEL_BASE_URL || '',
    model: process.env.MODEL_NAME || '',
    apiKey: process.env.MODEL_API_KEY || ''
  };
}

async function callTextModel({ systemPrompt, userPrompt, temperature = 0.2, maxTokens = 900, retries = 2 }) {
  const config = getProviderConfig();

  if (!config.url || !config.model || !config.apiKey) {
    return {
      success: false,
      error: 'Model provider is not configured'
    };
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        config.url,
        {
          model: config.model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return { success: false, error: 'Empty response received' };
      }

      return { success: true, text: content };
    } catch (error) {
      lastError = error;
      if (attempt < retries && error.response?.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  return {
    success: false,
    error: lastError?.response?.data?.error?.message || lastError?.message || 'Request failed'
  };
}

async function generateScreeningNarrative(resume, jobDescription, screeningResult) {
  const parsedData = resume.parsedData || {};

  const systemPrompt = 'You are a professional talent evaluation assistant. Return concise plain text only. Do not use markdown, bullet symbols, or headings.';

  const userPrompt = `
Position: ${jobDescription.title} at ${jobDescription.company || 'the company'}
Required skills: ${(jobDescription.requiredSkills || []).join(', ') || 'Not specified'}
Preferred skills: ${(jobDescription.preferredSkills || []).join(', ') || 'Not specified'}
Minimum experience required: ${jobDescription.minimumExperience || 0} years

Candidate: ${parsedData.name || resume.originalName}
Professional summary: ${parsedData.summary || 'Not extracted'}
Candidate skills: ${(parsedData.skills || []).join(', ') || 'Not extracted'}
Projects: ${(parsedData.projects || []).map(project => project.title).join(', ') || 'Not extracted'}
Estimated experience: ${parsedData.yearsOfExperience || 0} years
Matched required skills: ${(screeningResult.matchedRequiredSkills || []).join(', ') || 'None'}
Missing required skills: ${(screeningResult.missingRequiredSkills || []).join(', ') || 'None'}
Overall match score: ${screeningResult.overallScore}/100
Role alignment score: ${screeningResult.scoreBreakdown?.roleAlignmentScore || 0}/100
Project relevance score: ${screeningResult.scoreBreakdown?.projectRelevanceScore || 0}/100
Resume quality score: ${screeningResult.scoreBreakdown?.resumeQualityScore || 0}/100
ATS readiness score: ${screeningResult.scoreBreakdown?.atsReadinessScore || 0}/100
Quality signals: ${(screeningResult.qualitySignals || []).join('; ') || 'None'}
Risk signals: ${(screeningResult.riskSignals || []).join('; ') || 'None'}

Write a concise evaluation in 4 to 6 sentences covering the candidate's strengths, gaps, overall suitability, and how well the resume is structured for screening.
`.trim();

  const result = await callTextModel({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    maxTokens: 350
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error
    };
  }

  return {
    success: true,
    analysis: result.text
  };
}

async function evaluateResumeQualityWithModel(resume, jobDescription) {
  const parsedData = resume.parsedData || {};

  const systemPrompt = `
You are an expert resume reviewer and hiring evaluator.
Assess the resume fairly, especially for freshers and entry-level candidates.
Do not punish a candidate only because they have limited formal work experience if they show strong projects, fundamentals, clarity, and role alignment.
Return strict JSON only.
`.trim();

  const userPrompt = `
Evaluate this resume for the target role and return valid JSON with this exact shape:
{
  "resumeQualityScore": 0,
  "atsReadinessScore": 0,
  "roleFitScore": 0,
  "fresherPotentialScore": 0,
  "strengths": ["string"],
  "risks": ["string"],
  "summary": "string"
}

Target role: ${jobDescription.title}
Company: ${jobDescription.company || 'Not specified'}
Job description: ${jobDescription.description || 'Not specified'}
Required skills: ${(jobDescription.requiredSkills || []).join(', ') || 'Not specified'}
Preferred skills: ${(jobDescription.preferredSkills || []).join(', ') || 'Not specified'}
Minimum experience: ${jobDescription.minimumExperience || 0}

Candidate name: ${parsedData.name || resume.originalName}
Summary: ${parsedData.summary || 'Not extracted'}
Skills: ${(parsedData.skills || []).join(', ') || 'Not extracted'}
Projects: ${(parsedData.projects || []).map(project => `${project.title}: ${project.description || ''}`).join(' | ') || 'Not extracted'}
Experience entries: ${(parsedData.experience || []).map(item => `${item.title || ''} ${item.company || ''} ${item.description || ''}`).join(' | ') || 'Not extracted'}
Education: ${(parsedData.education || []).map(item => item.rawText || item.degree || '').join(' | ') || 'Not extracted'}
Estimated years of experience: ${parsedData.yearsOfExperience || 0}
Raw extracted resume text: ${(resume.rawText || '').slice(0, 6000) || 'Not extracted'}

Scoring guidance:
- resumeQualityScore should reflect clarity, completeness, structure, summary, projects, and impact.
- atsReadinessScore should reflect machine readability, skill visibility, structure, and keyword usage.
- roleFitScore should reflect suitability for the provided role.
- fresherPotentialScore should reflect whether the resume looks promising for a fresher or junior role through projects, fundamentals, and presentation.
- strengths and risks should be concise.
- summary should be 2 to 4 sentences.
`.trim();

  const result = await callTextModel({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    maxTokens: 700
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error
    };
  }

  const parsed = extractJsonObject(result.text);
  if (!parsed) {
    return {
      success: false,
      error: 'Model response could not be parsed as JSON'
    };
  }

  return {
    success: true,
    data: {
      resumeQualityScore: Number(parsed.resumeQualityScore || 0),
      atsReadinessScore: Number(parsed.atsReadinessScore || 0),
      roleFitScore: Number(parsed.roleFitScore || 0),
      fresherPotentialScore: Number(parsed.fresherPotentialScore || 0),
      strengths: toStringArray(parsed.strengths),
      risks: toStringArray(parsed.risks),
      summary: sanitizeText(parsed.summary)
    }
  };
}

async function extractResumeDataWithModel({ rawText = '', originalName = '' } = {}) {
  const normalizedText = sanitizeText(rawText);

  if (normalizedText.length < 250) {
    return {
      success: false,
      error: 'Resume text is too limited for model-assisted extraction'
    };
  }

  const systemPrompt = `
You are an expert resume parser.
Extract only information that is clearly present in the resume text.
Do not invent missing fields.
Return strict JSON only.
`.trim();

  const userPrompt = `
Extract structured resume data from the text below.

File name: ${originalName || 'Unknown'}

Return valid JSON with this exact shape:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "summary": "string",
  "skills": ["string"],
  "projects": [
    {
      "title": "string",
      "description": "string",
      "technologies": ["string"]
    }
  ],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "description": "string"
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string",
      "rawText": "string"
    }
  ],
  "yearsOfExperience": 0
}

Rules:
- Keep skills concise and deduplicated.
- If a section is missing, return an empty string, empty array, or 0.
- Do not guess years of experience if the text is unclear.
- Keep summary to a short professional overview only if clearly inferable from the resume text.

Resume text:
${normalizedText.slice(0, 12000)}
`.trim();

  const result = await callTextModel({
    systemPrompt,
    userPrompt,
    temperature: 0.1,
    maxTokens: 1200
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error
    };
  }

  const parsed = extractJsonObject(result.text);
  if (!parsed) {
    return {
      success: false,
      error: 'Model response could not be parsed as JSON'
    };
  }

  const normalizeProject = (project = {}) => ({
    title: sanitizeText(project.title),
    description: sanitizeText(project.description),
    technologies: toStringArray(project.technologies)
  });

  const normalizeExperience = (item = {}) => ({
    title: sanitizeText(item.title),
    company: sanitizeText(item.company),
    duration: sanitizeText(item.duration),
    description: sanitizeText(item.description)
  });

  const normalizeEducation = (item = {}) => ({
    degree: sanitizeText(item.degree),
    institution: sanitizeText(item.institution),
    year: sanitizeText(item.year),
    rawText: sanitizeText(item.rawText) || [item.degree, item.institution, item.year].filter(Boolean).join(', ')
  });

  return {
    success: true,
    data: {
      name: sanitizeText(parsed.name),
      email: sanitizeText(parsed.email),
      phone: sanitizeText(parsed.phone),
      summary: sanitizeText(parsed.summary),
      skills: toStringArray(parsed.skills),
      projects: Array.isArray(parsed.projects) ? parsed.projects.map(normalizeProject).filter(project => project.title || project.description) : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience.map(normalizeExperience).filter(item => item.title || item.company || item.description) : [],
      education: Array.isArray(parsed.education) ? parsed.education.map(normalizeEducation).filter(item => item.rawText || item.degree || item.institution) : [],
      yearsOfExperience: Number(parsed.yearsOfExperience || 0)
    }
  };
}

async function enrichJobDescriptionInput(input = {}) {
  const jobTitle = sanitizeText(input.jobTitle);
  const company = sanitizeText(input.company);
  const description = sanitizeText(input.description);
  const roleDetails = sanitizeText(input.roleDetails);
  const requirementsNotes = sanitizeText(input.requirementsNotes);
  const fallbackDescription = buildFallbackJobDescription({
    jobTitle,
    company,
    description,
    roleDetails,
    requirementsNotes
  });

  if (!jobTitle && !description && !roleDetails && !requirementsNotes) {
    return {
      success: false,
      error: 'Not enough role information was provided',
      data: null
    };
  }

  const prompt = `
Create a structured hiring profile from the role information below.

Job title: ${jobTitle || 'Not provided'}
Company: ${company || 'Not provided'}
Detailed job description: ${description || 'Not provided'}
Additional role details: ${roleDetails || 'Not provided'}
Extra requirement notes: ${requirementsNotes || 'Not provided'}

Return valid JSON only with this exact shape:
{
  "title": "string",
  "company": "string",
  "description": "string",
  "requiredSkills": ["string"],
  "preferredSkills": ["string"],
  "keywords": ["string"],
  "requirements": ["string"],
  "educationRequirements": ["string"],
  "minimumExperience": 0,
  "autoShortlistThreshold": 70
}

Rules:
- If the detailed description is short or missing, expand it into a realistic role description using the provided role title and notes.
- Keep requiredSkills focused and concise.
- Keep preferredSkills optional and realistic.
- minimumExperience must be a number.
- autoShortlistThreshold should be between 60 and 80.
`.trim();

  const result = await callTextModel({
    systemPrompt: 'You convert sparse hiring inputs into a structured job profile. Return strict JSON only.',
    userPrompt: prompt,
    temperature: 0.2,
    maxTokens: 700
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      data: {
        title: jobTitle || 'Custom Job Description',
        company,
        description: fallbackDescription,
        requiredSkills: [],
        preferredSkills: [],
        keywords: [],
        requirements: [],
        educationRequirements: [],
        minimumExperience: 0,
        autoShortlistThreshold: 70
      }
    };
  }

  const parsed = extractJsonObject(result.text);
  if (!parsed) {
    return {
      success: false,
      error: 'Model response could not be parsed as JSON',
      data: {
        title: jobTitle || 'Custom Job Description',
        company,
        description: fallbackDescription,
        requiredSkills: [],
        preferredSkills: [],
        keywords: [],
        requirements: [],
        educationRequirements: [],
        minimumExperience: 0,
        autoShortlistThreshold: 70
      }
    };
  }

  return {
    success: true,
    data: {
      title: sanitizeText(parsed.title) || jobTitle || 'Custom Job Description',
      company: sanitizeText(parsed.company) || company,
      description: sanitizeText(parsed.description) || fallbackDescription,
      requiredSkills: toStringArray(parsed.requiredSkills),
      preferredSkills: toStringArray(parsed.preferredSkills),
      keywords: toStringArray(parsed.keywords),
      requirements: toStringArray(parsed.requirements),
      educationRequirements: toStringArray(parsed.educationRequirements),
      minimumExperience: Number(parsed.minimumExperience || 0),
      autoShortlistThreshold: Number(parsed.autoShortlistThreshold || 70)
    }
  };
}

module.exports = {
  callTextModel,
  generateScreeningNarrative,
  enrichJobDescriptionInput,
  evaluateResumeQualityWithModel,
  extractResumeDataWithModel
};
