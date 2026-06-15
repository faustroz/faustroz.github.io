'use client';
import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, TrendingUp, Shield } from 'lucide-react';
import { hasPassword, setPassword, verifyPassword } from '@/lib/portfolio/storage';

export default function LoginGate({ onLogin }) {
  const [mode, setMode] = useState('check'); // 'check' | 'login' | 'setup'
  const [password, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasPassword()) {
      setMode('setup');
    } else {
      setMode('login');
    }
  }, []);

  const handleSetup = () => {
    setError('');
    if (password.length < 4) {
      setError('Password minimal 4 karakter');
      return;
    }
    if (password !== confirm) {
      setError('Password tidak cocok');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setPassword(password);
      setLoading(false);
      onLogin();
    }, 400);
  };

  const handleLogin = () => {
    setError('');
    setLoading(true);
    setTimeout(() => {
      if (verifyPassword(password)) {
        onLogin();
      } else {
        setError('Password salah');
        setLoading(false);
      }
    }, 400);
  };

  const handleSkip = () => {
    // No password setup — just enter
    onLogin();
  };

  if (mode === 'check') return null;

  return (
    <div className="pt-login-overlay">
      <div className="pt-login-bg">
        <div className="pt-login-grid" />
        <div className="pt-login-glow" />
      </div>

      <div className="pt-login-card">
        {/* Logo */}
        <div className="pt-login-logo">
          <div className="pt-login-icon-wrap">
            <TrendingUp size={28} className="pt-login-icon" />
          </div>
          <h1 className="pt-login-title">Portfolio Tracker</h1>
          <p className="pt-login-subtitle">
            {mode === 'setup'
              ? 'Buat password untuk melindungi data portofoliomu'
              : 'Masukkan password untuk mengakses portofoliomu'}
          </p>
        </div>

        {/* Security badge */}
        <div className="pt-login-badge">
          <Shield size={12} />
          <span>Data tersimpan lokal di browser ini</span>
        </div>

        {/* Form */}
        <div className="pt-login-form">
          <div className="pt-input-group">
            <label className="pt-label">
              {mode === 'setup' ? 'Buat Password' : 'Password'}
            </label>
            <div className="pt-input-wrap">
              <Lock size={16} className="pt-input-icon" />
              <input
                type={showPw ? 'text' : 'password'}
                className="pt-input"
                placeholder={mode === 'setup' ? 'Minimal 4 karakter' : 'Masukkan password'}
                value={password}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (mode === 'setup' ? handleSetup() : handleLogin())}
                autoFocus
              />
              <button
                type="button"
                className="pt-input-toggle"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {mode === 'setup' && (
            <div className="pt-input-group">
              <label className="pt-label">Konfirmasi Password</label>
              <div className="pt-input-wrap">
                <Lock size={16} className="pt-input-icon" />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="pt-input"
                  placeholder="Ulangi password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetup()}
                />
              </div>
            </div>
          )}

          {error && <p className="pt-login-error">{error}</p>}

          <button
            className="pt-btn-primary"
            onClick={mode === 'setup' ? handleSetup : handleLogin}
            disabled={loading || !password}
          >
            {loading ? (
              <span className="pt-spinner" />
            ) : mode === 'setup' ? (
              'Simpan & Masuk'
            ) : (
              'Masuk'
            )}
          </button>

          {mode === 'setup' && (
            <button className="pt-btn-ghost" onClick={handleSkip}>
              Lewati (tanpa password)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
