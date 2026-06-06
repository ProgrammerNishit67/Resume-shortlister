import { tokenize, calculateCosineSimilarity, matchSkills, matchKeywords } from './matcher.js';
import { evaluateResume } from './scoring.js';

console.log('--- RUNNING ATS ENGINE LOGIC TESTS ---');

// Test 1: Tokenizer
const rawText = "Experienced backend developer fluent in Java, Python and AWS cloud systems.";
const tokens = tokenize(rawText);
console.log('Tokenizer Output:', tokens);
if (tokens.includes('backend') && tokens.includes('java') && !tokens.includes('and')) {
  console.log('✅ Tokenizer Test: Passed');
} else {
  console.log('❌ Tokenizer Test: Failed');
}

// Test 2: Cosine Similarity
const textA = "Docker, Kubernetes, AWS, microservices, system architect";
const textB = "We need an engineer experienced with Docker, Kubernetes and microservices deployments.";
const similarity = calculateCosineSimilarity(textA, textB);
console.log('Semantic Cosine Similarity:', similarity.toFixed(3));
if (similarity > 0.2) {
  console.log('✅ Cosine Similarity Test: Passed');
} else {
  console.log('❌ Cosine Similarity Test: Failed');
}

// Test 3: Skills Matcher
const resumeSkills = ['Java', 'Python', 'Docker', 'React'];
const jdSkills = ['Docker', 'Kubernetes', 'Python', 'AWS'];
const skillsMatch = matchSkills(resumeSkills, jdSkills);
console.log('Skills Match:', skillsMatch);
if (skillsMatch.matched.length === 2 && skillsMatch.missing.includes('AWS')) {
  console.log('✅ Skills Match Test: Passed');
} else {
  console.log('❌ Skills Match Test: Failed');
}

// Test 4: Full Evaluator
const mockResume = {
  skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Git'],
  experienceYears: 3.5,
  education: ['Bachelor of Science (B.S.)'],
  certifications: ['AWS Certified Developer'],
  rawText: 'John Doe. Contact email: john@example.com. Phone: 123-456-7890. Experienced Full Stack Engineer with 3.5 years of React, Node.js, and PostgreSQL database optimization. Projects: Built a SaaS dashboard with GraphQL and AWS S3 integrations. Active on GitHub.',
  sections: {
    skills: 'React, Node.js, JavaScript, PostgreSQL, Git',
    experience: 'Full Stack Engineer (3.5 years). Optimized relational databases. Built server APIs.',
    projects: 'Built high-throughput SaaS dashboard. Integrated AWS S3.',
    education: 'B.S. in Computer Science',
    certifications: 'AWS Certified Developer'
  },
  contact: { email: 'john@example.com', phone: '123-456-7890', github: 'github.com/johndoe', linkedin: '' },
  layoutIssues: []
};

const mockJD = {
  skills: ['React', 'Node.js', 'MongoDB', 'Docker', 'AWS'],
  experienceRequired: 3,
  degreesRequired: ['Bachelor'],
  certificationsRequired: [],
  keywords: ['react', 'node.js', 'saas', 'database', 'optimization', 'dashboard', 'docker', 'kubernetes'],
  responsibilities: ['Develop frontend interfaces using React.', 'Design database architectures.', 'Maintain deployment containers.']
};

const evaluation = evaluateResume(mockResume, mockJD, 'Full Stack Developer');
console.log('Evaluation Result Score:', evaluation.overallScore);
console.log('Interview Probability:', evaluation.interviewProbability);
console.log('Hiring Readiness:', evaluation.hiringReadiness);
console.log('Suggestions:', evaluation.suggestions);

if (evaluation.overallScore > 50 && evaluation.overallScore <= 100) {
  console.log('✅ Full Evaluator Engine Test: Passed');
} else {
  console.log('❌ Full Evaluator Engine Test: Failed');
}

console.log('--- ALL BACKEND TESTS COMPLETED ---');
