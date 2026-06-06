import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Signup = () => {
  const { register } = useApp();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Procurement Officer');
  const [companyName, setCompanyName] = useState('');

  // Error & Status states
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!name) newErrors.name = 'Full Name is required';
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
    if (!role) newErrors.role = 'Role selection is required';
    if (!companyName) newErrors.companyName = 'Company name is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) return;

    setLoading(true);
    try {
      await register(name, email, password, role, companyName);
      navigate('/');
    } catch (err) {
      setGeneralError(err.message || 'Registration failed. Try again.');
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
            Join VendorBridge.
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Create an account to streamline your supply chain workflows, compare quotation matrices, and track approvals in real-time.
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">© 2026 VendorBridge Corporation. All rights reserved.</p>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-sm text-slate-400">Join the VendorBridge ERP network</p>
          </div>

          {generalError && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
              {generalError}
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                className={`w-full px-4 py-2.5 rounded-lg bg-slate-950 border ${
                  errors.name ? 'border-red-500' : 'border-slate-800'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm`}
                placeholder="Rohan Sharma"
              />
              {errors.name && (
                <span className="block mt-0.5 text-xs text-red-400">{errors.name}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                className={`w-full px-4 py-2.5 rounded-lg bg-slate-950 border ${
                  errors.email ? 'border-red-500' : 'border-slate-800'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm`}
                placeholder="rohan@company.com"
              />
              {errors.email && (
                <span className="block mt-0.5 text-xs text-red-400">{errors.email}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                className={`w-full px-4 py-2.5 rounded-lg bg-slate-950 border ${
                  errors.password ? 'border-red-500' : 'border-slate-800'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm`}
                placeholder="••••••••"
              />
              {errors.password && (
                <span className="block mt-0.5 text-xs text-red-400">{errors.password}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm"
                >
                  <option value="Procurement Officer">Procurement Officer</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (errors.companyName) setErrors({ ...errors, companyName: null });
                  }}
                  className={`w-full px-4 py-2.5 rounded-lg bg-slate-950 border ${
                    errors.companyName ? 'border-red-500' : 'border-slate-800'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm`}
                  placeholder="Acme Corp"
                />
                {errors.companyName && (
                  <span className="block mt-0.5 text-xs text-red-400">{errors.companyName}</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-55 text-sm"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:underline hover:text-indigo-300 font-medium">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
