import { Link } from 'react-router-dom';
import { GraduationCap, Mail, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-teal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-dropdown overflow-hidden">
          <div className="bg-brand-800 px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <GraduationCap size={30} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">Reset Password</h1>
          </div>
          <div className="px-8 py-7">
            <p className="text-sm text-slate-500 mb-6">
              Enter your campus email and we'll send you a link to reset your password.
            </p>
            <div className="flex flex-col gap-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@campus.edu"
                leftElement={<Mail size={16} />}
              />
              <Button variant="primary" size="lg" className="w-full">
                Send Reset Link
              </Button>
            </div>
            <div className="mt-5 flex justify-center">
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
