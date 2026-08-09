const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyRolePreset,
  screenResumeAgainstJobDescription
} = require('../services/screeningService');

function buildResume(overrides = {}) {
  return {
    rawText: 'React Node.js Express MongoDB REST API JavaScript HTML CSS project testing deployment authentication dashboard backend frontend.',
    originalName: 'candidate.pdf',
    parsedData: {
      name: 'Test Candidate',
      summary: 'Full stack developer with practical project experience building APIs and React interfaces.',
      skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'REST API', 'HTML', 'CSS'],
      projects: [
        {
          title: 'Full Stack Dashboard',
          description: 'Built a React and Node.js dashboard with MongoDB, REST APIs, authentication, and deployment.'
        }
      ],
      experience: [],
      education: [{ degree: 'B.Tech Computer Science', rawText: 'B.Tech Computer Science' }],
      yearsOfExperience: 0,
      ...overrides.parsedData
    },
    ...overrides
  };
}

test('applyRolePreset expands sparse direct-role descriptions deterministically', () => {
  const jobDescription = applyRolePreset({
    title: 'Full Stack Developer',
    description: 'Role: Full Stack Developer.'
  });

  assert.match(jobDescription.description, /Builds end-to-end web applications/);
  assert.ok(jobDescription.requiredSkills.includes('React'));
  assert.ok(jobDescription.requiredSkills.includes('Node.js'));
  assert.ok(jobDescription.preferredSkills.includes('TypeScript'));
});

test('screening uses ML as primary signal when input quality is sufficient', () => {
  const result = screenResumeAgainstJobDescription(
    buildResume({
      rawText: `${'React Node.js MongoDB REST API full stack '.repeat(30)} authentication deployment testing projects.`
    }),
    applyRolePreset({ title: 'Full Stack Developer' }),
    {
      mlEvaluation: {
        success: true,
        modelId: 'ml3',
        algorithm: 'random_forest',
        taskType: 'resume_job_fit',
        prediction: 'Fit',
        fitScore: 82,
        inputQuality: {
          resumeWordCount: 220,
          jobWordCount: 45,
          requiredSkillCount: 8,
          useAsPrimarySignal: true,
          warnings: []
        }
      }
    }
  );

  assert.equal(result.evaluationProvider, 'ml');
  assert.equal(result.scoreBreakdown.mlFitScore, 82);
  assert.equal(result.mlEvaluation.usedForPrimaryScoring, true);
});

test('screening records weak ML input as supporting signal and falls back to heuristic scoring', () => {
  const result = screenResumeAgainstJobDescription(
    buildResume({ rawText: 'React Node.js MongoDB APIs.' }),
    applyRolePreset({ title: 'Full Stack Developer' }),
    {
      mlEvaluation: {
        success: true,
        modelId: 'ml3',
        algorithm: 'random_forest',
        taskType: 'resume_job_fit',
        prediction: 'Not Fit',
        fitScore: 10,
        inputQuality: {
          resumeWordCount: 4,
          jobWordCount: 35,
          requiredSkillCount: 8,
          useAsPrimarySignal: false,
          warnings: ['Resume signal is short (4 words).']
        }
      }
    }
  );

  assert.equal(result.evaluationProvider, 'heuristic');
  assert.equal(result.scoreBreakdown.mlFitScore, null);
  assert.equal(result.mlEvaluation.fitScore, 10);
  assert.equal(result.mlEvaluation.usedForPrimaryScoring, false);
  assert.ok(result.qualitySignals.some(signal => signal.includes('supporting signal only')));
  assert.ok(result.riskSignals.includes('Resume signal is short (4 words).'));
});
