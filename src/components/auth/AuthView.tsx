import React, { useState } from 'react';
import {
  ShieldCheck, Lock, Mail, User, Phone, CheckCircle2,
  ArrowRight, KeyRound, AlertCircle
} from 'lucide-react';
import { useAuth, DEMO_PERSONAS } from '../../context/AuthContext';
import { UserRole } from '../../types/inventory';

export const AuthView: React.FC = () => {
  const { login, register, quickLoginAs } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Sign In state
  const [email, setEmail] = useState('eyob@inventory.com');
  const [password, setPassword] = useState('admin123');

  // Sign Up state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('STAFF');
  const [regPhone, setRegPhone] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(regName, regEmail, regPassword, regRole, regPhone);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      setResetMessage(data.message || 'Password reset link generated');
    } catch (err: any) {
      setError(err.message || 'Failed to issue reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand header */}
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-teal-600 text-white font-black text-xl items-center justify-center shadow-lg shadow-teal-600/20 mb-3">
            SI
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Apex Smart Inventory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise Batch Tracking, Expiry Management & FEFO Control System
          </p>
        </div>

        {/* 1-Click Professional Profiles (For Quick Role Switching) */}
        <div className="mt-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Professional Roles (1-Click Instant Sign-In)
            </span>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">5 Authorized Users</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEMO_PERSONAS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => quickLoginAs(p.id)}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 bg-slate-100/70 dark:bg-slate-800/40 text-left transition-all hover:shadow-xs group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block group-hover:text-teal-600">
                    {p.name}
                  </span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-mono text-slate-600 dark:text-slate-300">
                    {p.role === 'INVENTORY_MANAGER' ? 'Manager' : p.role}
                  </span>
                </div>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium block truncate">
                  {p.profession}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="mt-4 bg-slate-50 dark:bg-slate-900 py-6 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl sm:px-8">
          {/* Segmented Auth Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <button
              onClick={() => { setTab('signin'); setError(null); }}
              className={`flex-1 text-center pb-2 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'signin'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('signup'); setError(null); }}
              className={`flex-1 text-center pb-2 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'signup'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => { setTab('forgot'); setError(null); }}
              className={`flex-1 text-center pb-2 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'forgot'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Reset Pass
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resetMessage && (
            <div className="mb-4 p-3 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{resetMessage}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setTab('forgot')}
                    className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Requested Role
                </label>
                <select
                  value={regRole}
                  onChange={e => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="STAFF">Staff (POS & Stock Issuing)</option>
                  <option value="INVENTORY_MANAGER">Inventory Manager (Batches & POs)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="e.g. admin@inventory.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                {loading ? 'Issuing Recovery...' : 'Generate Temporary Password'}
              </button>

              <button
                type="button"
                onClick={() => setTab('signin')}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 block"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
