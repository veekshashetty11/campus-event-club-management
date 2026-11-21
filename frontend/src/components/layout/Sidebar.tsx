import { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
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
      { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    group: 'Events',
    items: [
      { label: 'Browse Events', path: '/student/events', icon: <Calendar size={18} /> },
      { label: 'My Registrations', path: '/student/registrations', icon: <ClipboardList size={18} /> },
    ],
  },
  {
    group: 'Campus Life',
    items: [
      { label: 'My Clubs', path: '/student/clubs', icon: <Users size={18} /> },
      { label: 'Certificates', path: '/student/certificates', icon: <Award size={18} /> },
    ],
  },
  {
    group: 'Account',
    items: [
      { label: 'Notifications', path: '/student/notifications', icon: <Bell size={18} /> },
      { label: 'Profile', path: '/student/profile', icon: <UserCircle size={18} /> },
    ],
  },
];

const COORDINATOR_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/coordinator/dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    group: 'Club',
    items: [
      { label: 'Club Management', path: '/coordinator/club', icon: <Building2 size={18} /> },
      { label: 'Member Roster', path: '/coordinator/members', icon: <Users size={18} /> },
    ],
  },
  {
    group: 'Events',
    items: [
      { label: 'Events List', path: '/coordinator/events', icon: <Calendar size={18} /> },
      { label: 'Create Event', path: '/coordinator/events/create', icon: <PlusCircle size={18} /> },
      { label: 'Registrations', path: '/coordinator/registrations', icon: <ClipboardList size={18} /> },
      { label: 'Attendance', path: '/coordinator/attendance', icon: <CheckSquare size={18} /> },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Budget & Expenses', path: '/coordinator/budget', icon: <Receipt size={18} /> },
      { label: 'Sponsors', path: '/coordinator/sponsors', icon: <HandCoins size={18} /> },
      { label: 'Reports', path: '/coordinator/reports', icon: <BarChart3 size={18} /> },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Notifications', path: '/coordinator/notifications', icon: <Bell size={18} /> },
    ],
  },
];

const ADVISOR_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/advisor/dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    group: 'Approvals',
    items: [
      { label: 'Event Approvals', path: '/advisor/approvals', icon: <FileCheck2 size={18} /> },
      { label: 'Assigned Clubs', path: '/advisor/clubs', icon: <Users size={18} /> },
    ],
  },
  {
    group: 'Analytics',
    items: [
      { label: 'Reports & Analytics', path: '/advisor/reports', icon: <BarChart3 size={18} /> },
      { label: 'Notifications', path: '/advisor/notifications', icon: <Bell size={18} /> },
      { label: 'Profile', path: '/advisor/profile', icon: <UserCircle size={18} /> },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    group: 'Approvals & Events',
    items: [
      { label: 'Event Approvals', path: '/admin/approvals', icon: <FileCheck2 size={18} /> },
      { label: 'All Events', path: '/admin/events', icon: <Calendar size={18} /> },
      { label: 'All Clubs', path: '/admin/clubs', icon: <Building2 size={18} /> },
    ],
  },
  {
    group: 'Administration',
    items: [
      { label: 'User Directory', path: '/admin/users', icon: <Users size={18} /> },
      { label: 'Audit Activity', path: '/admin/audit', icon: <ShieldAlert size={18} /> },
      { label: 'System Reports', path: '/admin/reports', icon: <BarChart3 size={18} /> },
      { label: 'Settings', path: '/admin/settings', icon: <Settings size={18} /> },
    ],
  },
];

const VENUE_MANAGER_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/venue-manager/dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    group: 'Facilities',
    items: [
      { label: 'Campus Venues', path: '/venue-manager/venues', icon: <MapPin size={18} /> },
      { label: 'Venue Bookings', path: '/venue-manager/bookings', icon: <BookOpen size={18} /> },
      { label: 'Booking Calendar', path: '/venue-manager/calendar', icon: <CalendarRange size={18} /> },
    ],
  },
  {
    group: 'Equipment',
    items: [
      { label: 'Equipment Inventory', path: '/venue-manager/equipment', icon: <Boxes size={18} /> },
      { label: 'Equipment Bookings', path: '/venue-manager/equipment-bookings', icon: <ClipboardList size={18} /> },
      { label: 'Facility Reports', path: '/venue-manager/reports', icon: <BarChart3 size={18} /> },
      { label: 'Notifications', path: '/venue-manager/notifications', icon: <Bell size={18} /> },
    ],
  },
];

const ROLE_META: Record<string, { label: string; color: string; gradient: string }> = {
  student: { label: 'Student', color: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-500' },
  event_coordinator: { label: 'Coordinator', color: 'text-indigo-400', gradient: 'from-indigo-500 to-purple-500' },
  club_president: { label: 'President', color: 'text-indigo-400', gradient: 'from-indigo-500 to-purple-500' },
  club_advisor: { label: 'Faculty Advisor', color: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
  student_affairs: { label: 'Dean', color: 'text-amber-400', gradient: 'from-amber-500 to-orange-500' },
  administrator: { label: 'Admin', color: 'text-rose-400', gradient: 'from-rose-500 to-pink-500' },
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
  const [collapsed, setCollapsed] = useState(false);

  const navGroups = user ? getNav(user.role) : STUDENT_NAV;
  const roleMeta = user ? (ROLE_META[user.role] ?? ROLE_META.student) : ROLE_META.student;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isMini = collapsed && !isMobile;

    return (
      <div className="flex flex-col h-full bg-[#0D1426] border-r border-[#263650]">
        {/* ── Brand Header ── */}
        <div className={`flex items-center gap-3 px-4 py-4 shrink-0 border-b border-[#263650] relative overflow-hidden ${isMini ? 'justify-center px-2' : ''}`}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md relative"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #3B82F6)' }}
          >
            <GraduationCap size={20} className="text-white" />
          </div>

          {!isMini && (
            <div className="flex flex-col leading-tight min-w-0 relative flex-1">
              <span className="text-sm font-black text-white tracking-tight truncate">CampusHub</span>
              <span className="text-[10px] text-indigo-400 font-semibold truncate">Event & Club Suite</span>
            </div>
          )}

          {isMobile ? (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#17243B] transition-all ml-auto"
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#17243B] transition-all ml-auto hidden lg:flex"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* ── User Status Card ── */}
        {user && !isMini && (
          <div className="px-3 py-3 shrink-0">
            <div className="rounded-xl p-2.5 bg-[#17243B] border border-[#263650] flex items-center gap-2.5 shadow-sm">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm"
                style={{ background: `linear-gradient(135deg, #4F46E5, #3B82F6)` }}
              >
                {user.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
                <p className={`text-[10px] font-semibold truncate ${roleMeta.color}`}>{user.roleDisplayName}</p>
              </div>
              <Zap size={13} className="text-indigo-400 shrink-0" />
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.group && !isMini && (
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1">
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
                      title={isMini ? item.label : undefined}
                      className={[
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative',
                        isMini ? 'justify-center px-2' : '',
                        isActive
                          ? 'text-white nav-active font-bold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-[#17243B]/60',
                      ].join(' ')}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#4F46E5] shadow-[0_0_8px_#4F46E5]" />
                      )}
                      <span className={`shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-300'}`}>
                        {item.icon}
                      </span>
                      {!isMini && <span className="truncate flex-1">{item.label}</span>}
                      {!isMini && item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
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
        <div className="p-3 shrink-0 border-t border-[#263650]">
          <button
            onClick={handleLogout}
            title={isMini ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-all group ${
              isMini ? 'justify-center px-2' : ''
            }`}
          >
            <LogOut size={16} className="group-hover:text-rose-400 transition-colors shrink-0" />
            {!isMini && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 overflow-hidden transition-all duration-300 z-20 ${
          collapsed ? 'w-18' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden flex flex-col overflow-hidden shadow-2xl">
            <SidebarContent isMobile />
          </aside>
        </>
      )}
    </>
  );
}
