import React, { useState } from 'react';
import { authLogin, authSignup, showToast } from '../api';

export default function AuthPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!pin || pin.length !== 4) {
      setErrorMessage('Please enter a 4-digit PIN (e.g. 1234).');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await authSignup(email.trim(), pin);
        if (res && res.success && res.user) {
          showToast('Account created successfully! Welcome to GoalTracker Pro 🎉');
          onLoginSuccess(res.user);
        } else {
          setErrorMessage(res?.error || 'Failed to create account. Please try again.');
        }
      } else {
        const res = await authLogin(email.trim(), pin);
        if (res && res.success && res.user) {
          showToast(`Welcome back, ${res.user.email}! 👋`);
          onLoginSuccess(res.user);
        } else {
          setErrorMessage(res?.error || 'Invalid email or 4-digit PIN.');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error occurred. Please check server.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('demo@goaltracker.com');
    setPin('1234');
    setMode('signin');
    setErrorMessage('');
    showToast('Demo credentials filled (PIN: 1234)');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header / Brand */}
        <div className="auth-header">
          <div className="auth-brand-badge">🎯</div>
          <h2>GoalTracker Pro</h2>
          <p className="auth-sub">
            {mode === 'signup'
              ? 'Create your personal account in seconds'
              : 'Sign in to access your goals, roadmaps & habit sprints'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setMode('signin');
              setErrorMessage('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setMode('signup');
              setErrorMessage('');
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="auth-pin">
              4-Digit PIN Password
              <span className="pin-badge">4 Digits Only</span>
            </label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="auth-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                className="auth-input pin-input"
                placeholder="••••"
                value={pin}
                onChange={handlePinChange}
                required
              />
            </div>
            <div className="pin-hint">
              {pin.length === 0 && 'Enter any 4 numbers (e.g. 1234)'}
              {pin.length > 0 && pin.length < 4 && `${4 - pin.length} more digit${4 - pin.length > 1 ? 's' : ''} needed`}
              {pin.length === 4 && '✓ Ready'}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading || !email.trim() || pin.length !== 4}
          >
            {loading ? (
              <span className="btn-loading-spinner">Processing...</span>
            ) : mode === 'signup' ? (
              'Create My SaaS Dashboard 🚀'
            ) : (
              'Sign In to Dashboard ➔'
            )}
          </button>
        </form>

        {/* Demo Fast Login Option */}
        <div className="auth-demo-divider">
          <span>or try demo</span>
        </div>

        <button
          type="button"
          className="btn-demo-quick"
          onClick={handleQuickDemo}
        >
          <span>✨ Fill Demo Account</span>
          <span className="demo-pin-pill">demo@goaltracker.com &bull; 1234</span>
        </button>

        {/* Footer info */}
        <div className="auth-footer-notes">
          {mode === 'signup' ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage('');
                }}
              >
                Sign in here
              </button>
            </p>
          ) : (
            <p>
              New to GoalTracker?{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage('');
                }}
              >
                Sign up with just email & 4-digit PIN
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
