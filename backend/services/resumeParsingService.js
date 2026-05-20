const pdfParseModule = require('pdf-parse');
const { extractResumeDataWithModel } = require('./insightService');

const PDFParse = pdfParseModule.PDFParse;

const COMMON_SKILLS = [
  'React', 'Next.js', 'JavaScript', 'TypeScript', 'Node.js', 'Express', 'MongoDB',
  'PostgreSQL', 'MySQL', 'HTML', 'CSS', 'Tailwind CSS', 'Redux', 'GraphQL',
  'REST API', 'RESTful APIs', 'Vite', 'Webpack', 'Jest', 'Cypress', 'Python',
  'Django', 'Flask', 'FastAPI', 'Java', 'C++', 'C', 'AWS', 'Azure', 'GCP',
  'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'GitHub Actions', 'Jenkins',
  'Redis', 'Kafka', 'RabbitMQ', 'Machine Learning', 'Deep Learning', 'PyTorch',
  'TensorFlow', 'Scikit-learn', 'Pandas', 'NumPy', 'SQL', 'NoSQL', 'Figma',
  'UX Design', 'UI Design', 'User Research', 'Wireframing', 'Prototyping',
  'Accessibility', 'Design Systems', 'Product Management', 'Agile',
  'Stakeholder Management', 'Data Analysis', 'Communication', 'Leadership',
  'Problem Solving', 'Testing', 'Microservices', 'System Design', 'NLP',
  'Power BI', 'Tableau', 'Looker', 'BigQuery', 'dbt', 'Excel', 'R', 'Numba',
  'Matplotlib', 'Seaborn', 'OpenCV', 'LangChain', 'Prompt Engineering', 'LLM',
  'GenAI', 'Supabase', 'Prisma', 'Firebase', 'Linux', 'Bash', 'OAuth', 'JWT'
];

const SECTION_ALIASES = {
  summary: ['summary', 'professional summary', 'profile', 'objective', 'career objective', 'about me', 'professional profile'],
  experience: ['experience', 'work experience', 'professional experience', 'employment history', 'internships', 'internship', 'work history'],
  education: ['education', 'academic background', 'academics', 'qualification', 'qualifications'],
  projects: ['projects', 'project experience', 'personal projects', 'academic projects', 'relevant projects', 'major projects'],
  skills: ['skills', 'technical skills', 'core skills', 'key skills', 'technical expertise', 'competencies', 'tech stack']
};

function normalizeWhitespace(text = '') {
  return text
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function titleCase(value = '') {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function uniqueStrings(values = []) {
  return [...new Set(values.map(value => `${value || ''}`.trim()).filter(Boolean))];
}

function dedupeBy(values = [], getKey = value => value) {
  const seen = new Set();

  return values.filter(value => {
    const key = `${getKey(value) || ''}`.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeHeading(value = '') {
  return value
    .toLowerCase()
    .replace(/[:|•·]/g, ' ')
    .replace(/[^a-z0-9/&+\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesHeadingAlias(line = '', aliases = []) {
  const normalizedLine = normalizeHeading(line);
  if (!normalizedLine) return false;

  return aliases.some(alias => {
    const normalizedAlias = normalizeHeading(alias);
    return (
      normalizedLine === normalizedAlias ||
      normalizedLine.startsWith(`${normalizedAlias} `) ||
      normalizedLine.endsWith(` ${normalizedAlias}`) ||
      normalizedLine.includes(normalizedAlias)
    );
  });
}

function detectSectionType(line = '') {
  const entries = Object.entries(SECTION_ALIASES);
  for (const [sectionName, aliases] of entries) {
    if (matchesHeadingAlias(line, aliases)) {
      return sectionName;
    }
  }
  return null;
}

function extractEmail(text = '') {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

function extractPhone(text = '') {
  return text.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/)?.[0] || '';
}

function extractName(text = '', originalName = '') {
  const firstLines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  const nameLine = firstLines.find(line => {
    if (line.length < 3 || line.length > 60) return false;
    if (/@|www\.|linkedin|github|resume|curriculum/i.test(line)) return false;
    const words = line.split(/\s+/);
    return words.length >= 2 && words.length <= 4;
  });

  if (nameLine) {
    return titleCase(nameLine.replace(/[^a-zA-Z\s.-]/g, ' ').replace(/\s+/g, ' ').trim());
  }

  const fallback = originalName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim();

  return fallback ? titleCase(fallback) : '';
}

function extractSection(text = '', headings = []) {
  const normalized = text.replace(/\r/g, '');
  const lines = normalized.split('\n');
  const headingIndex = lines.findIndex(line => matchesHeadingAlias(line, headings));

  if (headingIndex === -1) return '';

  const content = [];
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      content.push(lines[index]);
      continue;
    }

    const detectedSection = detectSectionType(line);
    if (detectedSection) {
      break;
    }

    content.push(lines[index]);
  }

  return normalizeWhitespace(content.join('\n'));
}

function extractSummary(text = '') {
  const summarySection = extractSection(text, [
    'summary',
    'professional summary',
    'profile',
    'objective',
    'career objective'
  ]);

  if (summarySection) {
    return summarySection.slice(0, 1200);
  }

  const fallbackLines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/@|linkedin|github|portfolio|www\.|phone|mobile/i.test(line))
    .slice(1, 7);

  return normalizeWhitespace(fallbackLines.join(' ')).slice(0, 800);
}

function extractSkills(text = '') {
  const source = ` ${text.toLowerCase()} `;

  const foundSkills = COMMON_SKILLS.filter(skill => {
    const variants = [skill.toLowerCase()];
    if (skill === 'Node.js') variants.push('nodejs');
    if (skill === 'Next.js') variants.push('nextjs');
    if (skill === 'Tailwind CSS') variants.push('tailwind');
    if (skill === 'RESTful APIs') variants.push('rest api', 'restful api');

    return variants.some(variant => {
      const pattern = escapeRegExp(variant).replace(/\\ /g, '\\s+');
      const regex = new RegExp(`(^|[^a-z0-9+#])${pattern}([^a-z0-9+#]|$)`, 'i');
      return regex.test(source);
    });
  });

  return [...new Set(foundSkills)];
}

function extractSkillsFromSection(text = '') {
  const skillsSection = extractSection(text, SECTION_ALIASES.skills);
  if (!skillsSection) {
    return [];
  }

  const candidates = skillsSection
    .replace(/[•·]/g, '\n')
    .split(/\n|,|\||\/{2,}|;+/)
    .map(token => token.trim())
    .filter(Boolean)
    .flatMap(token => token.split(/\s{2,}/).map(part => part.trim()).filter(Boolean))
    .filter(token => token.length >= 2 && token.length <= 40)
    .filter(token => !/^(skills|technical skills|core skills)$/i.test(token));

  const normalizedCandidates = candidates.map(token => token.replace(/\s+/g, ' '));
  return uniqueStrings([
    ...normalizedCandidates,
    ...extractSkills(skillsSection)
  ]).slice(0, 40);
}

function extractEducation(text = '') {
  const educationSection = extractSection(text, SECTION_ALIASES.education);
  const source = educationSection || text;

  return source
    .split('\n')
    .map(line => line.trim())
    .filter(line => /(b\.?tech|bachelor|master|mba|m\.?tech|phd|diploma|university|college|school)/i.test(line))
    .slice(0, 5)
    .map(line => {
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      return {
        degree: line.match(/(b\.?tech|bachelor[^,;]*|master[^,;]*|mba|m\.?tech|phd|diploma)/i)?.[0] || '',
        institution: line.match(/(university|college|school|institute)[^,;]*/i)?.[0] || '',
        year: yearMatch?.[0] || '',
        rawText: line
      };
    });
}

function isEducationLikeText(text = '') {
  return /(bachelor|master|m\.?tech|b\.?tech|mba|phd|university|college|school|class x|class xii|matriculation|intermediate|cgpa|gpa|semester|coursework)/i.test(text);
}

function isExperienceLikeText(text = '') {
  return /(intern|internship|developer|engineer|analyst|designer|consultant|freelance|software|assistant|associate|manager|research|employee|worked|experience|organization|company|startup)/i.test(text);
}

function sanitizeExperienceEntries(entries = []) {
  return dedupeBy(
    (entries || [])
      .map(entry => ({
        title: normalizeWhitespace(entry?.title || ''),
        company: normalizeWhitespace(entry?.company || ''),
        duration: normalizeWhitespace(entry?.duration || ''),
        description: normalizeWhitespace(entry?.description || '')
      }))
      .filter(entry => {
        const combined = normalizeWhitespace([
          entry.title,
          entry.company,
          entry.duration,
          entry.description
        ].join(' '));

        if (!combined || isEducationLikeText(combined)) {
          return false;
        }

        const hasWorkKeyword = isExperienceLikeText(combined);
        const hasDateRange = /(20\d{2}|19\d{2}).{0,8}(20\d{2}|19\d{2}|present|current)/i.test(combined);
        const hasCompany = entry.company && !isEducationLikeText(entry.company);

        return hasWorkKeyword || (hasDateRange && hasCompany);
      }),
    entry => [entry.title, entry.company, entry.duration, entry.description.slice(0, 80)].join('|')
  ).slice(0, 8);
}

function sanitizeProjectEntries(projects = []) {
  return dedupeBy(
    (projects || [])
      .map(project => ({
        title: normalizeWhitespace(project?.title || ''),
        description: normalizeWhitespace(project?.description || ''),
        technologies: uniqueStrings(project?.technologies || [])
      }))
      .filter(project => {
        const combined = normalizeWhitespace([
          project.title,
          project.description,
          ...(project.technologies || [])
        ].join(' '));

        if (!combined) {
          return false;
        }

        const looksLikeHeadingOnly = matchesHeadingAlias(project.title, SECTION_ALIASES.projects);
        const hasEvidence = project.description.length >= 20 || (project.technologies || []).length > 0;

        return !looksLikeHeadingOnly && hasEvidence;
      }),
    project => [project.title, project.description.slice(0, 120)].join('|')
  ).slice(0, 6);
}

function sanitizeEducationEntries(entries = []) {
  return dedupeBy(
    (entries || [])
      .map(entry => ({
        degree: normalizeWhitespace(entry?.degree || ''),
        institution: normalizeWhitespace(entry?.institution || ''),
        year: normalizeWhitespace(entry?.year || ''),
        rawText: normalizeWhitespace(entry?.rawText || [entry?.degree, entry?.institution, entry?.year].filter(Boolean).join(', '))
      }))
      .filter(entry => entry.rawText && isEducationLikeText(entry.rawText)),
    entry => entry.rawText
  ).slice(0, 5);
}

function extractExperienceEntries(text = '') {
  const experienceSection = extractSection(text, SECTION_ALIASES.experience);
  const source = experienceSection;
  if (!source) {
    return [];
  }

  const lines = source
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const entries = [];
  let currentEntry = null;

  for (const line of lines) {
    if (matchesHeadingAlias(line, SECTION_ALIASES.education) || matchesHeadingAlias(line, SECTION_ALIASES.projects)) {
      break;
    }

    if (/(bachelor|master|university|college|school|class x|class xii|matriculation|intermediate)/i.test(line)) {
      continue;
    }

    const dateMatch = line.match(/(20\d{2}|19\d{2}).{0,8}(20\d{2}|19\d{2}|present)/i);
    const parts = line.split(/\s+\|\s+| at | - /i).map(part => part.trim()).filter(Boolean);
    const isBullet = /^[•\-]/.test(line);
    const experienceKeywordMatch = /(intern|internship|developer|engineer|analyst|designer|consultant|freelance|software|assistant|associate|manager|research|employee|worked|experience)/i.test(line);

    if ((dateMatch || parts.length >= 2) && experienceKeywordMatch) {
      if (currentEntry) {
        entries.push(currentEntry);
      }

      currentEntry = {
        title: parts[0] || '',
        company: parts[1] || '',
        duration: dateMatch?.[0] || '',
        description: line
      };
      continue;
    }

    if (currentEntry && (isBullet || line.length > 30)) {
      currentEntry.description = normalizeWhitespace(`${currentEntry.description}\n${line}`);
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return sanitizeExperienceEntries(entries);
}

function extractProjects(text = '') {
  const projectSection = extractSection(text, SECTION_ALIASES.projects);
  if (!projectSection) {
    return [];
  }

  const lines = projectSection
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const projects = [];
  let currentProject = null;

  for (const line of lines) {
    const looksLikeTitle = (
      line.length <= 100 &&
      !/^[•\-]/.test(line) &&
      /[A-Za-z]/.test(line) &&
      (!currentProject || line === line.toUpperCase() || /[:|-]$/.test(line) || extractSkills(line).length > 0)
    );

    if (!currentProject || looksLikeTitle) {
      if (currentProject) {
        projects.push(currentProject);
      }

      currentProject = {
        title: line.replace(/[:|-]\s*$/, '').trim(),
        description: '',
        technologies: extractSkills(line)
      };
      continue;
    }

    currentProject.description = normalizeWhitespace(`${currentProject.description}\n${line}`);
    currentProject.technologies = [...new Set([
      ...(currentProject.technologies || []),
      ...extractSkills(line)
    ])];
  }

  if (currentProject) {
    projects.push(currentProject);
  }

  return sanitizeProjectEntries(
    projects.map(project => ({
      ...project,
      description: project.description.trim()
    }))
  );
}

function estimateYearsOfExperience(text = '', experienceEntries = []) {
  const currentYear = new Date().getFullYear();
  const experienceSection = extractSection(text, SECTION_ALIASES.experience);
  const source = experienceEntries.length
    ? experienceEntries.map(entry => [entry.title, entry.company, entry.duration, entry.description].join(' ')).join('\n')
    : experienceSection;

  if (!source) return 0;

  const ranges = [...source.matchAll(/(19\d{2}|20\d{2})\s*[-–]\s*(present|current|19\d{2}|20\d{2})/gi)];

  if (ranges.length === 0) return 0;

  const totalYears = ranges.reduce((sum, match) => {
    const startYear = Number(match[1]);
    const endToken = match[2].toLowerCase();
    const endYear = ['present', 'current'].includes(endToken) ? currentYear : Number(endToken);

    if (!startYear || !endYear || endYear < startYear) return sum;
    return sum + (endYear - startYear);
  }, 0);

  return Math.min(totalYears, 40);
}

function buildHeuristicParsedData(rawText = '', originalName = '') {
  const experience = extractExperienceEntries(rawText);
  const projects = extractProjects(rawText);
  const education = extractEducation(rawText);

  return {
    name: extractName(rawText, originalName),
    email: extractEmail(rawText),
    phone: extractPhone(rawText),
    skills: uniqueStrings([
      ...extractSkillsFromSection(rawText),
      ...extractSkills(rawText)
    ]),
    projects,
    experience,
    education,
    yearsOfExperience: estimateYearsOfExperience(rawText, experience),
    summary: extractSummary(rawText)
  };
}

async function extractRawTextFromFile(file) {
  if (!file?.buffer) {
    return { rawText: '', parserNotes: ['No file buffer available for parsing.'] };
  }

  if (file.mimetype === 'application/pdf') {
    try {
      const parser = new PDFParse({ data: file.buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      return {
        rawText: normalizeWhitespace(parsed?.text || ''),
        parserNotes: normalizeWhitespace(parsed?.text || '').length >= 80
          ? []
          : ['Very limited text was extracted from the PDF. It may be image-based, heavily designed, or not machine-readable.']
      };
    } catch (error) {
      return {
        rawText: '',
        parserNotes: [`PDF parsing failed: ${error.message}`]
      };
    }
  }

  return {
    rawText: '',
    parserNotes: ['Automatic text extraction is currently enabled for PDF resumes only.']
  };
}

async function parseResumeFile(file, originalName = '') {
  const { rawText, parserNotes } = await extractRawTextFromFile(file);
  return parseResumeText(rawText, originalName, { parserNotes });
}

async function parseResumeText(rawText = '', originalName = '', options = {}) {
  const parserNotes = Array.isArray(options.parserNotes) ? options.parserNotes : [];
  const heuristicData = buildHeuristicParsedData(rawText, originalName);

  const modelExtraction = options.useModel === false
    ? { success: false, error: 'Model-assisted extraction was skipped' }
    : await extractResumeDataWithModel({ rawText, originalName });
  const parsedData = modelExtraction.success
    ? mergeParsedData(heuristicData, modelExtraction.data)
    : heuristicData;

  const nextParserNotes = [...parserNotes];
  if (!rawText) {
    nextParserNotes.push('No readable text could be extracted from this resume.');
  } else if (rawText.length < 250) {
    nextParserNotes.push('Resume text extraction was partial, so some sections may be incomplete.');
  }

  if (!modelExtraction.success && rawText.length >= 250) {
    nextParserNotes.push(`Model-assisted resume extraction was unavailable: ${modelExtraction.error}`);
  }

  return {
    rawText,
    parsedData,
    parserNotes: uniqueStrings(nextParserNotes)
  };
}

function mergeParsedData(baseParsedData = {}, overrides = {}) {
  const manualSkills = Array.isArray(overrides.skills)
    ? overrides.skills
    : typeof overrides.skills === 'string'
      ? overrides.skills.split(',').map(item => item.trim()).filter(Boolean)
      : [];

  const mergedProjects = sanitizeProjectEntries([
    ...(baseParsedData.projects || []),
    ...((Array.isArray(overrides.projects) && overrides.projects.length > 0) ? overrides.projects : [])
  ]);
  const mergedExperience = sanitizeExperienceEntries([
    ...(baseParsedData.experience || []),
    ...((Array.isArray(overrides.experience) && overrides.experience.length > 0) ? overrides.experience : [])
  ]);
  const mergedEducation = sanitizeEducationEntries([
    ...(baseParsedData.education || []),
    ...((Array.isArray(overrides.education) && overrides.education.length > 0) ? overrides.education : [])
  ]);
  const overrideSummary = overrides.summary?.trim() || '';
  const baseSummary = baseParsedData.summary || '';
  const mergedSummary = overrideSummary.length > baseSummary.length
    ? overrideSummary
    : baseSummary;
  const overrideYears = Number(overrides.yearsOfExperience);
  const baseYears = Number(baseParsedData.yearsOfExperience || 0);
  const mergedYearsOfExperience = mergedExperience.length > 0
    ? Math.max(
      Number.isFinite(overrideYears) ? overrideYears : 0,
      Number.isFinite(baseYears) ? baseYears : 0
    )
    : 0;

  return {
    ...baseParsedData,
    name: overrides.name?.trim() || baseParsedData.name || '',
    email: overrides.email?.trim() || baseParsedData.email || '',
    phone: overrides.phone?.trim() || baseParsedData.phone || '',
    skills: [...new Set([...(baseParsedData.skills || []), ...manualSkills])],
    projects: mergedProjects,
    experience: mergedExperience,
    education: mergedEducation,
    yearsOfExperience: mergedYearsOfExperience,
    summary: mergedSummary
  };
}

module.exports = {
  parseResumeFile,
  parseResumeText,
  mergeParsedData,
  normalizeWhitespace,
  extractSkills
};
