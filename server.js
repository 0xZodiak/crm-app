// server.js - Simple Express backend for CRM API

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── SSE clients list ───────────────────────────
const sseClients = new Set();

// ─── GET /api/customers ─────────────────────────
app.get('/api/customers', async (req, res) => {
  try {
    const status = req.query.status;
    let query = db.collection('customers');
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.get();
    const customers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── POST /api/customers/:id/reminder-sent ───────
app.post('/api/customers/:id/reminder-sent', async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection('customers').doc(id).update({
      reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── GET /api/customers/stream (SSE) ────────────
app.get('/api/customers/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ─── Firestore Real-time Listener ───────────────
db.collection('customers').onSnapshot(
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const payload = {
        type: change.type,
        customer: {
          id: change.doc.id,
          ...change.doc.data(),
        },
      };
      const msg = `data: ${JSON.stringify(payload)}\n\n`;
      sseClients.forEach((client) => client.write(msg));
    });
  },
  (err) => {
    console.error('Firestore listener error:', err);
  },
);

// ─── POST /api/backup (Automated Local Backups) ───
app.post('/api/backup', (req, res) => {
  try {
    const backupData = req.body;
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Create directory if not exists
    const backupDir = path.join(__dirname, 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Save backup as .sql as requested by user, with JSON embedded
    const backupFile = path.join(backupDir, `backup-${dateStr}.sql`);
    
    const fileContent = `-- CRM Automated Backup\n-- Date: ${dateStr}\n\n/* JSON_DATA_START\n${JSON.stringify(backupData, null, 2)}\nJSON_DATA_END */\n`;

    fs.writeFileSync(backupFile, fileContent, 'utf-8');
    
    console.log(`✅ Backup saved successfully at ${backupFile}`);
    res.json({ success: true, file: backupFile });
  } catch (err) {
    console.error('Backup failed:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});
