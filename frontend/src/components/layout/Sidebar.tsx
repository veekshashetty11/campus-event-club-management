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
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Browse Events', path: '/student/events', icon: <Calendar size={17} /> },
  { label: 'My Registrations', path: '/student/registrations', icon: <ClipboardList size={17} /> },
  { label: 'My Clubs', path: '/student/clubs', icon: <Users size={17} /> },
  { label: 'Certificates', path: '/student/certificates', icon: <Award size={17} /> },
  { label: 'Notifications', path: '/student/notifications', icon: <Bell size={17} /> },
  { label: 'Profile', path: '/student/profile', icon: <UserCircle size={17} /> },
];

const COORDINATOR_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/coordinator/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Club Management', path: '/coordinator/club', icon: <Building2 size={17} /> },
  { label: 'Member Roster', path: '/coordinator/members', icon: <Users size={17} /> },
  { label: 'Events List', path: '/coordinator/events', icon: <Calendar size={17} /> },
  { label: 'Create Event', path: '/coordinator/events/create', icon: <PlusCircle size={17} /> },
  { label: 'Registrations', path: '/coordinator/registrations', icon: <ClipboardList size={17} /> },
  { label: 'Attendance', path: '/coordinator/attendance', icon: <CheckSquare size={17} /> },
  { label: 'Budget & Expenses', path: '/coordinator/budget', icon: <Receipt size={17} /> },
  { label: 'Sponsors', path: '/coordinator/sponsors', icon: <HandCoins size={17} /> },
  { label: 'Reports', path: '/coordinator/reports', icon: <BarChart3 size={17} /> },
  { label: 'Notifications', path: '/coordinator/notifications', icon: <Bell size={17} /> },
];

const ADVISOR_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/advisor/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Event Approvals', path: '/advisor/approvals', icon: <FileCheck2 size={17} /> },
  { label: 'Assigned Clubs', path: '/advisor/clubs', icon: <Users size={17} /> },
  { label: 'Reports & Analytics', path: '/advisor/reports', icon: <BarChart3 size={17} /> },
  { label: 'Notifications', path: '/advisor/notifications', icon: <Bell size={17} /> },
  { label: 'Profile', path: '/advisor/profile', icon: <UserCircle size={17} /> },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Event Approvals', path: '/admin/approvals', icon: <FileCheck2 size={17} /> },
  { label: 'All Events', path: '/admin/events', icon: <Calendar size={17} /> },
  { label: 'All Clubs', path: '/admin/clubs', icon: <Building2 size={17} /> },
  { label: 'User Directory', path: '/admin/users', icon: <Users size={17} /> },
  { label: 'Audit Activity', path: '/admin/audit', icon: <ShieldAlert size={17} /> },
  { label: 'System Reports', path: '/admin/reports', icon: <BarChart3 size={17} /> },
  { label: 'Settings', path: '/admin/settings', icon: <Settings size={17} /> },
];

const VENUE_MANAGER_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/venue-manager/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Campus Venues', path: '/venue-manager/venues', icon: <MapPin size={17} /> },
  { label: 'Venue Bookings', path: '/venue-manager/bookings', icon: <BookOpen size={17} /> },
  { label: 'Booking Calendar', path: '/venue-manager/calendar', icon: <CalendarRange size={17} /> },
  { label: 'Equipment Inventory', path: '/venue-manager/equipment', icon: <Boxes size={17} /> },
  { label: 'Equipment Bookings', path: '/venue-manager/equipment-bookings', icon: <ClipboardList size={17} /> },
  { label: 'Facility Reports', path: '/venue-manager/reports', icon: <BarChart3 size={17} /> },
  { label: 'Notifications', path: '/venue-manager/notifications', icon: <Bell size={17} /> },
];

function getNav(role: UserRole): NavItem[] {
  switch (role) {
    case 'student':
      return STUDENT_NAV;
    case 'event_coordinator':
    case 'club_president':
      return COORDINATOR_NAV;
    case 'club_advisor':
      return ADVISOR_NAV;
    case 'student_affairs':
    case 'administrator':
      return ADMIN_NAV;
    case 'venue_manager':
      return VENUE_MANAGER_NAV;
    default:
      return STUDENT_NAV;
  }
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = user ? getNav(user.role) : STUDENT_NAV;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-brand-800 flex items-center justify-center shrink-0 shadow-sm">
          <GraduationCap size={20} className="text-white" />
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-bold text-brand-900 truncate">Campus Events</span>
          <span className="text-xs text-slate-500 truncate">& Club Management</span>
        </div>
        <button
          onClick={onClose}
          className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* User Status Card */}
      {user && (
        <div className="px-4 pt-3.5 pb-1">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user.fullName}</p>
              <p className="text-[11px] text-brand-700 font-medium truncate">{user.roleDisplayName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-2.5 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                isActive
                  ? 'bg-brand-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')}
            >
              <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Sign Out */}
      <div className="px-3 py-3 border-t border-slate-100 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} className="text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 overflow-hidden shadow-xs">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-dropdown lg:hidden flex flex-col overflow-hidden">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
