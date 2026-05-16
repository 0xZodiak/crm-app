import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const auth = admin.auth();
const db   = admin.firestore();

async function clear() {
  console.log('🗑️ جاري حذف المستخدمين القدامى...');
  
  // 1. Delete all users from Auth
  const listUsersResult = await auth.listUsers(1000);
  const uids = listUsersResult.users.map(u => u.uid);
  if (uids.length > 0) {
    await auth.deleteUsers(uids);
    console.log(`✅ تم حذف ${uids.length} مستخدم من Authentication`);
  }

  // 2. Delete all users from Firestore
  const usersSnap = await db.collection('users').get();
  const batch = db.batch();
  usersSnap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`✅ تم حذف ${usersSnap.size} مستند من Firestore collection users`);
  
  process.exit(0);
}

clear().catch(err => { console.error(err); process.exit(1); });
