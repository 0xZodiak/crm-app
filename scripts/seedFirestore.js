/**
 * seedFirestore.js — شغّل مرة واحدة فقط لإنشاء الـ users في Firebase Auth + Firestore
 *
 * الاستخدام:
 *   1. حط serviceAccountKey.json في root المشروع
 *   2. node scripts/seedFirestore.js
 */
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

// ─── تعريف الـ users ───────────────────────────────────────────────────────
const USERS = [
  // Admins
  { username: 'sharif',     password: 'ChangeMe!@1', name: 'الحج شريف',   role: 'admin',       email: 'sharif@crm.com' },
  { username: 'hazem',      password: 'ChangeMe!@2', name: 'حازم',         role: 'admin',       email: 'hazem@crm.com' },
  { username: 'abdelazim',  password: 'ChangeMe!@3', name: 'عبد العظيم',  role: 'admin',       email: 'abdelazim@crm.com' },
  // Team Leaders
  { username: 'hamza',      password: 'ChangeMe!@4', name: 'حمزة أحمد',   role: 'team_leader', email: 'hamza@crm.com',  teamId: 'team1' },
  { username: 'sara',       password: 'ChangeMe!@5', name: 'سارة ممدوح',  role: 'team_leader', email: 'sara@crm.com',   teamId: 'team1' },
  // Agents
  { username: 'karim',      password: 'ChangeMe!@6', name: 'كريم',         role: 'agent',       email: 'karim@crm.com',  teamId: 'team1', teamLeaderId: 'hamza' },
  { username: 'inas',       password: 'ChangeMe!@7', name: 'إيناس',        role: 'agent',       email: 'inas@crm.com',   teamId: 'team1', teamLeaderId: 'hamza' },
  { username: 'hind',       password: 'ChangeMe!@8', name: 'هند',          role: 'agent',       email: 'hind@crm.com',   teamId: 'team1', teamLeaderId: 'hamza' },
  { username: 'mhmd',       password: 'ChangeMe!@9', name: 'محمد',         role: 'agent',       email: 'mhmd@crm.com',   teamId: 'team1', teamLeaderId: 'hamza' },
  { username: 'mai',        password: 'ChangeMe!10', name: 'مي',           role: 'agent',       email: 'mai@crm.com',    teamId: 'team1', teamLeaderId: 'sara' },
  { username: 'mona',       password: 'ChangeMe!11', name: 'منه',          role: 'agent',       email: 'mona@crm.com',   teamId: 'team1', teamLeaderId: 'sara' },
];

// ─── الـ seeding ───────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 بدء الـ seeding...\n');

  // أنشئ map من username → uid لربط الـ teamLeaderId
  const uidMap = {};

  for (const user of USERS) {
    try {
      // إنشاء في Firebase Auth
      const authUser = await auth.createUser({
        email:         user.email,
        password:      user.password,
        displayName:   user.name,
      });

      uidMap[user.username] = authUser.uid;

      // حفظ البيانات في Firestore (بدون password)
      const { password: _, ...userData } = user;
      await db.collection('users').doc(authUser.uid).set({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ ${user.name} (${user.role}) — ${authUser.uid}`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        console.log(`⚠️  ${user.email} موجود بالفعل — skip`);
      } else {
        console.error(`❌ ${user.name}:`, err.message);
      }
    }
  }

  // بعد ما اتعملوا كلهم، حدّث الـ teamLeaderId ليكون uid حقيقي مش username
  console.log('\n🔗 ربط الـ teamLeaderIds...');
  for (const user of USERS) {
    if (user.teamLeaderId && uidMap[user.teamLeaderId] && uidMap[user.username]) {
      await db.collection('users').doc(uidMap[user.username]).update({
        teamLeaderId: uidMap[user.teamLeaderId],
      });
      console.log(`  ${user.name} → teamLeader: ${user.teamLeaderId}`);
    }
  }

  console.log('\n✅ خلصنا! غيّر الـ passwords من Firebase Console قبل production.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
