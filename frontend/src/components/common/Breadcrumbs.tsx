import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  autoGenerate?: boolean;
}

const pathLabels: Record<string, string> = {
  student: 'Student',
  coordinator: 'Coordinator',
  advisor: 'Advisor',
  administrator: 'Administrator',
  'venue-manager': 'Venue Manager',
  dashboard: 'Dashboard',
  events: 'Events',
  browse: 'Browse Events',
  registrations: 'My Registrations',
  clubs: 'My Clubs',
  certificates: 'Certificates',
  notifications: 'Notifications',
  profile: 'Profile',
  venues: 'Venues',
  bookings: 'Bookings',
  equipment: 'Equipment',
  calendar: 'Calendar',
  reports: 'Reports',
  approvals: 'Approvals',
  budget: 'Budget',
  sponsors: 'Sponsors',
  attendance: 'Attendance',
  users: 'Users',
  audit: 'Audit Log',
  settings: 'Settings',
};

export default function Breadcrumbs({ items, autoGenerate = false }: BreadcrumbsProps) {
  const location = useLocation();

  let crumbs: BreadcrumbItem[] = items ?? [];

  if (autoGenerate && !items) {
    const segments = location.pathname.split('/').filter(Boolean);
    crumbs = segments.map((seg, idx) => ({
      label: pathLabels[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
      path:
        idx < segments.length - 1
          ? '/' + segments.slice(0, idx + 1).join('/')
          : undefined,
    }));
  }

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
      <Link
        to="/"
        className="flex items-center gap-1 text-slate-500 hover:text-indigo-400 transition-colors"
      >
        <Home size={13} />
      </Link>
      {crumbs.map((crumb, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-slate-600" />
          {crumb.path ? (
            <Link
              to={crumb.path}
              className="text-slate-400 hover:text-indigo-400 transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-slate-200 font-semibold">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
