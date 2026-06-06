import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Login = () => {
  const { login } = useApp();
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  
  // View state: 'login' | 'forgot'
  const [view, setView] = useState('login');

  // Error & Status states
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setResetMessage('');

    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
      // Success - Redirect based on role
      navigate('/');
    } catch (err) {
      setGeneralError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setResetMessage('');

    if (!forgotEmail) {
      setErrors({ forgotEmail: 'Email is required' });
      return;
    } else if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      setErrors({ forgotEmail: 'Email is invalid' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      setResetMessage(data.message || 'Reset link sent');
      setErrors({});
    } catch (err) {
      setGeneralError('Failed to request password reset. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Left Pane - Tagline & Product Name */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 flex-col justify-between p-12 border-r border-slate-800">
        <div>
          <span className="text-xl font-bold tracking-wider text-indigo-400 uppercase">VendorBridge</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Procurement & Vendor ERP Simplified.
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Digitize your organizations complete procurement cycle from RFQs, quotation comparison, manager approvals, to invoices.
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">© 2026 VendorBridge Corporation. All rights reserved.</p>
        </div>
      </div>

      {/* Right Pane - Forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl border border-slate-800 shadow-2xl">
          {view === 'login' ? (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-sm text-slate-400">Enter your credentials to access VendorBridge</p>
              </div>

              {generalError && (
                <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: null });
                    }}
                    className={`w-full px-4 py-3 rounded-lg bg-slate-950 border ${
                      errors.email ? 'border-red-500' : 'border-slate-800'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white`}
                    placeholder="name@company.com"
                  />
                  {errors.email && (
                    <span className="block mt-1 text-xs text-red-400">{errors.email}</span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot');
                        setErrors({});
                        setGeneralError('');
                      }}
                      className="text-xs text-indigo-400 hover:underline hover:text-indigo-300 focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
                    className={`w-full px-4 py-3 rounded-lg bg-slate-950 border ${
                      errors.password ? 'border-red-500' : 'border-slate-800'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white`}
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <span className="block mt-1 text-xs text-red-400">{errors.password}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-55"
                >
                  {loading ? 'Logging in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 text-center text-sm text-slate-400">
                Don't have an account?{' '}
                <Link to="/signup" className="text-indigo-400 hover:underline hover:text-indigo-300 font-medium">
                  Register here
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
                <p className="text-sm text-slate-400">Enter your email and we'll send you a recovery link</p>
              </div>

              {resetMessage && (
                <div className="mb-6 p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm">
                  {resetMessage}
                </div>
              )}

              {generalError && (
                <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (errors.forgotEmail) setErrors({});
                    }}
                    className={`w-full px-4 py-3 rounded-lg bg-slate-950 border ${
                      errors.forgotEmail ? 'border-red-500' : 'border-slate-800'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white`}
                    placeholder="name@company.com"
                  />
                  {errors.forgotEmail && (
                    <span className="block mt-1 text-xs text-red-400">{errors.forgotEmail}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-55"
                >
                  {loading ? 'Sending link...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-8 text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setErrors({});
                    setGeneralError('');
                    setResetMessage('');
                  }}
                  className="text-indigo-400 hover:underline hover:text-indigo-300 font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
