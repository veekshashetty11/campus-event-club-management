import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, Menu, ChevronDown, Sparkles, Search, Command } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';
import { useDisclosure } from '../../hooks/useDisclosure';

interface TopbarProps {
  onMenuClick: () => void;
}

const ROLE_GRADIENTS: Record<string, string> = {
  student: 'from-cyan-500 to-blue-600',
  event_coordinator: 'from-indigo-500 to-blue-600',
  club_president: 'from-indigo-500 to-blue-600',
  club_advisor: 'from-emerald-500 to-teal-600',
  student_affairs: 'from-amber-500 to-orange-600',
  administrator: 'from-rose-500 to-pink-600',
  venue_manager: 'from-sky-500 to-blue-600',
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const { unreadNotificationsCount, notifications } = useStudent();
  const navigate = useNavigate();
  const { isOpen: profileOpen, toggle: toggleProfile, close: closeProfile } = useDisclosure();
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  const gradient = user ? (ROLE_GRADIENTS[user.role] ?? ROLE_GRADIENTS.student) : ROLE_GRADIENTS.student;

  const profilePath =
    user?.role === 'student'
      ? '/student/profile'
      : user?.role === 'club_advisor'
      ? '/advisor/profile'
      : user?.role === 'event_coordinator' || user?.role === 'club_president'
      ? '/coordinator/profile'
      : user?.role === 'administrator' || user?.role === 'student_affairs'
      ? '/admin/settings'
      : '/venue-manager/dashboard';

  const notifPath =
    user?.role === 'student'
      ? '/student/notifications'
      : user?.role === 'club_advisor'
      ? '/advisor/notifications'
      : user?.role === 'event_coordinator' || user?.role === 'club_president'
      ? '/coordinator/notifications'
      : user?.role === 'administrator' || user?.role === 'student_affairs'
      ? '/admin/audit'
      : '/venue-manager/notifications';

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center px-4 md:px-6 gap-4"
      style={{
        background: 'rgba(13, 20, 38, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid #263650',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-xl text-slate-400 hover:bg-[#17243B] hover:text-white transition-all lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Global Quick Search / Command Palette Trigger */}
      <button
        onClick={handleOpenSearch}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#111C32] border border-[#263650] hover:border-indigo-500/50 hover:bg-[#17243B] transition-all text-xs text-slate-400 max-w-xs sm:w-72 justify-between group shadow-inner"
      >
        <div className="flex items-center gap-2 truncate">
          <Search size={14} className="text-indigo-400 group-hover:text-indigo-300 shrink-0" />
          <span className="truncate">Search pages & actions...</span>
        </div>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-[#0D1426] text-slate-400 rounded border border-[#263650] shrink-0">
          <Command size={10} /> K
        </kbd>
      </button>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5 ml-auto">
        {/* Notification Bell with Glass Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-xl text-slate-400 hover:bg-[#17243B] hover:text-white transition-all"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0D1426] animate-pulse" />
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#111C32] border border-[#263650] shadow-2xl p-3 z-50 text-slate-100 animate-fade-in"
              style={{ backdropFilter: 'blur(20px)' }}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#263650]">
                <span className="text-xs font-bold text-slate-200">Recent Notifications</span>
                <Link
                  to={notifPath}
                  onClick={() => setNotifOpen(false)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View All
                </Link>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.notificationId}
                    className="p-2 rounded-xl bg-[#17243B]/60 hover:bg-[#17243B] transition-colors cursor-pointer border border-[#263650]/40 text-left"
                    onClick={() => {
                      setNotifOpen(false);
                      navigate(notifPath);
                    }}
                  >
                    <p className="text-xs font-semibold text-slate-200 truncate">{n.title}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Pill Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={toggleProfile}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[#17243B] transition-all border border-transparent hover:border-[#263650]"
            >
              {/* Avatar circle */}
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0`}
              >
                {user.fullName.charAt(0)}
              </div>

              {/* Name & Role */}
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-indigo-400 font-medium truncate">
                  {user.roleDisplayName}
                </span>
              </div>

              <ChevronDown
                size={13}
                className={`text-slate-400 transition-transform duration-200 ${
                  profileOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#111C32] border border-[#263650] shadow-2xl p-1.5 z-50 animate-fade-in text-slate-200"
                style={{ backdropFilter: 'blur(20px)' }}
              >
                <div className="px-3 py-2.5 border-b border-[#263650] mb-1">
                  <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                      <Sparkles size={9} />
                      {user.roleDisplayName}
                    </span>
                  </div>
                </div>

                <Link
                  to={profilePath}
                  onClick={closeProfile}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-[#17243B] transition-colors"
                >
                  <User size={14} className="text-slate-400" />
                  <span>Profile & Settings</span>
                </Link>

                <button
                  onClick={() => {
                    closeProfile();
                    handleLogout();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors mt-0.5"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
