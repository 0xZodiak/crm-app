import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAyzFPYFnImc_AbZxisQ-SrDDpmoxaTfP4",
  authDomain: "al-aman-946dc.firebaseapp.com",
  projectId: "al-aman-946dc",
  storageBucket: "al-aman-946dc.firebasestorage.app",
  messagingSenderId: "1040768590146",
  appId: "1:1040768590146:web:8c41e73f1090fc5ca3a8db"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("Checking Firestore...");
  try {
    const snap = await getDocs(collection(db, 'users'));
    console.log(`Found ${snap.size} users in Firestore.`);
    snap.forEach(doc => console.log(doc.id, doc.data()));
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit();
}
check();
