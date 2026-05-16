// server.js — Express backend for CRM
import express from 'express';
import cors    from 'cors';
import fs      from 'fs';
import path    from 'path';
import { fileURLToPath } from 'url';
import admin   from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Firebase Admin Init ─────────────────────────────────────────────────────
// الأولوية: FIREBASE_SERVICE_ACCOUNT_BASE64 → ملف محلي → applicationDefault
if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    // Hosting مثل Render أو Railway: احفظ الـ JSON مشفراً كـ base64 في env
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    credential = admin.credential.cert(JSON.parse(json));
    console.log('✅ Firebase Admin: using env base64 credential');
  } else if (fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))) {
    // Development محلي: ضع ملف serviceAccountKey.json في root المشروع
    credential = admin.credential.cert(path.join(__dirname, 'serviceAccountKey.json'));
    console.log('✅ Firebase Admin: using local serviceAccountKey.json');
  } else {
    // Fallback لـ Google Cloud environments (Cloud Run, etc.)
    credential = admin.credential.applicationDefault();
    console.log('⚠️  Firebase Admin: using applicationDefault — تأكد من ضبط GOOGLE_APPLICATION_CREDENTIALS');
  }

  admin.initializeApp({ credential });
}

const db  = admin.firestore();
const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));
app.use(express.json({ limit: '50mb' }));

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── SSE clients ──────────────────────────────────────────────────────────────
const sseClients = new Set();

// ─── GET /api/customers ───────────────────────────────────────────────────────
app.get('/api/customers', async (req, res) => {
  try {
    const status   = req.query.status;
    let   query    = db.collection('leads');
    if (status) query = query.where('status', '==', status);
    const snapshot = await query.get();
    res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── POST /api/customers/:id/reminder-sent ────────────────────────────────────
app.post('/api/customers/:id/reminder-sent', async (req, res) => {
  try {
    await db.collection('leads').doc(req.params.id).update({
      reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── GET /api/customers/stream (SSE) ──────────────────────────────────────────
app.get('/api/customers/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// Firestore real-time → SSE broadcast
db.collection('leads').onSnapshot(
  (snapshot) => {
    snapshot.docChanges().forEach(change => {
      const msg = `data: ${JSON.stringify({ type: change.type, customer: { id: change.doc.id, ...change.doc.data() } })}\n\n`;
      sseClients.forEach(client => client.write(msg));
    });
  },
  err => console.error('Firestore listener error:', err),
);

// ─── POST /api/backup ─────────────────────────────────────────────────────────
app.post('/api/backup', verifyFirebaseToken, (req, res) => {
  try {
    const backupDir  = path.join(__dirname, 'data', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const dateStr    = new Date().toISOString().split('T')[0];
    const backupFile = path.join(backupDir, `backup-${dateStr}.json`);
    const content    = JSON.stringify(req.body, null, 2);

    fs.writeFileSync(backupFile, content, 'utf-8');
    console.log(`✅ Backup saved: ${backupFile}`);
    res.json({ success: true, file: backupFile });
  } catch (err) {
    console.error('Backup failed:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 API server on http://localhost:${PORT}`));
