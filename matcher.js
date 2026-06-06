// Stop Words list identical to parser
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

/**
 * Tokenize text and clean words (lowercase, remove punctuation, filter stop words).
 */
export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-#+.]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word) && isNaN(word));
}

/**
 * Calculates term frequency (TF) for a tokenized document.
 */
function getTF(tokens) {
  const tf = {};
  const total = tokens.length;
  if (total === 0) return tf;

  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }

  for (const token in tf) {
    tf[token] = tf[token] / total;
  }
  return tf;
}

/**
 * Calculates cosine similarity between two token vectors.
 */
export function calculateCosineSimilarity(textA, textB) {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const tfA = getTF(tokensA);
  const tfB = getTF(tokensB);

  // Get all unique terms
  const allTerms = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);

  // Simple IDF implementation relative to the two documents
  // If a term is in both, IDF is 1. If in only one, IDF is 1.5
  const idf = {};
  for (const term of allTerms) {
    let count = 0;
    if (tfA[term]) count++;
    if (tfB[term]) count++;
    idf[term] = count === 2 ? 1.0 : 1.5;
  }

  // Create weighted vectors
  const vecA = {};
  const vecB = {};
  for (const term of allTerms) {
    vecA[term] = (tfA[term] || 0) * idf[term];
    vecB[term] = (tfB[term] || 0) * idf[term];
  }

  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const term of allTerms) {
    dotProduct += vecA[term] * vecB[term];
    magA += vecA[term] * vecA[term];
    magB += vecB[term] * vecB[term];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;

  return dotProduct / (magA * magB);
}

/**
 * Performs custom scoring matches.
 */
export function matchSkills(resumeSkills, jdSkills) {
  if (jdSkills.length === 0) return { score: 1.0, matched: [], missing: [] };

  const resumeLower = new Set(resumeSkills.map(s => s.toLowerCase()));
  const matched = [];
  const missing = [];

  for (const skill of jdSkills) {
    if (resumeLower.has(skill.toLowerCase())) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const score = matched.length / jdSkills.length;
  return { score, matched, missing };
}

/**
 * Matches key terms and computes keyword optimization scores.
 */
export function matchKeywords(resumeText, jdKeywords) {
  if (jdKeywords.length === 0) return { score: 1.0, matched: [], missing: [], density: 0 };

  const resumeLower = resumeText.toLowerCase();
  const matched = [];
  const missing = [];
  let totalMatches = 0;

  for (const kw of jdKeywords) {
    const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matchCount = (resumeLower.match(regex) || []).length;

    if (matchCount > 0) {
      matched.push({ keyword: kw, count: matchCount });
      totalMatches += matchCount;
    } else {
      missing.push(kw);
    }
  }

  // Calculate density: total matched keywords divided by total words in resume
  const totalResumeWords = resumeText.split(/\s+/).length || 1;
  const density = (totalMatches / totalResumeWords) * 100;

  // Keyword Score: based on proportion of unique keywords matched
  const score = matched.length / jdKeywords.length;

  return {
    score,
    matched,
    missing,
    density: Math.round(density * 100) / 100 // e.g. 1.25%
  };
}
