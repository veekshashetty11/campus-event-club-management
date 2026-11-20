import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Mail, Lock, AlertCircle, Sparkles, Zap, Shield, Users, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultPath } from '../../routes/rolePaths';
import Button from '../../components/common/Button';

const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'student@campus.edu', password: 'StudentPassword123!', color: 'from-cyan-500 to-blue-500', icon: '🎓' },
  { label: 'Coordinator', email: 'coordinator@campus.edu', password: 'CoordinatorPassword123!', color: 'from-violet-500 to-purple-500', icon: '📋' },
  { label: 'Advisor', email: 'advisor@campus.edu', password: 'AdvisorPassword123!', color: 'from-emerald-500 to-teal-500', icon: '🎯' },
  { label: 'Affairs', email: 'affairs@campus.edu', password: 'AffairsPassword123!', color: 'from-amber-500 to-orange-500', icon: '⚡' },
  { label: 'Admin', email: 'admin@campus.edu', password: 'AdminPassword123!', color: 'from-red-500 to-pink-500', icon: '🛡️' },
  { label: 'Venue Mgr', email: 'venue@campus.edu', password: 'VenuePassword123!', color: 'from-sky-500 to-blue-500', icon: '🏛️' },
];

const STATS = [
  { icon: <Calendar size={16} />, value: '500+', label: 'Events Hosted' },
  { icon: <Users size={16} />, value: '10K+', label: 'Students' },
  { icon: <Shield size={16} />, value: '50+', label: 'Campus Clubs' },
  { icon: <Zap size={16} />, value: '99.9%', label: 'Uptime' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;
    try { await login({ email: email.trim(), password, rememberMe }); } catch { /* error in context */ }
  };

  const { user } = useAuth();
  if (user) navigate(from ?? getDefaultPath(user.role), { replace: true });

  const fillDemo = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(acc.email); setPassword(acc.password);
    setFieldErrors({}); clearError();
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #080d18 0%, #0d1526 40%, #130d2b 100%)' }}>

      {/* ── Left Panel — Branding ── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.8), transparent)' }} />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-10 blur-3xl animate-float"
          style={{ background: 'radial-gradient(circle, rgba(59,110,240,0.8), transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5 blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.8), transparent)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-glow"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b6ef0)' }}>
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-black text-white tracking-tight">CampusHub</span>
            <p className="text-xs text-violet-400 font-medium">Event & Club Platform</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <Sparkles size={12} className="text-violet-400" />
              <span className="text-xs text-violet-300 font-semibold">AI-Powered Campus Platform</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-tight tracking-tight">
              Your Campus.<br />
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Reimagined.
              </span>
            </h1>
            <p className="text-slate-400 text-base mt-4 leading-relaxed max-w-md">
              Manage events, clubs, attendance, certificates and budgets — all in one intelligent platform built for modern campus life.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {STATS.map((stat, i) => (
              <div key={i} className="rounded-2xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 text-violet-400 mb-1">{stat.icon}</div>
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-700 relative z-10">© 2026 CampusHub · Academic Project</p>
      </div>

      {/* ── Right Panel — Login Form ── */}
      <div className="flex flex-col justify-center w-full lg:max-w-md xl:max-w-lg p-6 md:p-12 relative">
        {/* Subtle glow */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />

        <div className="relative z-10 w-full max-w-md mx-auto">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b6ef0)' }}>
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="text-lg font-black text-white">CampusHub</span>
          </div>

          {/* Card */}
          <div className="rounded-3xl overflow-hidden animate-fade-in"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}>

            {/* Card header */}
            <div className="px-8 pt-8 pb-6">
              <h2 className="text-2xl font-black text-white tracking-tight">Welcome back</h2>
              <p className="text-sm text-slate-400 mt-1">Sign in to your campus account</p>
            </div>

            <div className="px-8 pb-8 space-y-5">
              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-3 rounded-xl px-4 py-3 animate-fade-in"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Email field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      placeholder="you@campus.edu"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined })); }}
                      autoComplete="email"
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${fieldErrors.email ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}` }}
                    />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>}
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: undefined })); }}
                      autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${fieldErrors.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}` }}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-400 mt-1">{fieldErrors.password}</p>}
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500/30 cursor-pointer" />
                    <span className="text-xs text-slate-400">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl text-sm font-black text-white relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-neon disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b6ef0)' }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Zap size={15} /> Sign In
                    </span>
                  )}
                </button>
              </form>

              {/* Demo accounts */}
              <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">
                  Quick Demo Access
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillDemo(acc)}
                      className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-center transition-all hover:scale-105 group"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <span className="text-base">{acc.icon}</span>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">
                        {acc.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-700 mt-2.5 text-center">Click any role to auto-fill, then Sign In</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
