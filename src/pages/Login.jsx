import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };


  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-blob b1" />
        <div className="login-blob b2" />
        <div className="login-blob b3" />
      </div>

      <div className="login-container">
        {/* Left branding panel */}
        <div className="login-left">
          <div className="login-logo">
            <div className="logo-icon">CRM</div>
            <h1>نظام إدارة العملاء</h1>
            <p>منصة متكاملة لإدارة المبيعات وأداء الفريق</p>
          </div>
          <div className="login-features">
            {[
              { icon: '👥', text: 'إدارة العملاء والعملاء المحتملين' },
              { icon: '📊', text: 'لوحة تحكم تفاعلية' },
              { icon: '🏆', text: 'نظام تقييم الأداء والمكافآت' },
              { icon: '🔒', text: 'صلاحيات متعددة المستويات' },
            ].map((f, i) => (
              <div key={i} className="feature-item">
                <span className="feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-header">
              <h2>تسجيل الدخول</h2>
              <p>مرحباً بك، أدخل بياناتك للمتابعة</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label>اسم المستخدم</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>كلمة المرور</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔑</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="show-pass" onClick={() => setShowPass(!showPass)}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? <span className="spinner" /> : 'دخول'}
              </button>
            </form>


          </div>
        </div>
      </div>
    </div>
  );
}
