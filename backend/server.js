import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Google OAuth setup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, 'users.json');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Gemini API key (new)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('⚠️ Warning: GEMINI_API_KEY is not set. Set it in .env to enable Gemini requests.');
} else {
  console.log('✓ GEMINI_API_KEY loaded successfully (length:', GEMINI_API_KEY.length, ')');
}

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    let bodyPreview = JSON.stringify(req.body);
    if (bodyPreview && bodyPreview.length > 1000) bodyPreview = bodyPreview.slice(0, 1000) + '...';
    console.log('  Body:', bodyPreview);
  }
  next();
});

// Serve static files from frontend folder
app.use(express.static(FRONTEND_DIR));

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/generate-test') || req.path.startsWith('/health') || req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Preflight for /generate-test
app.options('/generate-test', (req, res) => {
  console.log('[generate-test] OPTIONS preflight from', req.ip);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.sendStatus(204);
});

// ==========================
// GEMINI INTEGRATION HERE 🚀
// ==========================
app.post('/generate-test', async (req, res) => {
  try {
    const { prompt, model = 'gemini-1.5-flash', temperature = 0.2, maxOutputTokens = 2048 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt in request body' });

    console.log('[generate-test] Using model:', model);
    console.log('[generate-test] API Key present:', !!GEMINI_API_KEY);
    console.log('[generate-test] Prompt length:', prompt.length);

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server not configured with GEMINI_API_KEY' });
    }

    // Call Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens
      }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const raw = await r.text();
    console.log('[generate-test] Response status:', r.status);
    console.log('[generate-test] Response preview:', raw.substring(0, 200));

    if (!r.ok) {
      console.error('Gemini error:', r.status, raw);
      return res.status(r.status).type('application/json').send(raw);
    }

    // Extract generated text
    let extracted = '';
    try {
      const parsed = JSON.parse(raw);
      extracted = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('[generate-test] Extracted content length:', extracted.length);
    } catch (err) {
      console.error('[generate-test] JSON parse error:', err.message);
      extracted = raw;
    }

    console.log('[generate-test] Returning extracted content:', extracted.substring(0, 500));
    res.status(200).type('text/plain').send(extracted);
  } catch (err) {
    console.error('Error in /generate-test:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// USERS + AUTH (unchanged)
// ==========================
async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    const users = await readUsers();
    if (users.find(u => u.username === username)) return res.status(409).json({ error: 'User exists' });

    const user = { id: Date.now().toString(), username, password, createdAt: new Date().toISOString() };
    users.push(user);
    await saveUsers(users);

    const { password: _p, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    const users = await readUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const { password: _p, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Google auth (unchanged)
app.post('/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'No token provided' });

    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const user = {
      id: payload.sub,
      username: payload.name,
      email: payload.email,
      createdAt: new Date().toISOString(),
      provider: 'google'
    };
    res.json({ user });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/auth/google/url', (req, res) => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(
    'http://localhost:' + PORT
  )}&scope=profile email`;
  res.json({ url });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`🚀 AI proxy with Gemini running at http://localhost:${PORT}`);
  if (!GOOGLE_CLIENT_ID) {
    console.warn('⚠️ GOOGLE_CLIENT_ID is not set. Google login will not work.');
  }
});
