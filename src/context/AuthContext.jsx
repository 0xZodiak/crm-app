import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
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

  const updateProfileData = async (newName, newPassword, oldPassword) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('مستخدم غير مسجل الدخول');

      // 1. إذا كان يريد تغيير كلمة المرور، يجب إعادة التحقق من كلمة المرور القديمة أولاً
      if (newPassword && newPassword.trim() !== '') {
        if (!oldPassword) {
          throw new Error('يرجى إدخال كلمة المرور القديمة أولاً لتأكيد هويتك');
        }
        
        try {
          const credential = EmailAuthProvider.credential(user.email, oldPassword);
          await reauthenticateWithCredential(user, credential);
        } catch (authErr) {
          console.error(authErr);
          if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
            throw new Error('كلمة المرور القديمة غير صحيحة', { cause: authErr });
          }
          throw new Error('فشل التحقق من كلمة المرور القديمة، يرجى المحاولة مرة أخرى', { cause: authErr });
        }
      }

      // 2. تحديث الاسم في Firestore (لا يتم تخزين كلمة المرور في قاعدة البيانات نهائياً من أجل الأمان!)
      const updateData = {};
      if (newName && newName.trim() !== currentUser.name) {
        updateData.name = newName.trim();
      }

      if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(db, 'users', user.uid), updateData);
        setCurrentUser(prev => prev ? { ...prev, ...updateData } : null);
      }

      // 3. تحديث كلمة المرور بشكل آمن في Firebase Auth فقط
      if (newPassword && newPassword.trim() !== '') {
        await updatePassword(user, newPassword.trim());
      }

      return { success: true };
    } catch (err) {
      console.error(err);
      let msg = 'حدث خطأ أثناء التحديث';
      if (err.code === 'auth/requires-recent-login') {
        msg = 'لتغيير كلمة المرور، يرجى تسجيل الخروج والدخول مجدداً ثم المحاولة مرة أخرى.';
      } else if (err.message) {
        msg = err.message;
      }
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updateProfileData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
