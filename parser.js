import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Standard Stop Words for NLP extraction
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
  'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
  'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in',
  'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll',
  'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we',
  'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while',
  'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve',
  'your', 'yours', 'yourself', 'yourselves'
]);

// Common technical skills library to aid parsing
const COMMON_SKILLS = [
  // Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'golang', 'rust', 'swift', 'kotlin', 'php', 'sql', 'html', 'css', 'sass', 'bash', 'shell', 'r', 'scala',
  // Frameworks/Libraries
  'react', 'next.js', 'nextjs', 'vue', 'angular', 'svelte', 'express', 'node', 'nodejs', 'django', 'flask', 'fastapi', 'spring boot', 'spring', 'rails', 'laravel', 'asp.net', 'net core', 'jquery', 'bootstrap', 'tailwind', 'redux', 'graphql',
  // Cloud/DevOps
  'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'jenkins', 'ci/cd', 'github actions', 'terraform', 'ansible', 'linux', 'unix', 'nginx', 'apache', 'prometheus', 'grafana',
  // Databases/Caching
  'mongodb', 'postgresql', 'postgres', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'cassandra', 'dynamodb', 'firebase', 'oracle', 'mssql',
  // Concepts/Tools
  'git', 'github', 'gitlab', 'jira', 'agile', 'scrum', 'rest api', 'restful api', 'microservices', 'soap', 'grpc', 'web sockets', 'graphql', 'oauth', 'jwt', 'ci', 'cd', 'testing', 'jest', 'cypress', 'mocha', 'selenium',
  // AI/Data Science
  'machine learning', 'ml', 'deep learning', 'nlp', 'natural language processing', 'ai', 'artificial intelligence', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'opencv', 'tableau', 'powerbi', 'spark', 'hadoop'
];

// Month parsing map
const MONTH_MAP = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
};

/**
 * Extracts raw text from file buffer based on MIME type or extension.
 */
export async function extractText(fileBuffer, mimeType, filename = '') {
  const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filename.endsWith('.docx');
  const isPdf = mimeType === 'application/pdf' || filename.endsWith('.pdf');

  if (isPdf) {
    const data = await pdfParse(fileBuffer);
    return data.text;
  } else if (isDocx) {
    const data = await mammoth.extractRawText({ buffer: fileBuffer });
    return data.value;
  } else {
    // Treat as plain text
    return fileBuffer.toString('utf8');
  }
}

/**
 * Helper to segment text into sections based on structural headings.
 */
export function segmentSections(text) {
  const lines = text.split('\n').map(l => l.trim());
  const sections = {
    contact: [],
    skills: [],
    education: [],
    certifications: [],
    projects: [],
    experience: [],
    achievements: [],
    unknown: []
  };

  const headers = {
    experience: [/experience/i, /employment/i, /history/i, /work/i, /career/i, /jobs/i],
    skills: [/skills/i, /abilities/i, /technologies/i, /competencies/i, /expertise/i, /tools/i],
    education: [/education/i, /academic/i, /degrees/i, /study/i],
    projects: [/projects/i, /portfolio/i, /ventures/i],
    certifications: [/certifications/i, /certificates/i, /courses/i, /training/i],
    achievements: [/achievements/i, /awards/i, /honors/i, /publications/i]
  };

  let currentSection = 'contact'; // Start in contact info section at top of page

  for (const line of lines) {
    if (!line) continue;

    // Check if line is a header candidate
    // Usually headers are short (< 50 chars) and contain section trigger words
    let foundHeader = false;
    if (line.length < 50) {
      for (const [key, patterns] of Object.entries(headers)) {
        if (patterns.some(p => p.test(line))) {
          currentSection = key;
          foundHeader = true;
          break;
        }
      }
    }

    if (foundHeader) continue;

    sections[currentSection].push(line);
  }

  // Combine arrays into full strings
  const parsed = {};
  for (const [key, linesArray] of Object.entries(sections)) {
    parsed[key] = linesArray.join('\n');
  }
  return parsed;
}

/**
 * Extracts contact details using Regex patterns.
 */
export function extractContactInfo(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const githubRegex = /github\.com\/[a-zA-Z0-9-_]+/gi;
  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-_]+/gi;

  const emails = text.match(emailRegex) || [];
  const phones = text.match(phoneRegex) || [];
  const githubs = text.match(githubRegex) || [];
  const linkedins = text.match(linkedinRegex) || [];

  return {
    email: emails[0] || '',
    phone: phones[0] || '',
    github: githubs[0] ? `https://${githubs[0]}` : '',
    linkedin: linkedins[0] ? `https://${linkedins[0]}` : ''
  };
}

/**
 * Computes duration of work experience in years.
 */
export function parseWorkExperienceYears(experienceText) {
  if (!experienceText) return 0.5; // fallback baseline

  // Regex to match dates like "Jan 2018 - Present" or "09/2015 to 12/2019" or "2018-2022"
  const dateRangeRegex = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})|(\d{1,2})\/(\d{4})|(\d{4}))\s*(?:-|to|until)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})|(\d{1,2})\/(\d{4})|(\d{4})|(present|current|now))/gi;

  let totalMonths = 0;
  let matchesCount = 0;
  let match;

  while ((match = dateRangeRegex.exec(experienceText)) !== null) {
    matchesCount++;
    // Start Date components
    let startMonth = 0;
    let startYear = null;

    if (match[1]) { // e.g. "Jan"
      startMonth = MONTH_MAP[match[1].toLowerCase()] || 0;
      startYear = parseInt(match[2]);
    } else if (match[3]) { // e.g. "09"
      startMonth = parseInt(match[3]) - 1;
      startYear = parseInt(match[4]);
    } else if (match[5]) { // e.g. "2018"
      startMonth = 0;
      startYear = parseInt(match[5]);
    }

    // End Date components
    let endMonth = 0;
    let endYear = null;
    let isPresent = false;

    if (match[6]) { // e.g. "Dec"
      endMonth = MONTH_MAP[match[6].toLowerCase()] || 0;
      endYear = parseInt(match[7]);
    } else if (match[8]) { // e.g. "12"
      endMonth = parseInt(match[8]) - 1;
      endYear = parseInt(match[9]);
    } else if (match[10]) { // e.g. "2022"
      endMonth = 0;
      endYear = parseInt(match[10]);
    } else if (match[11]) { // e.g. "present"
      isPresent = true;
    }

    if (startYear) {
      let endDate;
      if (isPresent) {
        endDate = new Date();
      } else if (endYear) {
        endDate = new Date(endYear, endMonth, 1);
      } else {
        // Single date instead of range (e.g. just a year), assume 1 year duration
        totalMonths += 12;
        continue;
      }

      const startDate = new Date(startYear, startMonth, 1);
      const diffMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
      if (diffMonths > 0) {
        totalMonths += diffMonths;
      } else {
        totalMonths += 3; // minimal duration for typo ranges
      }
    }
  }

  // If no date ranges matched but text exists, inspect line count or assign estimated baseline
  if (totalMonths === 0) {
    const yearsMatch = experienceText.match(/(\d+)\+?\s*years?/i);
    if (yearsMatch) {
      return parseFloat(yearsMatch[1]);
    }
    // Estimate based on structure: count lines in experience section
    const lines = experienceText.split('\n').length;
    if (lines > 15) return 4;
    if (lines > 8) return 2;
    return 1;
  }

  return Math.round((totalMonths / 12) * 10) / 10; // return rounded years (e.g. 3.5)
}

/**
 * Extracts skills by scanning text against COMMON_SKILLS and extracting custom n-grams.
 */
export function extractSkills(text) {
  const normalizedText = text.toLowerCase();
  const foundSkills = new Set();

  // Match common technical skills
  for (const skill of COMMON_SKILLS) {
    // Escape regex characters
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Ensure word boundaries. Support edge cases like .js, C++, C#
    let regexStr = `\\b${escaped}\\b`;
    if (skill.endsWith('.js')) {
      regexStr = `\\b${escaped}`;
    } else if (skill.includes('+') || skill.includes('#')) {
      regexStr = `\\b${escaped}`;
    }
    
    const regex = new RegExp(regexStr, 'gi');
    if (regex.test(normalizedText)) {
      foundSkills.add(skill);
    }
  }

  // Capitalize properly for display
  return Array.from(foundSkills).map(skill => {
    // Map of specific capitalization
    const capMap = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'java': 'Java',
      'c++': 'C++',
      'c#': 'C#',
      'sql': 'SQL',
      'html': 'HTML',
      'css': 'CSS',
      'sass': 'SASS',
      'next.js': 'Next.js',
      'nextjs': 'Next.js',
      'react': 'React',
      'vue': 'Vue',
      'angular': 'Angular',
      'svelte': 'Svelte',
      'node': 'Node.js',
      'nodejs': 'Node.js',
      'aws': 'AWS',
      'gcp': 'GCP',
      'ci/cd': 'CI/CD',
      'rest api': 'REST API',
      'restful api': 'RESTful API',
      'mongodb': 'MongoDB',
      'postgresql': 'PostgreSQL',
      'postgres': 'PostgreSQL',
      'mysql': 'MySQL',
      'sqlite': 'SQLite',
      'k8s': 'Kubernetes',
      'kubernetes': 'Kubernetes',
      'docker': 'Docker',
      'github': 'GitHub',
      'github actions': 'GitHub Actions',
      'gitlab': 'GitLab',
      'jira': 'Jira',
      'microservices': 'Microservices',
      'graphql': 'GraphQL'
    };
    return capMap[skill] || skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  });
}

/**
 * Extracts credentials (education, degrees, certifications)
 */
export function extractEducationAndCerts(text) {
  const normalized = text.toLowerCase();
  const degrees = [];
  const certs = [];

  const degreePatterns = [
    { name: 'Bachelor of Science (B.S.)', regex: /\bb\.?\s*s\.?\b|\bbachelor\b/i },
    { name: 'Master of Science (M.S.)', regex: /\bm\.?\s*s\.?\b|\bmaster\b/i },
    { name: 'Ph.D.', regex: /\bph\.?d\.?\b|\bdoctorate\b/i },
    { name: 'Associate Degree', regex: /\bassociate\b/i }
  ];

  for (const dp of degreePatterns) {
    if (dp.regex.test(normalized)) {
      degrees.push(dp.name);
    }
  }

  // Common Certifications
  const certificationList = [
    'aws certified', 'solutions architect', 'certified developer', 'scrum master', 'csm', 'pmp', 'comptia',
    'ccna', 'cissp', 'gcp certified', 'azure certified', 'google cloud certified', 'oracle certified'
  ];

  for (const cert of certificationList) {
    if (normalized.includes(cert)) {
      certs.push(cert.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    }
  }

  return { degrees, certifications: certs };
}

/**
 * Parses the job description to extract target keywords, requirements, and responsibilities.
 */
export function parseJobDescription(jdText) {
  const normalized = jdText.toLowerCase();

  // Extract skills from JD
  const skills = extractSkills(jdText);

  // Experience requirement: e.g. "3+ years", "5 years of experience"
  const expRegex = /(\d+)\+?\s*(?:-|\bto\b)?\s*(\d+)?\s*years?(?:\s*of)?\s*experience/gi;
  let expRequired = 2; // default if not found
  let match = expRegex.exec(jdText);
  if (match) {
    expRequired = parseInt(match[1]);
  }

  // Degrees required
  const { degrees, certifications } = extractEducationAndCerts(jdText);

  // Extract important keywords (nouns/adjectives filtering out stop words)
  const words = normalized
    .replace(/[^\w\s-#+.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && isNaN(w));

  const keywordCounts = {};
  for (const w of words) {
    keywordCounts[w] = (keywordCounts[w] || 0) + 1;
  }

  // Get top 25 keywords as target optimization words
  const keywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(entry => entry[0]);

  // Key responsibilities detection (looking for bullet points following "responsibilities", "what you will do", etc.)
  const responsibilities = [];
  const lines = jdText.split('\n').map(l => l.trim());
  let inRespSection = false;
  for (const line of lines) {
    if (/responsibilit|what you'll do|key tasks|role outline/i.test(line)) {
      inRespSection = true;
      continue;
    }
    if (inRespSection && (line.startsWith('*') || line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line))) {
      responsibilities.push(line.replace(/^[*•\-\d+\.\s]+/, ''));
    } else if (inRespSection && line.length === 0) {
      // Allow single empty line, but if multiple, exit section
    } else if (inRespSection && line.length < 50 && /requirements|skills|qualifications/i.test(line)) {
      inRespSection = false;
    }
  }

  return {
    skills,
    experienceRequired: expRequired,
    degreesRequired: degrees.length > 0 ? degrees : ['Bachelor'],
    certificationsRequired: certifications,
    keywords,
    responsibilities: responsibilities.length > 0 ? responsibilities : [jdText.slice(0, 300)]
  };
}

/**
 * Main parse orchestrator for a resume
 */
export async function parseResume(buffer, fileType, filename = '') {
  const rawText = await extractText(buffer, fileType, filename);
  const sections = segmentSections(rawText);
  const contact = extractContactInfo(sections.contact || rawText);
  
  // Extract details
  const skills = extractSkills(rawText);
  const experienceYears = parseWorkExperienceYears(sections.experience);
  const credentials = extractEducationAndCerts(rawText);
  
  // Custom check for double-column layouts or tables (indicators: multiple consecutive short tabbed entries or line fragment counts)
  const layoutIssues = [];
  if (rawText.includes('\t\t') || rawText.includes('   ')) {
    layoutIssues.push('Two-column layout or tables detected. ATS systems prefer simple one-column lists.');
  }
  
  return {
    rawText,
    sections,
    contact,
    skills,
    experienceYears,
    education: credentials.degrees,
    certifications: credentials.certifications,
    layoutIssues
  };
}
