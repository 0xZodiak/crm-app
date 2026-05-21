import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfileModal.css';

export default function ProfileModal({ onClose }) {
  const { currentUser, updateProfileData } = useAuth();
  const [name, setName] = useState(currentUser?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('الاسم مطلوب');
      return;
    }

    if (password) {
      if (password.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
      }
      if (!oldPassword) {
        setError('يجب إدخال كلمة المرور القديمة لتغييرها');
        return;
      }
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    const res = await updateProfileData(name, password, oldPassword);
    setLoading(false);

    if (res.success) {
      setSuccess('تم تحديث البيانات بنجاح!');
      setPassword('');
      setConfirmPassword('');
      setOldPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn-x" onClick={onClose}>✕</button>
        
        <div className="profile-modal-header">
          <div className="profile-avatar-large">
            {currentUser?.name?.charAt(0)}
          </div>
          <h2>تعديل الملف الشخصي</h2>
          <p>تحديث الاسم التعريفي أو تغيير كلمة المرور الخاصة بك</p>
        </div>

        <form onSubmit={handleSubmit} className="profile-modal-form">
          <div className="pform-group">
            <label>الاسم التعريفي</label>
            <div className="pinput-wrapper">
              <span className="pinput-icon">👤</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك الجديد"
                required
              />
            </div>
          </div>

          <div className="pform-group">
            <label>كلمة المرور الجديدة (اتركها فارغة إذا لم ترد التغيير)</label>
            <div className="pinput-wrapper">
              <span className="pinput-icon">🔑</span>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                autoComplete="new-password"
              />
              <button 
                type="button" 
                className="pshow-pass" 
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {password && (
            <>
              <div className="pform-group">
                <label>كلمة المرور القديمة (مطلوبة لتأكيد التغيير)</label>
                <div className="pinput-wrapper">
                  <span className="pinput-icon">🔑</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                    required
                  />
                </div>
              </div>

              <div className="pform-group">
                <label>تأكيد كلمة المرور الجديدة</label>
                <div className="pinput-wrapper">
                  <span className="pinput-icon">🔒</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد كتابة كلمة المرور"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {error && <div className="profile-error">{error}</div>}
          {success && <div className="profile-success">{success}</div>}

          <div className="profile-modal-actions">
            <button 
              type="button" 
              className="btn-cancel-profile" 
              onClick={onClose} 
              disabled={loading}
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="btn-submit-profile" 
              disabled={loading}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
