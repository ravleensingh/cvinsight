const { extractSkills, normalizeWhitespace } = require('./resumeParsingService');

const ROLE_PRESETS = {
  'full stack developer': {
    description: 'Builds end-to-end web applications across frontend, backend, APIs, databases, authentication, deployment, and maintainable product architecture.',
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'REST API', 'HTML', 'CSS'],
    preferredSkills: ['Next.js', 'TypeScript', 'JWT', 'OAuth', 'Tailwind CSS', 'SQL', 'Docker'],
    keywords: ['frontend', 'backend', 'api', 'database', 'authentication', 'deployment', 'full stack']
  },
  'frontend developer': {
    description: 'Builds responsive user interfaces, reusable components, frontend integrations, and polished user experiences.',
    requiredSkills: ['JavaScript', 'React', 'HTML', 'CSS', 'Responsive Design'],
    preferredSkills: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Accessibility', 'REST API'],
    keywords: ['ui', 'frontend', 'components', 'responsive', 'user experience', 'client-side']
  },
  'backend developer': {
    description: 'Builds APIs, authentication flows, database integrations, validation, and secure backend services.',
    requiredSkills: ['Node.js', 'Express', 'MongoDB', 'REST API', 'JWT', 'Validation'],
    preferredSkills: ['SQL', 'Docker', 'Redis', 'Authentication', 'Rate Limiting'],
    keywords: ['backend', 'api', 'database', 'server', 'authentication', 'security']
  },
  'ai engineer': {
    description: 'Builds applied AI systems using LLMs, ML pipelines, retrieval, evaluation, and production integrations.',
    requiredSkills: ['Python', 'Machine Learning', 'LLM', 'GenAI', 'Prompt Engineering'],
    preferredSkills: ['LangChain', 'LangGraph', 'RAG', 'PyTorch', 'TensorFlow'],
    keywords: ['ai', 'llm', 'machine learning', 'rag', 'inference', 'prompting']
  },
  'data analyst': {
    description: 'Analyzes data, builds dashboards, performs SQL-based exploration, and communicates business insights through reporting and analytics.',
    requiredSkills: ['SQL', 'Python', 'Pandas', 'Excel', 'Data Analysis'],
    preferredSkills: ['Power BI', 'Tableau', 'Looker', 'NumPy', 'Statistics'],
    keywords: ['dashboard', 'analytics', 'insights', 'reporting', 'visualization', 'eda']
  },
  'data scientist': {
    description: 'Builds data science workflows with analysis, experimentation, modeling, feature engineering, and predictive insights.',
    requiredSkills: ['Python', 'Machine Learning', 'Pandas', 'NumPy', 'Statistics'],
    preferredSkills: ['Scikit-learn', 'TensorFlow', 'PyTorch', 'SQL', 'Data Visualization'],
    keywords: ['modeling', 'prediction', 'feature engineering', 'experiments', 'data science']
  },
  'machine learning engineer': {
    description: 'Builds, trains, evaluates, and deploys machine learning systems and supporting data pipelines.',
    requiredSkills: ['Python', 'Machine Learning', 'Scikit-learn', 'Model Deployment'],
    preferredSkills: ['PyTorch', 'TensorFlow', 'Docker', 'MLOps', 'Data Pipelines'],
    keywords: ['training', 'deployment', 'inference', 'mlops', 'features', 'evaluation']
  },
  'ui ux designer': {
    description: 'Designs intuitive user journeys, visual systems, prototypes, and product interfaces with strong usability focus.',
    requiredSkills: ['UI Design', 'UX Design', 'Wireframing', 'Prototyping', 'User Research'],
    preferredSkills: ['Accessibility', 'Design Systems', 'Figma'],
    keywords: ['usability', 'interface', 'design system', 'prototype', 'research']
  },
  'devops engineer': {
    description: 'Builds and maintains deployment pipelines, automation, cloud infrastructure, and operational reliability.',
    requiredSkills: ['Docker', 'CI/CD', 'Linux', 'Cloud', 'Automation'],
    preferredSkills: ['Kubernetes', 'Terraform', 'AWS', 'Azure', 'Monitoring'],
    keywords: ['deployment', 'infrastructure', 'automation', 'pipeline', 'scalability']
  }
};

function toArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => `${item}`.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/,|\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

function mergeUniqueValues(...groups) {
  const map = new Map();

  groups.flat().forEach(value => {
    const trimmed = `${value || ''}`.trim();
    if (!trimmed) return;
    const normalized = normalizeToken(trimmed);
    if (!normalized) return;
    if (!map.has(normalized)) {
      map.set(normalized, trimmed);
    }
  });

  return [...map.values()];
}

function normalizeToken(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function dedupeNormalized(values = []) {
  const map = new Map();

  for (const value of values) {
    const trimmed = `${value}`.trim();
    if (!trimmed) continue;
    const normalized = normalizeToken(trimmed);
    if (!normalized) continue;
    if (!map.has(normalized)) {
      map.set(normalized, trimmed);
    }
  }

  return map;
}

function calculateRatio(matchedCount, totalCount) {
  if (!totalCount) return 100;
  return Math.round((matchedCount / totalCount) * 100);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function averageScores(...values) {
  const valid = values.filter(value => typeof value === 'number' && !Number.isNaN(value) && value >= 0);
  if (!valid.length) return 0;
  return clampScore(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function tokenizeText(text = '') {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
    'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'will',
    'with', 'using', 'used', 'use', 'into', 'over', 'under', 'across', 'about',
    'your', 'their', 'them', 'this', 'these', 'those', 'our', 'you', 'we', 'they',
    'role', 'candidate', 'experience', 'work', 'team', 'skills', 'skill', 'years',
    'year', 'responsible', 'requirements', 'qualification', 'preferred', 'must',
    'strong', 'good', 'ability', 'knowledge'
  ]);

  return normalizeToken(text)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 2 && !stopWords.has(token));
}

function calculateTokenCoverage(sourceText = '', targetText = '') {
  const sourceTokens = [...new Set(tokenizeText(sourceText))];
  if (!sourceTokens.length) {
    return 0;
  }

  const targetTokenSet = new Set(tokenizeText(targetText));
  const matchedCount = sourceTokens.filter(token => targetTokenSet.has(token)).length;

  return calculateRatio(matchedCount, sourceTokens.length);
}

function inferMinimumExperience(text = '') {
  const match = text.match(/(\d+)(?:\s*-\s*\d+)?\+?\s+years?/i);
  return match ? Number(match[1]) : 0;
}

function inferJobRequirementsFromDescription(description = '', base = {}) {
  const text = normalizeWhitespace(description);
  if (!text) {
    return {
      requiredSkills: mergeUniqueValues(base.requiredSkills),
      preferredSkills: mergeUniqueValues(base.preferredSkills),
      keywords: mergeUniqueValues(base.keywords),
      requirements: mergeUniqueValues(base.requirements),
      educationRequirements: mergeUniqueValues(base.educationRequirements),
      minimumExperience: Number(base.minimumExperience || 0)
    };
  }

  const fragments = text
    .replace(/\.\s+/g, '.\n')
    .split(/\n|;+/)
    .map(line => line.trim())
    .filter(Boolean);

  const requiredSkills = [];
  const preferredSkills = [];
  const keywordCandidates = [];
  const requirements = [];
  const educationRequirements = [];

  for (const fragment of fragments) {
    const detectedSkills = extractSkills(fragment);
    const normalizedLine = fragment.toLowerCase();
    const isPreferredLine = /(preferred|plus|nice to have|good to have|bonus)/i.test(normalizedLine);
    const isEducationLine = /(bachelor|master|degree|university|college|b\.tech|m\.tech|mba|phd)/i.test(normalizedLine);
    const isRequirementLine = /(requirement|responsibilit|qualification|must have|require\b|required|experience with|proficient in|knowledge of)/i.test(normalizedLine);

    if (isPreferredLine) {
      preferredSkills.push(...detectedSkills);
    } else if (isRequirementLine || detectedSkills.length > 0) {
      requiredSkills.push(...detectedSkills);
    }

    if (isEducationLine) {
      educationRequirements.push(fragment);
    }

    if (isRequirementLine || isPreferredLine || isEducationLine) {
      requirements.push(fragment);
    }

    keywordCandidates.push(...detectedSkills);
  }

  const mergedRequiredSkills = mergeUniqueValues(base.requiredSkills, requiredSkills);
  const mergedPreferredSkills = mergeUniqueValues(
    base.preferredSkills,
    preferredSkills.filter(skill => !mergedRequiredSkills.some(required => normalizeToken(required) === normalizeToken(skill)))
  );
  const mergedKeywords = mergeUniqueValues(
    base.keywords,
    keywordCandidates,
    extractSkills(text)
  );

  return {
    requiredSkills: mergedRequiredSkills,
    preferredSkills: mergedPreferredSkills,
    keywords: mergedKeywords,
    requirements: mergeUniqueValues(base.requirements, requirements),
    educationRequirements: mergeUniqueValues(base.educationRequirements, educationRequirements),
    minimumExperience: Number(base.minimumExperience || inferMinimumExperience(text) || 0)
  };
}

function normalizeJobDescription(jd = {}) {
  const requiredSkills = toArray(jd.requiredSkills && jd.requiredSkills.length ? jd.requiredSkills : jd.skills);
  const preferredSkills = toArray(jd.preferredSkills);
  const requirements = toArray(jd.requirements);
  const educationRequirements = toArray(jd.educationRequirements);
  const keywordSource = toArray(jd.keywords);
  const descriptionKeywords = extractSkills(`${jd.description || ''}\n${requirements.join('\n')}`);
  const keywords = [...new Set([...keywordSource, ...descriptionKeywords])];

  return {
    id: jd._id?.toString?.() || jd.id || '',
    title: jd.title || 'Job Description',
    company: jd.company || '',
    description: jd.description || '',
    requiredSkills,
    preferredSkills,
    requirements,
    educationRequirements,
    keywords,
    minimumExperience: Number(jd.minimumExperience || 0),
    autoShortlistThreshold: Number(jd.autoShortlistThreshold || jd.screeningConfig?.autoShortlistThreshold || 70)
  };
}

function getRolePreset(jobTitle = '') {
  const normalizedTitle = normalizeToken(jobTitle);
  if (!normalizedTitle) return null;

  const directMatch = ROLE_PRESETS[normalizedTitle];
  if (directMatch) return directMatch;

  return Object.entries(ROLE_PRESETS).find(([key]) => normalizedTitle.includes(key) || key.includes(normalizedTitle))?.[1] || null;
}

function applyRolePreset(jobDescription = {}) {
  const preset = getRolePreset(jobDescription.title);
  if (!preset) {
    return normalizeJobDescription(jobDescription);
  }

  const currentDescription = `${jobDescription.description || ''}`.trim();
  const shouldUsePresetDescription = !currentDescription || currentDescription.length < 80;

  return normalizeJobDescription({
    ...jobDescription,
    description: shouldUsePresetDescription
      ? [currentDescription, preset.description].filter(Boolean).join(' ')
      : currentDescription,
    requiredSkills: mergeUniqueValues(preset.requiredSkills, jobDescription.requiredSkills || jobDescription.skills || []),
    preferredSkills: mergeUniqueValues(preset.preferredSkills, jobDescription.preferredSkills || []),
    keywords: mergeUniqueValues(preset.keywords, jobDescription.keywords || [])
  });
}

function isFresherFriendlyRole(jobDescription = {}) {
  const roleText = [
    jobDescription.title || '',
    jobDescription.description || '',
    ...(jobDescription.requirements || [])
  ].join('\n');

  const normalized = normalizeToken(roleText);
  return (
    Number(jobDescription.minimumExperience || 0) <= 1 ||
    /\b(fresher|entry level|entry-level|junior|graduate|trainee|intern|apprentice|campus)\b/i.test(normalized)
  );
}

function scoreExperienceFit(yearsOfExperience = 0, jobDescription = {}, parsedData = {}, aiAssessment = null) {
  const minimumExperience = Number(jobDescription.minimumExperience || 0);
  const fresherFriendly = isFresherFriendlyRole(jobDescription);
  const hasProjects = (parsedData.projects || []).length > 0;
  const hasEducation = (parsedData.education || []).length > 0;
  const hasSummary = (parsedData.summary || '').length >= 60;
  const aiFresherPotential = aiAssessment?.fresherPotentialScore;

  if (!minimumExperience) {
    if (yearsOfExperience > 0) {
      return 100;
    }

    if (fresherFriendly) {
      return clampScore(Math.max(80, aiFresherPotential || 0, hasProjects ? 78 : 70, hasEducation ? 72 : 0));
    }

    return clampScore(Math.max(70, aiFresherPotential || 0, hasProjects ? 72 : 0, hasSummary ? 68 : 0));
  }

  const baseScore = Math.min(100, Math.round((yearsOfExperience / minimumExperience) * 100));
  if (yearsOfExperience >= minimumExperience) {
    return baseScore;
  }

  if (fresherFriendly) {
    return clampScore(Math.max(
      baseScore,
      aiFresherPotential || 0,
      hasProjects ? 70 : 0,
      hasEducation ? 62 : 0
    ));
  }

  return clampScore(Math.max(baseScore, aiFresherPotential ? Math.round(aiFresherPotential * 0.7) : 0));
}

function evaluateTextRequirementMatches(requirements = [], haystack = '') {
  const haystackNormalized = normalizeToken(haystack);
  const matched = [];
  const missing = [];

  for (const requirement of requirements) {
    const normalizedRequirement = normalizeToken(requirement);
    if (!normalizedRequirement) continue;

    if (haystackNormalized.includes(normalizedRequirement)) {
      matched.push(requirement);
    } else {
      missing.push(requirement);
    }
  }

  return { matched, missing };
}

function scoreResumeQuality(parsedData = {}, resumeText = '') {
  let score = 35;
  const risks = [];
  const projectCount = (parsedData.projects || []).length;
  const hasEducation = (parsedData.education || []).length >= 1;

  if ((parsedData.summary || '').length >= 80) {
    score += 15;
  } else {
    risks.push('Professional summary is missing or too brief.');
  }

  if ((parsedData.experience || []).length >= 1) {
    score += 15;
  } else if (projectCount >= 2 && hasEducation) {
    score += 10;
  } else {
    risks.push('Limited formal work experience detected.');
  }

  if (projectCount >= 1) {
    score += 15;
  } else {
    risks.push('Projects section is missing (important for roles requiring practical evidence).');
  }

  if (hasEducation) {
    score += 10;
  } else {
    risks.push('Education details are not clearly captured.');
  }

  if ((parsedData.skills || []).length >= 5) {
    score += 10;
  } else {
    risks.push('Technical skills list is very narrow.');
  }

  if (resumeText.length >= 1200) {
    score += 10;
  } else if (resumeText.length < 500) {
    score -= 10;
    risks.push('Resume content is too short for strong evaluation.');
  }

  return {
    score: clampScore(score),
    signals: [],
    risks
  };
}

function scoreAtsReadiness(resume, parsedData = {}, resumeText = '') {
  let score = 40;
  const risks = [...(resume.parserNotes || [])];
  const projectCount = (parsedData.projects || []).length;

  if ((parsedData.summary || '').length >= 80) {
    score += 10;
  }

  if ((parsedData.skills || []).length >= 5) {
    score += 15;
  } else {
    risks.push('Skills section may be too small for effective ATS matching.');
  }

  if ((parsedData.experience || []).length >= 1) {
    score += 15;
  } else if (projectCount >= 2) {
    score += 10;
  }

  if ((parsedData.education || []).length >= 1) {
    score += 10;
  }

  if ((resumeText.match(/\b(achieved|improved|increased|reduced|delivered|built|designed|launched|optimized|spearheaded|managed)\b/gi) || []).length >= 2) {
    score += 10;
  } else {
    risks.push('Consider adding more action-oriented impact language (e.g., achieved, optimized, improved).');
  }

  if ((resume.rawText || '').length < 600) {
    score -= 15;
    risks.push('Extracted text is limited, which can weaken screening reliability.');
  }

  return {
    score: clampScore(score),
    signals: [],
    risks: [...new Set(risks.filter(Boolean))]
  };
}

function scoreProjectRelevance(projects = [], jobDescription = {}) {
  if (!projects.length) {
    return {
      score: 30,
      matchedProjects: [],
      risks: ['No clear project details were detected. Projects demonstrating role-specific skills are highly recommended.']
    };
  }

  const jdText = [
    jobDescription.title,
    jobDescription.description,
    ...(jobDescription.requiredSkills || []),
    ...(jobDescription.preferredSkills || []),
    ...(jobDescription.keywords || [])
  ].join('\n');
  const jdSkills = dedupeNormalized([
    ...(jobDescription.requiredSkills || []),
    ...(jobDescription.preferredSkills || []),
    ...(jobDescription.keywords || []),
    ...extractSkills(jdText)
  ]);
  const normalizedRoleTokens = tokenizeText(jobDescription.title);

  const projectScores = projects.map(project => {
    const projectText = [
      project.title || '',
      project.description || '',
      ...(project.technologies || [])
    ].join('\n');
    const projectSkills = dedupeNormalized([
      ...(project.technologies || []),
      ...extractSkills(projectText)
    ]);

    const matchedSkillCount = [...jdSkills.keys()].filter(skill => projectSkills.has(skill)).length;
    // Base skill score on the project's own skills (capped to max 4 to not heavily penalize small projects)
    const skillMatchScore = projectSkills.size > 0 
      ? calculateRatio(matchedSkillCount, Math.min(4, projectSkills.size))
      : 0;
      
    const projectCoverageScore = calculateTokenCoverage(projectText, jdText);
    const roleTitleMatchScore = normalizedRoleTokens.length
      ? calculateRatio(
        normalizedRoleTokens.filter(token => normalizeToken(projectText).includes(token)).length,
        normalizedRoleTokens.length
      )
      : 0;

    return {
      title: project.title || 'Project',
      score: clampScore((skillMatchScore * 0.6) + (projectCoverageScore * 0.3) + (roleTitleMatchScore * 0.1)),
      technologies: project.technologies || []
    };
  });

  const sortedProjects = [...projectScores].sort((a, b) => b.score - a.score);
  const matchedProjects = sortedProjects.filter(project => project.score >= 40).slice(0, 3);
  
  // Calculate average using the top 2 projects so irrelevant side projects don't drag down the score
  const topProjects = sortedProjects.slice(0, 2);
  const avgScore = clampScore(topProjects.reduce((sum, p) => sum + p.score, 0) / Math.max(1, topProjects.length));

  return {
    score: avgScore,
    matchedProjects,
    risks: matchedProjects.length
      ? []
      : ['Projects are present but appear to lack strong relevance to the specific technical requirements of this role.']
  };
}

function scoreRoleAlignment(parsedData = {}, jobDescription = {}, resumeText = '') {
  const jdText = [
    jobDescription.title,
    jobDescription.company,
    jobDescription.description,
    ...(jobDescription.requirements || []),
    ...(jobDescription.requiredSkills || []),
    ...(jobDescription.preferredSkills || [])
  ].join('\n');

  const candidateText = [
    parsedData.summary || '',
    ...(parsedData.experience || []).map(item => item.description || item.title || ''),
    ...(parsedData.projects || []).map(item => `${item.title || ''} ${item.description || ''}`),
    resumeText
  ].join('\n');

  // Scale coverage by 1.5 because JD often contains many unmatched standard words
  return clampScore(calculateTokenCoverage(jdText, candidateText) * 1.5);
}

function getMlFitScore(mlEvaluation = null) {
  if (!mlEvaluation || mlEvaluation.success === false) {
    return null;
  }

  if (mlEvaluation.inputQuality?.useAsPrimarySignal === false) {
    return null;
  }

  if (typeof mlEvaluation.fitScore === 'number') {
    return clampScore(mlEvaluation.fitScore);
  }

  if (typeof mlEvaluation.fitProbability === 'number') {
    return clampScore(mlEvaluation.fitProbability * 100);
  }

  return null;
}

function screenResumeAgainstJobDescription(resume, jobDescription, options = {}) {
  const jd = applyRolePreset(jobDescription);
  const parsedData = resume.parsedData || {};
  const aiAssessment = options.aiAssessment || null;
  const mlEvaluation = options.mlEvaluation || null;
  const mlFitScore = getMlFitScore(mlEvaluation);
  const mlUsedForPrimaryScoring = mlFitScore !== null;
  const resumeText = normalizeWhitespace(
    [
      resume.rawText || '',
      parsedData.summary || '',
      ...(parsedData.skills || []),
      ...(parsedData.experience || []).map(item => item.description || item.title || ''),
      ...(parsedData.projects || []).map(item => `${item.title || ''} ${item.description || ''}`),
      ...(parsedData.education || []).map(item => item.rawText || item.degree || '')
    ].join('\n')
  );

  const resumeSkillsMap = dedupeNormalized([
    ...(parsedData.skills || []),
    ...extractSkills(resumeText)
  ]);
  const requiredSkillsMap = dedupeNormalized(jd.requiredSkills);
  const preferredSkillsMap = dedupeNormalized(jd.preferredSkills);

  const matchedRequiredSkills = [];
  const missingRequiredSkills = [];
  const matchedPreferredSkills = [];
  const missingPreferredSkills = [];

  for (const [normalized, original] of requiredSkillsMap.entries()) {
    if (resumeSkillsMap.has(normalized) || normalizeToken(resumeText).includes(normalized)) {
      matchedRequiredSkills.push(original);
    } else {
      missingRequiredSkills.push(original);
    }
  }

  for (const [normalized, original] of preferredSkillsMap.entries()) {
    if (resumeSkillsMap.has(normalized) || normalizeToken(resumeText).includes(normalized)) {
      matchedPreferredSkills.push(original);
    } else {
      missingPreferredSkills.push(original);
    }
  }

  const keywordMatches = evaluateTextRequirementMatches(jd.keywords, resumeText);
  const educationMatches = evaluateTextRequirementMatches(
    jd.educationRequirements,
    (parsedData.education || []).map(item => item.rawText || item.degree || '').join('\n')
  );

  const requiredSkillScore = calculateRatio(matchedRequiredSkills.length, jd.requiredSkills.length);
  const preferredSkillScore = calculateRatio(matchedPreferredSkills.length, jd.preferredSkills.length);
  const keywordScore = calculateRatio(keywordMatches.matched.length, jd.keywords.length);
  const educationScore = calculateRatio(educationMatches.matched.length, jd.educationRequirements.length);

  const yearsOfExperience = Number(parsedData.yearsOfExperience || 0);
  const experienceScore = scoreExperienceFit(yearsOfExperience, jd, parsedData, aiAssessment);

  const heuristicRoleAlignmentScore = scoreRoleAlignment(parsedData, jd, resumeText);
  const projectRelevance = scoreProjectRelevance(parsedData.projects || [], jd);
  const resumeQuality = scoreResumeQuality(parsedData, resumeText);
  const atsReadiness = scoreAtsReadiness(resume, parsedData, resumeText);
  const roleAlignmentScore = mlFitScore !== null
    ? clampScore((mlFitScore * 0.65) + (heuristicRoleAlignmentScore * 0.35))
    : averageScores(
      heuristicRoleAlignmentScore,
      aiAssessment?.roleFitScore
    );
  const resumeQualityScore = averageScores(
    resumeQuality.score,
    aiAssessment?.resumeQualityScore
  );
  const atsReadinessScore = averageScores(
    atsReadiness.score,
    aiAssessment?.atsReadinessScore
  );

  const overallScore = mlFitScore !== null
    ? Math.round(
      (requiredSkillScore * 0.18) +
      (preferredSkillScore * 0.06) +
      (keywordScore * 0.07) +
      (experienceScore * 0.08) +
      (educationScore * 0.05) +
      (roleAlignmentScore * 0.12) +
      (projectRelevance.score * 0.10) +
      (resumeQualityScore * 0.10) +
      (atsReadinessScore * 0.08) +
      (mlFitScore * 0.16)
    )
    : Math.round(
      (requiredSkillScore * 0.22) +
      (preferredSkillScore * 0.08) +
      (keywordScore * 0.09) +
      (experienceScore * 0.09) +
      (educationScore * 0.06) +
      (roleAlignmentScore * 0.14) +
      (projectRelevance.score * 0.12) +
      (resumeQualityScore * 0.11) +
      (atsReadinessScore * 0.09)
    );

  const shortlistThreshold = jd.autoShortlistThreshold || 70;
  const effectiveRequiredSkillFloor = isFresherFriendlyRole(jd) ? 40 : 50;
  const isShortlisted = overallScore >= shortlistThreshold && requiredSkillScore >= effectiveRequiredSkillFloor;

  const strengths = [
    ...(matchedRequiredSkills.length > 0 ? [`Strong match for required skills: ${matchedRequiredSkills.slice(0, 5).join(', ')}${matchedRequiredSkills.length > 5 ? ' and more' : ''}`] : []),
    ...(matchedPreferredSkills.length > 0 ? [`Matched preferred skills: ${matchedPreferredSkills.slice(0, 3).join(', ')}`] : []),
    ...(yearsOfExperience >= jd.minimumExperience && jd.minimumExperience > 0 ? [`Meets experience requirement: ${yearsOfExperience} years`] : []),
    ...projectRelevance.matchedProjects.slice(0, 2).map(project => `Relevant project detected: ${project.title}`),
    ...(mlEvaluation?.success && mlEvaluation.prediction && mlUsedForPrimaryScoring ? [`ML model prediction: ${mlEvaluation.prediction}`] : []),
    ...(aiAssessment?.strengths || []).slice(0, 3),
    ...((!yearsOfExperience && (parsedData.projects || []).length >= 2)
      ? ['Relevant projects help demonstrate readiness despite limited formal experience.']
      : [])
  ];

  const concerns = [
    ...(missingRequiredSkills.length > 0 ? [`Missing required skills: ${missingRequiredSkills.slice(0, 5).join(', ')}`] : []),
    ...(jd.minimumExperience && yearsOfExperience < jd.minimumExperience && !isFresherFriendlyRole(jd)
      ? [`Experience gap: role requires ${jd.minimumExperience}+ years, resume suggests ${yearsOfExperience}`]
      : []),
    ...projectRelevance.risks.slice(0, 1),
    ...resumeQuality.risks.slice(0, 1),
    ...atsReadiness.risks.slice(0, 1),
    ...(!mlEvaluation?.success && mlEvaluation?.error ? [`ML scoring unavailable: ${mlEvaluation.error}`] : []),
    ...(mlEvaluation?.success && mlFitScore !== null && mlFitScore < 45 ? ['ML fit probability is low for this role.'] : []),
    ...(mlEvaluation?.success && mlEvaluation.inputQuality?.useAsPrimarySignal === false
      ? ['ML score was recorded as a supporting signal only because the resume or job input was too limited.']
      : []),
    ...(aiAssessment?.risks || []).slice(0, 3)
  ];

  let recommendation = 'Needs review or resume improvement before shortlisting.';
  if (isShortlisted && roleAlignmentScore >= 60) {
    recommendation = 'Strong shortlist recommendation based on requirement fit and overall resume quality.';
  } else if (overallScore >= Math.max(60, shortlistThreshold - 10)) {
    recommendation = 'Borderline profile with potential. Manual review is recommended.';
  } else if (!yearsOfExperience && (parsedData.projects || []).length >= 2 && roleAlignmentScore >= 55) {
    recommendation = 'Promising fresher profile. Strong projects and resume quality justify manual review.';
  }

  const uniqueStrengths = [...new Set(strengths)].filter(Boolean).slice(0, 6);
  const uniqueConcerns = [...new Set(concerns)].filter(Boolean).slice(0, 6);

  const resumePositives = uniqueStrengths;
  const resumeNegatives = uniqueConcerns;

  return {
    jobDescriptionId: jd.id,
    jobTitle: jd.title,
    company: jd.company,
    evaluationProvider: mlUsedForPrimaryScoring ? 'ml' : 'heuristic',
    overallScore,
    shortlistThreshold,
    isShortlisted,
    matchedRequiredSkills,
    missingRequiredSkills,
    matchedPreferredSkills,
    missingPreferredSkills,
    keywordMatches: keywordMatches.matched,
    keywordGaps: keywordMatches.missing,
    educationMatches: educationMatches.matched,
    educationGaps: educationMatches.missing,
    yearsOfExperience,
    scoreBreakdown: {
      requiredSkillScore,
      preferredSkillScore,
      keywordScore,
      experienceScore,
      educationScore,
      roleAlignmentScore,
      projectRelevanceScore: projectRelevance.score,
      resumeQualityScore,
      atsReadinessScore,
      heuristicRoleAlignmentScore,
      heuristicResumeQualityScore: resumeQuality.score,
      heuristicAtsReadinessScore: atsReadiness.score,
      mlFitScore,
      fresherPotentialScore: aiAssessment?.fresherPotentialScore || null
    },
    qualitySignals: [...new Set([
      ...(mlEvaluation?.success
        ? [`ML evaluation (${mlEvaluation.modelId || 'selected model'}): ${mlEvaluation.prediction || 'completed'}${typeof mlEvaluation.fitScore === 'number' ? ` with ${clampScore(mlEvaluation.fitScore)}% fit score` : ''}${mlUsedForPrimaryScoring ? '' : ' (supporting signal only)'}.`]
        : []),
      ...(aiAssessment?.summary ? [aiAssessment.summary] : [])
    ])],
    riskSignals: [...new Set([
      ...resumeQuality.risks,
      ...atsReadiness.risks,
      ...projectRelevance.risks,
      ...((aiAssessment?.risks || []).slice(0, 3)),
      ...(mlEvaluation?.success && mlEvaluation.inputQuality?.useAsPrimarySignal === false
        ? (mlEvaluation.inputQuality.warnings || [])
        : [])
    ])],
    matchedProjects: projectRelevance.matchedProjects,
    mlEvaluation: mlEvaluation
      ? {
        success: mlEvaluation.success !== false,
        modelId: mlEvaluation.modelId || null,
        algorithm: mlEvaluation.algorithm || null,
        taskType: mlEvaluation.taskType || null,
        prediction: mlEvaluation.prediction || null,
        probabilities: mlEvaluation.probabilities || {},
        confidence: typeof mlEvaluation.confidence === 'number' ? mlEvaluation.confidence : null,
        rawFitProbability: typeof mlEvaluation.rawFitProbability === 'number' ? mlEvaluation.rawFitProbability : null,
        calibratedFitProbability: typeof mlEvaluation.calibratedFitProbability === 'number' ? mlEvaluation.calibratedFitProbability : null,
        decisionThreshold: typeof mlEvaluation.decisionThreshold === 'number' ? mlEvaluation.decisionThreshold : null,
        fitScore: typeof mlEvaluation.fitScore === 'number' ? clampScore(mlEvaluation.fitScore) : null,
        usedForPrimaryScoring: mlUsedForPrimaryScoring,
        inputQuality: mlEvaluation.inputQuality || null,
        error: mlEvaluation.error || null
      }
      : null,
    strengths,
    concerns,
    resumePositives,
    resumeNegatives,
    recommendation
  };
}

function rankResumesForJobDescription(resumes = [], jobDescription, options = {}) {
  const shortlistThreshold = Number(options.shortlistThreshold || jobDescription.autoShortlistThreshold || 70);

  const rankedResumes = resumes
    .map(resume => {
      const result = screenResumeAgainstJobDescription(resume, {
        ...jobDescription,
        autoShortlistThreshold: shortlistThreshold
      });

      return {
        resumeId: resume._id?.toString?.() || '',
        candidateName: resume.parsedData?.name || resume.originalName || resume.filename,
        originalName: resume.originalName,
        status: result.isShortlisted ? 'shortlisted' : 'review',
        result
      };
    })
    .sort((left, right) => right.result.overallScore - left.result.overallScore);

  return {
    shortlistThreshold,
    totalResumes: resumes.length,
    shortlistedCount: rankedResumes.filter(item => item.result.isShortlisted).length,
    rankedResumes
  };
}

module.exports = {
  normalizeJobDescription,
  inferJobRequirementsFromDescription,
  applyRolePreset,
  screenResumeAgainstJobDescription,
  rankResumesForJobDescription
};
