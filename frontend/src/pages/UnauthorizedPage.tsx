import { Link } from 'react-router-dom';
import { GraduationCap, Home } from 'lucide-react';
import Button from '../components/common/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-5">
          <GraduationCap size={28} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-6">
          You don't have permission to view this page. Please contact your system administrator if you believe this is an error.
        </p>
        <Link to="/">
          <Button variant="primary" leftIcon={<Home size={16} />}>
            Go to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
