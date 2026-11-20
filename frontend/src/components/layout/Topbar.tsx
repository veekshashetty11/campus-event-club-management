import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, Menu, ChevronDown, Sparkles, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';
import { useDisclosure } from '../../hooks/useDisclosure';

interface TopbarProps {
  onMenuClick: () => void;
}

const ROLE_GRADIENTS: Record<string, string> = {
  student: 'from-cyan-500 to-blue-600',
  event_coordinator: 'from-violet-500 to-purple-600',
  club_president: 'from-violet-500 to-purple-600',
  club_advisor: 'from-emerald-500 to-teal-600',
  student_affairs: 'from-amber-500 to-orange-600',
  administrator: 'from-red-500 to-pink-600',
  venue_manager: 'from-sky-500 to-blue-600',
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const { unreadNotificationsCount } = useStudent();
  const navigate = useNavigate();
  const { isOpen: profileOpen, toggle: toggleProfile, close: closeProfile } = useDisclosure();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const gradient = user ? (ROLE_GRADIENTS[user.role] ?? ROLE_GRADIENTS.student) : ROLE_GRADIENTS.student;

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center px-4 md:px-6 gap-4"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(139,92,246,0.1)',
        boxShadow: '0 4px 24px rgba(59,110,240,0.06)',
      }}>

      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-xl text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition-all lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Logo (mobile only) */}
      <Link to="/" className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #3b6ef0)' }}>
          <Sparkles size={14} className="text-white" />
        </div>
        <span className="font-black text-sm bg-gradient-to-r from-violet-700 to-blue-600 bg-clip-text text-transparent hidden sm:block">
          CampusHub
        </span>
      </Link>

      {/* Search bar */}
      <div className="hidden md:flex items-center flex-1 max-w-sm">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search events, clubs..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border-0 bg-slate-100/80 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Notification Bell */}
      <Link
        to={user?.role === 'student' ? '/student/notifications' : '/notifications'}
        className="relative p-2.5 rounded-xl text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition-all group"
        aria-label={`${unreadNotificationsCount} unread notifications`}
      >
        <Bell size={19} className="group-hover:scale-110 transition-transform" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-white animate-pulse"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
      </Link>

      {/* Profile dropdown */}
      <div className="relative">
        <button
          onClick={toggleProfile}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all text-left group"
          aria-haspopup="true"
          aria-expanded={profileOpen}
        >
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br ${gradient}`}>
            <span className="text-xs font-black text-white">{user?.fullName?.charAt(0) ?? 'U'}</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold text-slate-800 leading-tight max-w-28 truncate">{user?.fullName}</span>
            <span className="text-[10px] text-slate-400 leading-tight">{user?.roleDisplayName}</span>
          </div>
          <ChevronDown size={13} className="text-slate-400 hidden sm:block group-hover:rotate-180 transition-transform duration-200" />
        </button>

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={closeProfile} aria-hidden="true" />
            <div className="absolute right-0 top-full mt-2 z-20 w-60 rounded-2xl overflow-hidden animate-fade-in"
              style={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139,92,246,0.15)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}>
              {/* Profile header */}
              <div className={`px-4 py-4 bg-gradient-to-br ${gradient}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-white">
                    {user?.fullName?.charAt(0) ?? 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{user?.fullName}</p>
                    <p className="text-xs text-white/70">{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="py-1.5">
                <Link
                  to={user?.role === 'student' ? '/student/profile' : '/profile'}
                  onClick={closeProfile}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  <User size={15} className="text-slate-400" />
                  My Profile
                </Link>
                <div className="mx-3 my-1 border-t border-slate-100" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
