import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  Award,
  Bell,
  UserCircle,
  LogOut,
  X,
  Settings,
  BookOpen,
  CheckSquare,
  PlusCircle,
  FileCheck2,
  CalendarRange,
  Boxes,
  ShieldAlert,
  BarChart3,
  MapPin,
  Building2,
  Receipt,
  HandCoins,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  group?: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const STUDENT_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    group: 'Events',
    items: [
      { label: 'Browse Events', path: '/student/events', icon: <Calendar size={16} /> },
      { label: 'My Registrations', path: '/student/registrations', icon: <ClipboardList size={16} /> },
    ],
  },
  {
    group: 'Campus Life',
    items: [
      { label: 'My Clubs', path: '/student/clubs', icon: <Users size={16} /> },
      { label: 'Certificates', path: '/student/certificates', icon: <Award size={16} /> },
    ],
  },
  {
    group: 'Account',
    items: [
      { label: 'Notifications', path: '/student/notifications', icon: <Bell size={16} /> },
      { label: 'Profile', path: '/student/profile', icon: <UserCircle size={16} /> },
    ],
  },
];

const COORDINATOR_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/coordinator/dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    group: 'Club',
    items: [
      { label: 'Club Management', path: '/coordinator/club', icon: <Building2 size={16} /> },
      { label: 'Member Roster', path: '/coordinator/members', icon: <Users size={16} /> },
    ],
  },
  {
    group: 'Events',
    items: [
      { label: 'Events List', path: '/coordinator/events', icon: <Calendar size={16} /> },
      { label: 'Create Event', path: '/coordinator/events/create', icon: <PlusCircle size={16} />, badge: 'New' },
      { label: 'Registrations', path: '/coordinator/registrations', icon: <ClipboardList size={16} /> },
      { label: 'Attendance', path: '/coordinator/attendance', icon: <CheckSquare size={16} /> },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Budget & Expenses', path: '/coordinator/budget', icon: <Receipt size={16} /> },
      { label: 'Sponsors', path: '/coordinator/sponsors', icon: <HandCoins size={16} /> },
    ],
  },
  {
    group: 'More',
    items: [
      { label: 'Reports', path: '/coordinator/reports', icon: <BarChart3 size={16} /> },
      { label: 'Notifications', path: '/coordinator/notifications', icon: <Bell size={16} /> },
    ],
  },
];

const ADVISOR_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/advisor/dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    group: 'Approvals',
    items: [
      { label: 'Event Approvals', path: '/advisor/approvals', icon: <FileCheck2 size={16} /> },
      { label: 'Assigned Clubs', path: '/advisor/clubs', icon: <Users size={16} /> },
    ],
  },
  {
    group: 'More',
    items: [
      { label: 'Reports & Analytics', path: '/advisor/reports', icon: <BarChart3 size={16} /> },
      { label: 'Notifications', path: '/advisor/notifications', icon: <Bell size={16} /> },
      { label: 'Profile', path: '/advisor/profile', icon: <UserCircle size={16} /> },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    group: 'Management',
    items: [
      { label: 'Event Approvals', path: '/admin/approvals', icon: <FileCheck2 size={16} /> },
      { label: 'All Events', path: '/admin/events', icon: <Calendar size={16} /> },
      { label: 'All Clubs', path: '/admin/clubs', icon: <Building2 size={16} /> },
      { label: 'User Directory', path: '/admin/users', icon: <Users size={16} /> },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Audit Activity', path: '/admin/audit', icon: <ShieldAlert size={16} /> },
      { label: 'System Reports', path: '/admin/reports', icon: <BarChart3 size={16} /> },
      { label: 'Settings', path: '/admin/settings', icon: <Settings size={16} /> },
    ],
  },
];

const VENUE_MANAGER_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/venue-manager/dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    group: 'Venues',
    items: [
      { label: 'Campus Venues', path: '/venue-manager/venues', icon: <MapPin size={16} /> },
      { label: 'Venue Bookings', path: '/venue-manager/bookings', icon: <BookOpen size={16} /> },
      { label: 'Booking Calendar', path: '/venue-manager/calendar', icon: <CalendarRange size={16} /> },
    ],
  },
  {
    group: 'Equipment',
    items: [
      { label: 'Equipment Inventory', path: '/venue-manager/equipment', icon: <Boxes size={16} /> },
      { label: 'Equipment Bookings', path: '/venue-manager/equipment-bookings', icon: <ClipboardList size={16} /> },
    ],
  },
  {
    group: 'More',
    items: [
      { label: 'Facility Reports', path: '/venue-manager/reports', icon: <BarChart3 size={16} /> },
      { label: 'Notifications', path: '/venue-manager/notifications', icon: <Bell size={16} /> },
    ],
  },
];

const ROLE_META: Record<string, { label: string; color: string; gradient: string }> = {
  student: { label: 'Student', color: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-500' },
  event_coordinator: { label: 'Coordinator', color: 'text-violet-400', gradient: 'from-violet-500 to-purple-500' },
  club_president: { label: 'President', color: 'text-violet-400', gradient: 'from-violet-500 to-purple-500' },
  club_advisor: { label: 'Advisor', color: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
  student_affairs: { label: 'Affairs', color: 'text-amber-400', gradient: 'from-amber-500 to-orange-500' },
  administrator: { label: 'Admin', color: 'text-red-400', gradient: 'from-red-500 to-pink-500' },
  venue_manager: { label: 'Venue Mgr', color: 'text-sky-400', gradient: 'from-sky-500 to-blue-500' },
};

function getNav(role: UserRole): NavGroup[] {
  switch (role) {
    case 'student': return STUDENT_NAV;
    case 'event_coordinator':
    case 'club_president': return COORDINATOR_NAV;
    case 'club_advisor': return ADVISOR_NAV;
    case 'student_affairs':
    case 'administrator': return ADMIN_NAV;
    case 'venue_manager': return VENUE_MANAGER_NAV;
    default: return STUDENT_NAV;
  }
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navGroups = user ? getNav(user.role) : STUDENT_NAV;
  const roleMeta = user ? (ROLE_META[user.role] ?? ROLE_META.student) : ROLE_META.student;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0d1526 0%, #0f172a 60%, #0d1526 100%)' }}>

      {/* ── Brand Header ── */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.4) 0%, transparent 70%)' }} />
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-glow relative"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #3b6ef0)' }}>
          <GraduationCap size={18} className="text-white" />
        </div>
        <div className="flex flex-col leading-tight min-w-0 relative">
          <span className="text-sm font-black text-white truncate tracking-tight">CampusHub</span>
          <span className="text-[10px] text-violet-300/70 truncate font-medium">Event & Club Platform</span>
        </div>
        <div className="ml-auto flex items-center gap-1 relative">
          <Sparkles size={12} className="text-violet-400 animate-pulse-slow" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── User Card ── */}
      {user && (
        <div className="px-4 pb-3 shrink-0">
          <div className="rounded-2xl p-3 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,110,240,0.1))', border: '1px solid rgba(139,92,246,0.25)' }}>
            <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at top right, rgba(139,92,246,0.6), transparent 60%)' }} />
            <div className="flex items-center gap-3 relative">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-glow"
                style={{ background: `linear-gradient(135deg, ${roleMeta.gradient.split(' ')[1]}, ${roleMeta.gradient.split(' ')[3]})` }}>
                {user.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
                <p className={`text-[10px] font-semibold truncate ${roleMeta.color}`}>{user.roleDisplayName}</p>
              </div>
              <Zap size={12} className="text-violet-400 shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.group && (
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1.5">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative',
                      isActive
                        ? 'text-white nav-active'
                        : 'text-slate-400 hover:text-white hover:bg-white/5',
                    ].join(' ')}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-violet-400" />
                    )}
                    <span className={`transition-colors ${isActive ? 'text-violet-400' : 'text-slate-600 group-hover:text-violet-400'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
        >
          <LogOut size={15} className="group-hover:text-red-400 transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 overflow-hidden"
        style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.3)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden flex flex-col overflow-hidden"
            style={{ boxShadow: '4px 0 40px rgba(0,0,0,0.5)' }}>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
