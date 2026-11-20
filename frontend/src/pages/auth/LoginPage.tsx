import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultPath } from '../../routes/rolePaths';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'student@campus.edu', password: 'StudentPassword123!' },
  { label: 'Coordinator', email: 'coordinator@campus.edu', password: 'CoordinatorPassword123!' },
  { label: 'Advisor', email: 'advisor@campus.edu', password: 'AdvisorPassword123!' },
  { label: 'Student Affairs', email: 'affairs@campus.edu', password: 'AffairsPassword123!' },
  { label: 'Administrator', email: 'admin@campus.edu', password: 'AdminPassword123!' },
  { label: 'Venue Manager', email: 'venue@campus.edu', password: 'VenuePassword123!' },
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
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;
    try {
      await login({ email: email.trim(), password, rememberMe });
      // After login, user is now set in context — redirect to saved location or role dashboard
      // We need to redirect after context updates — using navigate with replace
    } catch {
      // error is already in context
    }
  };

  // Redirect once login succeeds (useAuth state reflects logged-in user)
  const { user } = useAuth();
  if (user) {
    const destination = from ?? getDefaultPath(user.role);
    navigate(destination, { replace: true });
  }

  const fillDemo = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setFieldErrors({});
    clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-teal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-dropdown overflow-hidden">
          {/* Header strip */}
          <div className="bg-brand-800 px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <GraduationCap size={30} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-white leading-tight">
                Campus Event & Club
              </h1>
              <p className="text-brand-200 text-sm mt-0.5">Management System</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-7">
            <h2 className="text-xl font-semibold text-slate-800 mb-1">Sign in to your account</h2>
            <p className="text-sm text-slate-500 mb-6">
              Use your campus email and password.
            </p>

            {/* Error banner */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@campus.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                error={fieldErrors.email}
                leftElement={<Mail size={16} />}
                autoComplete="email"
                autoFocus
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                }}
                error={fieldErrors.password}
                leftElement={<Lock size={16} />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                autoComplete="current-password"
              />

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-brand-700 hover:text-brand-800 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-1"
              >
                Sign In
              </Button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
                Demo accounts
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Click a role button to auto-fill credentials, then press Sign In.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-brand-200 mt-6">
          Campus Event & Club Management System · Academic Project
        </p>
      </div>
    </div>
  );
}
