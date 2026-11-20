import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  User,
  LogOut,
  Menu,
  ChevronDown,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';
import { useDisclosure } from '../../hooks/useDisclosure';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const { unreadNotificationsCount } = useStudent();
  const navigate = useNavigate();
  const { isOpen: profileOpen, toggle: toggleProfile, close: closeProfile } = useDisclosure();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 shadow-soft flex items-center px-4 md:px-6 gap-4">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Logo (mobile) */}
      <Link to="/" className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 rounded-lg bg-brand-800 flex items-center justify-center shrink-0">
          <GraduationCap size={16} className="text-white" />
        </div>
        <span className="font-semibold text-sm text-brand-800 hidden sm:block leading-tight">
          Campus Events
        </span>
      </Link>

      {/* Search / spacer */}
      <div className="flex-1" />

      {/* Notifications bell */}
      <Link
        to={user?.role === 'student' ? '/student/notifications' : '/notifications'}
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        aria-label={`${unreadNotificationsCount} unread notifications`}
      >
        <Bell size={20} />
        {unreadNotificationsCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
      </Link>

      {/* Profile dropdown */}
      <div className="relative">
        <button
          onClick={toggleProfile}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
          aria-haspopup="true"
          aria-expanded={profileOpen}
        >
          <div className="w-8 h-8 rounded-full bg-brand-800 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-white">
              {user?.fullName?.charAt(0) ?? 'U'}
            </span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-medium text-slate-800 leading-tight max-w-32 truncate">
              {user?.fullName}
            </span>
            <span className="text-xs text-slate-500 leading-tight">
              {user?.roleDisplayName}
            </span>
          </div>
          <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
        </button>

        {profileOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={closeProfile}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-full mt-2 z-20 w-56 bg-white rounded-xl border border-slate-200 shadow-dropdown py-1.5 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {user?.fullName}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <Link
                to={user?.role === 'student' ? '/student/profile' : '/profile'}
                onClick={closeProfile}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User size={15} className="text-slate-400" />
                My Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
