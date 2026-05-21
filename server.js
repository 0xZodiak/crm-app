// server.js — Highly Secure & Performant Express backend for CRM (Production Ready)
import express from 'express';
import cors    from 'cors';
import fs      from 'fs';
import path    from 'path';
import { fileURLToPath } from 'url';
import admin   from 'firebase-admin';
import helmet  from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Firebase Admin SDK Initialization ────────────────────────────────────────
if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    credential = admin.credential.cert(JSON.parse(json));
    console.log('✅ Firebase Admin: using env base64 credential');
  } else if (fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))) {
    credential = admin.credential.cert(path.join(__dirname, 'serviceAccountKey.json'));
    console.log('✅ Firebase Admin: using local serviceAccountKey.json');
  } else {
    credential = admin.credential.applicationDefault();
    console.log('⚠️  Firebase Admin: using applicationDefault');
  }

  admin.initializeApp({ credential });
}

const db  = admin.firestore();
const app = express();

// ─── Security Middlewares (Production Grade) ──────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseapp.com"],
      frameSrc: ["'self'", "https://*.firebaseapp.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    }
  }
}));

// Rate Limiting to prevent brute-force attacks and DDoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', apiLimiter);

// CORS configuration - strict origin checks
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({ 
  origin: allowedOrigins.length ? allowedOrigins : (origin, callback) => {
    // In local development, permit request if allowedOrigins is empty
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// ─── Authentication Middleware (Firebase ID Token) ──────────────────────────
const verifyFirebaseToken = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.split('Bearer ')[1];
    // Fallback for SSE connection where setting Authorization header can be difficult
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('Auth verification error:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

// ─── Authorization / Role-Based Access Control (RBAC) Middleware ──────────────
const verifyRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'Forbidden: User profile does not exist' });
      }

      const userData = userDoc.data();
      if (!allowedRoles.includes(userData.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      }

      req.user.role = userData.role;
      req.user.profile = userData;
      next();
    } catch (err) {
      console.error('RBAC error:', err.message);
      return res.status(500).json({ error: 'Internal server authorization error' });
    }
  };
};

// ─── SSE client set ─────────────────────────────────────────────────────────────
const sseClients = new Set();

// ─── GET /api/customers (Protected: All authenticated roles) ───────────────────
app.get('/api/customers', verifyFirebaseToken, async (req, res) => {
  try {
    const status = req.query.status;
    
    // Simple validation of status parameter
    if (status && !['محتمل', 'مهتم', 'مؤكد', 'عميلنا'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status parameter value' });
    }

    let query = db.collection('leads');
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // RBAC: Limit results if the requester is an Agent or Team Leader
    if (req.user.role === 'agent') {
      query = query.where('agentId', '==', req.user.uid);
    } else if (req.user.role === 'team_leader') {
      const tlDoc = await db.collection('users').doc(req.user.uid).get();
      const teamId = tlDoc.exists ? tlDoc.data().teamId : null;
      if (teamId) {
        query = query.where('teamId', '==', teamId);
      } else {
        query = query.where('agentId', '==', req.user.uid); // fallback
      }
    }

    const snapshot = await query.get();
    res.json(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error('GET /api/customers error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── POST /api/customers/:id/reminder-sent (Protected: Admin or TL/Agent assigned) ───
app.post('/api/customers/:id/reminder-sent', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent directory traversal or invalid format IDs
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const leadRef = db.collection('leads').doc(id);
    const leadDoc = await leadRef.get();

    if (!leadDoc.exists) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const leadData = leadDoc.data();

    // Enforce data ownership / RBAC checks
    if (req.user.role === 'agent' && leadData.agentId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this lead' });
    } else if (req.user.role === 'team_leader') {
      const tlDoc = await db.collection('users').doc(req.user.uid).get();
      const teamId = tlDoc.exists ? tlDoc.data().teamId : null;
      if (leadData.teamId !== teamId) {
        return res.status(403).json({ error: 'Forbidden: Lead is not in your team' });
      }
    }

    await leadRef.update({
      reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, id });
  } catch (err) {
    console.error('POST /api/customers/:id/reminder-sent error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── GET /api/customers/stream (SSE) (Protected: Active EventSource Auth) ───────────
app.get('/api/customers/stream', verifyFirebaseToken, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // Track roles on client connections for secure broadcasting
  res.user = req.user;
  sseClients.add(res);

  req.on('close', () => sseClients.delete(res));
});

// Firestore listener broadcasting securely to authenticated SSE clients
db.collection('leads').onSnapshot(
  (snapshot) => {
    snapshot.docChanges().forEach(change => {
      const docData = change.doc.data();
      const leadPayload = { id: change.doc.id, ...docData };
      const msgObject = { type: change.type, customer: leadPayload };

      sseClients.forEach(client => {
        try {
          // Secure broadcasting: filter real-time messages by user permissions/roles
          if (client.user.role === 'admin') {
            client.write(`data: ${JSON.stringify(msgObject)}\n\n`);
          } else if (client.user.role === 'team_leader' && docData.teamId === client.user.profile?.teamId) {
            client.write(`data: ${JSON.stringify(msgObject)}\n\n`);
          } else if (client.user.role === 'agent' && docData.agentId === client.user.uid) {
            client.write(`data: ${JSON.stringify(msgObject)}\n\n`);
          }
        } catch (writeErr) {
          console.error('SSE client broadcast error:', writeErr.message);
        }
      });
    });
  },
  err => console.error('Firestore listener error:', err),
);

// ─── POST /api/backup (Protected: Admin Only, secure backend-driven backup) ─────────
app.post('/api/backup', verifyFirebaseToken, verifyRole(['admin']), async (req, res) => {
  try {
    const backupDir  = path.join(__dirname, 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backend-driven database retrieval: queries Firestore directly via Admin SDK
    const leadsSnap = await db.collection('leads').get();
    const tripsSnap = await db.collection('trips').get();

    const leads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const trips = tripsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const dateStr    = new Date().toISOString().replace(/:/g, '-');
    const backupFile = path.join(backupDir, `backup-${dateStr}.json`);
    
    const content = JSON.stringify({
      version: 'v1_backend_secure',
      createdAt: new Date().toISOString(),
      leadsCount: leads.length,
      tripsCount: trips.length,
      leads,
      trips
    }, null, 2);

    fs.writeFileSync(backupFile, content, 'utf-8');
    console.log(`✅ Secure Backend Backup completed successfully: ${backupFile}`);

    res.json({ 
      success: true, 
      file: path.basename(backupFile), 
      count: { leads: leads.length, trips: trips.length } 
    });
  } catch (err) {
    console.error('Secure Backup failed:', err);
    res.status(500).json({ error: 'Failed to create backup: ' + err.message });
  }
});

// ─── Global Error Handling Middleware ─────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled server exception:', err);
  res.status(500).json({ error: 'An unexpected error occurred on the server' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Secure API server running on http://localhost:${PORT}`));
