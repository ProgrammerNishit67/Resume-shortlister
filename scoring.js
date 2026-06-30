import { matchSkills, matchKeywords, calculateCosineSimilarity } from './matcher.js';

// Degree weight mappings
const DEGREE_VALUES = {
  'associate': 1,
  'bachelor': 2,
  'bs': 2,
  'ba': 2,
  'master': 3,
  'ms': 3,
  'ma': 3,
  'phd': 4,
  'ph.d.': 4,
  'doctorate': 4
};

function getMaxDegreeValue(degrees) {
  let maxVal = 0;
  for (const deg of degrees) {
    const lower = deg.toLowerCase();
    for (const [key, val] of Object.entries(DEGREE_VALUES)) {
      if (lower.includes(key) && val > maxVal) {
        maxVal = val;
      }
    }
  }
  return maxVal || 2; // Default to Bachelor value if some degrees exist but no match
}

// Role-based presets
const ROLE_PRESETS = {
  'Software Engineer': {
    tech: ['Docker', 'Kubernetes', 'CI/CD Pipelines', 'System Design', 'Redis'],
    projects: ['Scalable Microservices System', 'Automated CI/CD Pipeline deployment', 'Distributed Cache Implementation'],
    certs: ['AWS Certified Developer - Associate', 'Certified Kubernetes Administrator (CKA)']
  },
  'Backend Developer': {
    tech: ['Golang', 'PostgreSQL', 'Redis', 'gRPC', 'RabbitMQ / Kafka', 'Express.js'],
    projects: ['High-throughput RESTful API Gateway', 'Real-time Event Streaming Pipeline', 'Database Query Optimization Suite'],
    certs: ['AWS Certified Solutions Architect', 'MongoDB Certified Developer']
  },
  'Full Stack Developer': {
    tech: ['Next.js', 'TypeScript', 'Node.js', 'TailwindCSS', 'GraphQL', 'AWS (S3/Amplify)'],
    projects: ['SaaS Dashboard with Stripe Integration', 'Real-time collaborative workspace app', 'PWA Offline-first Application'],
    certs: ['AWS Certified Developer', 'Meta Front-End Developer Certificate']
  },
  'Data Scientist': {
    tech: ['PyTorch / TensorFlow', 'Pandas', 'Scikit-learn', 'SQL', 'Tableau / PowerBI', 'Apache Spark'],
    projects: ['Predictive Sales Forecasting Model', 'Customer Segmentation Engine', 'A/B Testing Analytics Platform'],
    certs: ['Google Professional Data Engineer', 'TensorFlow Developer Certificate']
  },
  'AI Engineer': {
    tech: ['LangChain / LlamaIndex', 'Vector Databases (Pinecone/Chroma)', 'HuggingFace', 'PyTorch', 'LLM Fine-Tuning'],
    projects: ['Retrieval-Augmented Generation (RAG) Chatbot', 'Fine-tuned LLM for Sentiment Analysis', 'Computer Vision Object Tracking App'],
    certs: ['AWS Certified Machine Learning - Specialty', 'DeepLearning.AI TensorFlow Developer']
  }
};

/**
 * Executes the full evaluation of parsed resume against analyzed JD.
 */
export function evaluateResume(resume, jd, targetRole) {
  // 1. Skill Match Score (30%)
  const skillAnalysis = matchSkills(resume.skills, jd.skills);
  const skillScore = Math.round(skillAnalysis.score * 100);

  // 2. Experience Match Score (20%)
  let yearsScore = 0;
  if (resume.experienceYears >= jd.experienceRequired) {
    yearsScore = 100;
  } else if (resume.experienceYears > 0) {
    yearsScore = (resume.experienceYears / jd.experienceRequired) * 100;
  } else {
    yearsScore = 20; // baseline if there's text but no explicit years matched
  }

  // Combine years check with experience text semantic similarity
  const experienceText = resume.sections.experience || resume.rawText;
  const jdResponsibilitiesText = jd.responsibilities.join(' ') || '';
  const semanticExpSimilarity = calculateCosineSimilarity(experienceText, jdResponsibilitiesText);
  
  // Experience Score is 70% years criteria and 30% responsibilities text similarity
  const experienceScore = Math.round((yearsScore * 0.7) + (semanticExpSimilarity * 100 * 0.3));

  // 3. Education Match Score (10%)
  let educationScore = 100;
  if (jd.degreesRequired.length > 0) {
    const jdMax = getMaxDegreeValue(jd.degreesRequired);
    const resumeMax = resume.education.length > 0 ? getMaxDegreeValue(resume.education) : 0;
    
    if (resumeMax === 0 && resume.sections.education.length > 0) {
      educationScore = 70; // education section exists but no clear degree name parsed
    } else if (resumeMax >= jdMax) {
      educationScore = 100;
    } else {
      educationScore = Math.round((resumeMax / jdMax) * 100);
    }
  }

  // 4. Keyword Optimization Score (15%)
  const keywordAnalysis = matchKeywords(resume.rawText, jd.keywords);
  const keywordScore = Math.round(keywordAnalysis.score * 100);

  // 5. Project Relevance Score (10%)
  // Similarity between projects section (or raw text) and JD requirements
  const projectText = resume.sections.projects || resume.rawText;
  const projectSimilarity = calculateCosineSimilarity(projectText, jdResponsibilitiesText);
  let projectScore = Math.round(projectSimilarity * 100);
  
  // Apply a minimum baseline of 40 if projects section was parsed but similarity is low
  if (resume.sections.projects && projectScore < 40) {
    projectScore = Math.round(40 + (projectScore * 0.6));
  } else if (!resume.sections.projects) {
    projectScore = Math.max(30, projectScore); // lower baseline if projects section is entirely missing
  }

  // 6. Resume Structure Score (10%)
  let structureScore = 100;
  const structureIssues = [];

  if (!resume.contact.email) {
    structureScore -= 15;
    structureIssues.push('Missing contact email address.');
  }
  if (!resume.contact.phone) {
    structureScore -= 10;
    structureIssues.push('Missing contact phone number.');
  }
  if (resume.layoutIssues && resume.layoutIssues.length > 0) {
    structureScore -= 15;
    structureIssues.push(...resume.layoutIssues);
  }
  if (!resume.sections.skills) {
    structureScore -= 15;
    structureIssues.push('No dedicated skills section detected.');
  }
  if (!resume.sections.experience) {
    structureScore -= 15;
    structureIssues.push('No dedicated work experience section detected.');
  }
  if (!resume.sections.education) {
    structureScore -= 10;
    structureIssues.push('No dedicated education section detected.');
  }
  if (!resume.sections.projects) {
    structureScore -= 10;
    structureIssues.push('No dedicated projects section detected.');
  }
  
  // Word count check
  const wordCount = resume.rawText.split(/\s+/).length;
  if (wordCount < 200) {
    structureScore -= 15;
    structureIssues.push(`Resume content is very brief (${wordCount} words). Expand detail.`);
  } else if (wordCount > 1500) {
    structureScore -= 10;
    structureIssues.push(`Resume is very long (${wordCount} words). Keep under 2-3 pages.`);
  }

  structureScore = Math.max(30, structureScore);

  // 7. Certifications Score (5%)
  let certScore = 100;
  if (jd.certificationsRequired && jd.certificationsRequired.length > 0) {
    const matchedCerts = [];
    for (const reqCert of jd.certificationsRequired) {
      if (resume.certifications.some(c => c.toLowerCase().includes(reqCert.toLowerCase()))) {
        matchedCerts.push(reqCert);
      }
    }
    certScore = Math.round((matchedCerts.length / jd.certificationsRequired.length) * 100);
  } else {
    // If none required by JD, check if candidate has any certifications to award bonus
    certScore = resume.certifications.length > 0 ? 100 : 80;
  }

  // Compute overall weighted score
  const overallScore = Math.round(
    (skillScore * 0.30) +
    (experienceScore * 0.20) +
    (educationScore * 0.10) +
    (keywordScore * 0.15) +
    (projectScore * 0.10) +
    (structureScore * 0.10) +
    (certScore * 0.05)
  );

  // Determine readiness & probabilities
  let readiness = 'Low';
  let probability = 30;
  
  if (overallScore >= 80) {
    readiness = 'High';
    probability = Math.round(75 + (overallScore - 80) * 1.25);
  } else if (overallScore >= 60) {
    readiness = 'Medium';
    probability = Math.round(50 + (overallScore - 60) * 1.25);
  } else {
    readiness = 'Low';
    probability = Math.round(20 + (overallScore / 60) * 30);
  }
  probability = Math.min(99, Math.max(5, probability));

  // 8. Generate priority improvement recommendations
  const suggestions = {
    high: [],
    medium: [],
    low: []
  };

  // High Priority
  if (skillAnalysis.missing.length > 0) {
    suggestions.high.push(`Add required technical skills: ${skillAnalysis.missing.slice(0, 3).join(', ')}`);
  }
  if (resume.experienceYears < jd.experienceRequired) {
    suggestions.high.push(`Quantify experience. Target role requires ${jd.experienceRequired} years (found ~${resume.experienceYears} years)`);
  }
  if (!resume.sections.projects) {
    suggestions.high.push('Create a dedicated Projects section showcasing cloud, API, or engineering work');
  }

  // Medium Priority
  if (keywordAnalysis.missing.length > 0) {
    suggestions.medium.push(`Integrate missing keywords into bullet points: ${keywordAnalysis.missing.slice(0, 4).join(', ')}`);
  }
  if (keywordAnalysis.density < 0.5) {
    suggestions.medium.push('Increase keyword optimization density. Mention project tech stacks explicitly.');
  }
  if (!resume.contact.github && !resume.contact.linkedin) {
    suggestions.medium.push('Add links to professional profiles (GitHub, LinkedIn) in header.');
  }
  if (structureIssues.some(i => i.includes('Two-column'))) {
    suggestions.medium.push('Redesign layout to single-column to improve ATS scanning compatibility.');
  }

  // Low Priority
  if (educationScore < 80) {
    suggestions.low.push('Add details about relevant coursework, majors, or degrees.');
  }
  if (resume.certifications.length === 0) {
    suggestions.low.push('Earn and list professional certifications (e.g. AWS, Scrum Master).');
  }
  if (wordCount > 1500) {
    suggestions.low.push('Shorten descriptions of older roles to keep resume concise.');
  } else if (wordCount < 300) {
    suggestions.low.push('Expand professional summary and project descriptions with metrics.');
  }

  // Fallbacks in case suggestions are empty
  if (suggestions.high.length === 0) suggestions.high.push('Tailor achievements to reflect JD requirements.');
  if (suggestions.medium.length === 0) suggestions.medium.push('Ensure formatting is perfectly aligned.');
  if (suggestions.low.length === 0) suggestions.low.push('Double check font sizes and margins for print.');

  // 9. Keyword Optimization placement suggestions
  const keywordDensityList = jd.keywords.map(kw => {
    const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const count = (resume.rawText.match(regex) || []).length;
    return {
      keyword: kw,
      count,
      status: count > 0 ? 'Optimal' : 'Missing',
      suggestion: count > 0 
        ? `Maintain current usage.` 
        : `Integrate '${kw}' in professional summary or experience bullet points.`
    };
  });

  // Suggest bullet point enhancements and summaries
  const missingSkillsUpper = skillAnalysis.missing.map(s => s.toUpperCase());
  const sampleBulletPoints = [
    `Developed and deployed scalable microservices using **${skillAnalysis.missing[0] || 'Docker'}** and **${skillAnalysis.missing[1] || 'Kubernetes'}**, improving deploy times by 30%.`,
    `Integrated secure **${skillAnalysis.missing[2] || 'RESTful APIs'}** with Redis caching layer, reducing latency by 40%.`,
    `Designed CI/CD automation pipelines using GitHub Actions to deploy containerized services onto AWS.`
  ];
  
  const suggestedSummary = `Innovative professional with experience delivering high-impact software solutions. Proficient in designing robust architectures using ${resume.skills.slice(0, 5).join(', ')}${skillAnalysis.missing.length > 0 ? ', with strong capability to learn ' + skillAnalysis.missing.slice(0, 3).join(', ') : ''}. Proven track record of optimizing system performance and collaborating in Agile teams.`;

  // 10. Role-based learning tracks
  const roleTrack = ROLE_PRESETS[targetRole] || ROLE_PRESETS['Software Engineer'];

  return {
    overallScore,
    experienceYears: resume.experienceYears,
    scoreBreakdown: {
      skillScore,
      experienceScore,
      educationScore,
      keywordScore,
      projectScore,
      structureScore,
      certScore
    },
    hiringReadiness: readiness,
    interviewProbability: probability,
    missingSkills: skillAnalysis.missing,
    missingKeywords: keywordAnalysis.missing.slice(0, 8),
    suggestions,
    keywordOptimization: {
      density: keywordAnalysis.density,
      densityList: keywordDensityList,
      sampleBullets: sampleBulletPoints,
      suggestedSummary
    },
    formattingAnalysis: {
      compatibilityScore: Math.round(structureScore),
      issues: structureIssues
    },
    roleRecommendations: {
      role: targetRole,
      ...roleTrack
    }
  };
}
