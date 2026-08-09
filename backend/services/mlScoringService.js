const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const DEFAULT_MODEL_ID = 'ml3';
const DEFAULT_TIMEOUT_MS = 45_000;
const PRIMARY_SIGNAL_MIN_RESUME_WORDS = 90;
const PRIMARY_SIGNAL_MIN_JOB_WORDS = 20;
const PRIMARY_SIGNAL_MIN_REQUIRED_SKILLS = 2;

function resolveMlRoot() {
  return process.env.ML_MODELS_DIR
    ? path.resolve(process.env.ML_MODELS_DIR)
    : path.resolve(__dirname, '..', '..', 'ml_models');
}

function resolvePythonPath(mlRoot) {
  if (process.env.ML_PYTHON_PATH) {
    if (path.isAbsolute(process.env.ML_PYTHON_PATH)) {
      return process.env.ML_PYTHON_PATH;
    }

    const cwdRelativePath = path.resolve(process.cwd(), process.env.ML_PYTHON_PATH);
    if (fs.existsSync(cwdRelativePath)) {
      return cwdRelativePath;
    }

    return path.resolve(mlRoot, process.env.ML_PYTHON_PATH);
  }

  return path.join(mlRoot, '.venv', 'bin', 'python');
}

function parseMlResponse(stdout) {
  const trimmed = `${stdout || ''}`.trim();
  if (!trimmed) {
    throw new Error('ML scorer returned an empty response');
  }

  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('ML scorer did not return JSON');
  }

  return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
}

function normalizeWhitespace(text = '') {
  return `${text || ''}`.replace(/\s+/g, ' ').trim();
}

function countWords(text = '') {
  const normalized = normalizeWhitespace(text);
  return normalized ? normalized.split(/\s+/).length : 0;
}

function stringifyList(values = []) {
  return Array.isArray(values) ? values.filter(Boolean).join(' ') : '';
}

function buildResumeSignalText(resume = {}) {
  const parsedData = resume.parsedData || {};
  return normalizeWhitespace([
    resume.rawText || '',
    parsedData.summary || '',
    stringifyList(parsedData.skills),
    ...(parsedData.experience || []).map(item => `${item.title || ''} ${item.company || ''} ${item.description || ''}`),
    ...(parsedData.projects || []).map(item => `${item.title || ''} ${item.description || ''}`),
    ...(parsedData.education || []).map(item => item.rawText || item.degree || '')
  ].join(' '));
}

function buildJobSignalText(jobDescription = {}) {
  return normalizeWhitespace([
    jobDescription.title || '',
    jobDescription.company || '',
    jobDescription.description || '',
    stringifyList(jobDescription.requiredSkills),
    stringifyList(jobDescription.preferredSkills),
    stringifyList(jobDescription.keywords),
    stringifyList(jobDescription.requirements),
    stringifyList(jobDescription.educationRequirements)
  ].join(' '));
}

function assessInputQuality(resume = {}, jobDescription = {}, modelId = DEFAULT_MODEL_ID) {
  const resumeWordCount = countWords(buildResumeSignalText(resume));
  const jobWordCount = countWords(buildJobSignalText(jobDescription));
  const requiredSkillCount = Array.isArray(jobDescription.requiredSkills)
    ? jobDescription.requiredSkills.filter(Boolean).length
    : 0;
  const warnings = [];

  if (resumeWordCount < PRIMARY_SIGNAL_MIN_RESUME_WORDS) {
    warnings.push(`Resume signal is short (${resumeWordCount} words).`);
  }

  if (jobWordCount < PRIMARY_SIGNAL_MIN_JOB_WORDS) {
    warnings.push(`Job description signal is short (${jobWordCount} words).`);
  }

  if (requiredSkillCount < PRIMARY_SIGNAL_MIN_REQUIRED_SKILLS) {
    warnings.push(`Few required skills were available (${requiredSkillCount}).`);
  }

  const useAsPrimarySignal = modelId !== 'ml3' || warnings.length === 0;

  return {
    resumeWordCount,
    jobWordCount,
    requiredSkillCount,
    useAsPrimarySignal,
    warnings
  };
}

function normalizeMlResult(result = {}, inputQuality = null) {
  const probabilities = result.probabilities || {};
  const rawFitProbability = typeof result.raw_fit_probability === 'number'
    ? result.raw_fit_probability
    : typeof probabilities.Fit === 'number'
      ? probabilities.Fit
      : typeof probabilities.fit === 'number'
        ? probabilities.fit
        : null;
  const calibratedFitProbability = typeof result.calibrated_fit_probability === 'number'
    ? result.calibrated_fit_probability
    : null;
  const fitProbability = typeof calibratedFitProbability === 'number'
    ? calibratedFitProbability
    : typeof probabilities.Fit === 'number'
    ? probabilities.Fit
    : typeof probabilities.fit === 'number'
      ? probabilities.fit
      : null;
  const confidence = typeof result.confidence === 'number'
    ? result.confidence
    : Math.max(0, ...Object.values(probabilities).filter(value => typeof value === 'number'));

  return {
    success: result.success !== false,
    modelId: result.model_id || result.modelId || DEFAULT_MODEL_ID,
    algorithm: result.algorithm || null,
    taskType: result.task_type || result.taskType || null,
    prediction: result.prediction || '',
    probabilities,
    confidence,
    rawFitProbability,
    calibratedFitProbability,
    decisionThreshold: typeof result.decision_threshold === 'number' ? result.decision_threshold : null,
    fitProbability,
    fitScore: typeof fitProbability === 'number' ? Math.round(fitProbability * 100) : null,
    inputQuality
  };
}

async function scoreResumeWithML(resume, jobDescription, options = {}) {
  const mlRoot = resolveMlRoot();
  const pythonPath = resolvePythonPath(mlRoot);
  const scriptPath = path.join(mlRoot, 'score_resume.py');
  const modelId = options.modelId || process.env.RESUME_ML_MODEL || DEFAULT_MODEL_ID;
  const timeoutMs = Number(process.env.ML_SCORING_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const inputQuality = assessInputQuality(resume, jobDescription, modelId);
  const payload = {
    model_id: modelId,
    resume: {
      rawText: resume.rawText || '',
      parsedData: resume.parsedData || {}
    },
    jobDescription
  };

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const child = spawn(pythonPath, [scriptPath], {
      cwd: mlRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      resolve({
        success: false,
        modelId,
        error: `ML scoring timed out after ${timeoutMs}ms`,
        inputQuality
      });
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        success: false,
        modelId,
        error: error.message,
        inputQuality
      });
    });

    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      try {
        const parsed = parseMlResponse(stdout || stderr);
        if (code !== 0 || parsed.success === false) {
          resolve({
            success: false,
            modelId,
            error: parsed.error || stderr.trim() || `ML scorer exited with code ${code}`,
            inputQuality
          });
          return;
        }

        resolve(normalizeMlResult(parsed, inputQuality));
      } catch (error) {
        resolve({
          success: false,
          modelId,
          error: error.message,
          stderr: stderr.trim(),
          inputQuality
        });
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

module.exports = {
  scoreResumeWithML,
  assessInputQuality
};
