import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  // مراقبة حالة الـ Firebase Auth — بيشتغل تلقائياً عند فتح التطبيق
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // جيب بيانات الـ role والـ team من Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setCurrentUser({ id: firebaseUser.uid, ...userDoc.data() });
        } else {
          // يوزر موجود في Auth بس مش في Firestore — مشكلة في الـ setup
          setCurrentUser(null);
          await signOut(auth);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ─── login: username → ابحث عن الـ email في Firestore → Firebase Auth ───
  const login = async (username, password) => {
    try {
      // 1. ابحث في Firestore عن الـ username
      const q       = query(collection(db, 'users'), where('username', '==', username.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      }

      const userData = snapshot.docs[0].data();

      // 2. سجّل دخول بـ Firebase Auth
      await signInWithEmailAndPassword(auth, userData.email, password);

      // onAuthStateChanged هيتكال تلقائياً ويحدّث currentUser
      return { success: true };
    } catch (err) {
      // Firebase بترجع أكواد خطأ — نحوّلها لرسالة عربية
      const msg =
        err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
          ? 'اسم المستخدم أو كلمة المرور غير صحيحة'
          : err.code === 'auth/too-many-requests'
          ? 'تم تجاوز عدد المحاولات، حاول لاحقاً'
          : 'حدث خطأ، حاول مرة أخرى';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
