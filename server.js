import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { parseResume, parseJobDescription, extractText } from './parser.js';
import { evaluateResume } from './scoring.js';

// Setup file paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCANS_FILE = path.join(__dirname, 'scans.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper functions for reading/writing history
async function getHistory() {
  try {
    if (!fs.existsSync(SCANS_FILE)) {
      return [];
    }
    const data = await fs.promises.readFile(SCANS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading history file:', err);
    return [];
  }
}

async function saveToHistory(scan) {
  try {
    const history = await getHistory();
    history.unshift(scan); // Put latest scan first
    await fs.promises.writeFile(SCANS_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving to history file:', err);
  }
}

/**
 * Route: Analyze Resume & Job Description
 */
app.post('/api/analyze', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'jdFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const resumeFile = req.files?.resume?.[0];
    const jdFile = req.files?.jdFile?.[0];
    const jdText = req.body.jdText || '';
    const targetRole = req.body.targetRole || 'Software Engineer';

    if (!resumeFile) {
      return res.status(400).json({ error: 'Resume file is required.' });
    }

    // 1. Extract Resume Text
    const resumeBuffer = await fs.promises.readFile(resumeFile.path);
    const parsedResume = await parseResume(resumeBuffer, resumeFile.mimetype, resumeFile.originalname);

    // 2. Extract Job Description Text
    let jobDescriptionText = jdText;
    if (jdFile) {
      const jdBuffer = await fs.promises.readFile(jdFile.path);
      jobDescriptionText = await extractText(jdBuffer, jdFile.mimetype, jdFile.originalname);
    }

    if (!jobDescriptionText || jobDescriptionText.trim().length === 0) {
      return res.status(400).json({ error: 'Job description text or file is required.' });
    }

    // 3. Analyze Job Description
    const parsedJD = parseJobDescription(jobDescriptionText);

    // 4. Run Evaluation scoring engine
    const evaluation = evaluateResume(parsedResume, parsedJD, targetRole);

    // Clean up uploaded files asynchronously
    fs.unlink(resumeFile.path, () => {});
    if (jdFile) {
      fs.unlink(jdFile.path, () => {});
    }

    // 5. Build Result Object
    const scanResult = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString(),
      resumeName: resumeFile.originalname,
      targetRole,
      ...evaluation
    };

    // 6. Save scan to history database
    await saveToHistory(scanResult);

    return res.json(scanResult);
  } catch (err) {
    console.error('Analysis Error:', err);
    return res.status(500).json({ error: `Server failed during processing: ${err.message}` });
  }
});

/**
 * Route: Get Scan History
 */
app.get('/api/history', async (req, res) => {
  const history = await getHistory();
  return res.json(history);
});

/**
 * Route: Delete Scan History item
 */
app.delete('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let history = await getHistory();
    history = history.filter(item => item.id !== id);
    await fs.promises.writeFile(SCANS_FILE, JSON.stringify(history, null, 2), 'utf8');
    return res.json({ success: true, message: 'Scan deleted.' });
  } catch (err) {
    return res.status(500).json({ error: `Failed to delete: ${err.message}` });
  }
});

/**
 * Route: Clear all Scan History
 */
app.post('/api/history/clear', async (req, res) => {
  try {
    await fs.promises.writeFile(SCANS_FILE, '[]', 'utf8');
    return res.json({ success: true, message: 'All scan history cleared.' });
  } catch (err) {
    return res.status(500).json({ error: `Failed to clear history: ${err.message}` });
  }
});

// Fallback to index.html for single-page app behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`ATS Engine running on: http://localhost:${PORT}`);
});
