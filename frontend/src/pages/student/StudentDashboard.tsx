import { useState, useMemo } from 'react';
import {
  CalendarDays,
  CheckCircle,
  Award,
  Users,
  Star,
  Search,
  ArrowRight,
  Ticket,
  Bell,
  UserCircle,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';
import StatCard from '../../components/common/StatCard';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import UpcomingEventCard from '../../components/dashboard/UpcomingEventCard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import MyRegistrationsTable from '../../components/dashboard/MyRegistrationsTable';
import MyClubsGrid from '../../components/dashboard/MyClubsGrid';
import { todayFriendly, firstName } from '../../utils';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { events, registrations, memberships, activities, stats, unreadNotificationsCount } = useStudent();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique categories from events
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(events.map((e) => e.category)))];
  }, [events]);

  // Filtered upcoming events for dashboard preview
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((ev) => {
        const isUpcoming = ev.status === 'published' && new Date(ev.endTime) >= now;
        const matchCat = categoryFilter === 'All' || ev.category === categoryFilter;
        const s = searchQuery.toLowerCase();
        const matchSearch =
          searchQuery === '' ||
          ev.title.toLowerCase().includes(s) ||
          ev.clubName.toLowerCase().includes(s) ||
          ev.category.toLowerCase().includes(s);

        return isUpcoming && matchCat && matchSearch;
      })
      .slice(0, 6); // display up to 6 on dashboard
  }, [events, categoryFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <Breadcrumbs
        items={[{ label: 'Student', path: '/student/dashboard' }, { label: 'Dashboard' }]}
      />

      {/* ── A. Welcome Section ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-teal-800 rounded-2xl px-6 py-7 text-white shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <span className="text-brand-200 text-xs font-semibold uppercase tracking-wider">
              {todayFriendly()}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
              Welcome back, {firstName(user?.fullName ?? 'Student')}! 👋
            </h1>
            <p className="text-brand-100 text-sm mt-1.5 max-w-xl leading-relaxed">
              You are currently registered for <strong>{stats.upcomingEvents} upcoming events</strong>. Check
              in on time to maintain eligibility for verifiable credentials and activity points.
            </p>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2.5 mt-4 flex-wrap">
              <Link to="/student/events">
                <Button
                  variant="secondary"
                  size="xs"
                  leftIcon={<Compass size={14} />}
                  className="bg-teal-500 hover:bg-teal-600 text-white font-semibold"
                >
                  Browse Events
                </Button>
              </Link>
              <Link to="/student/registrations">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Ticket size={14} />}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  My Passes
                </Button>
              </Link>
              <Link to="/student/clubs">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Users size={14} />}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  Campus Clubs
                </Button>
              </Link>
            </div>
          </div>

          {/* Right points badge */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-5 py-4 shrink-0 self-start md:self-auto">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Star size={24} className="fill-amber-300" />
            </div>
            <div>
              <p className="text-xs text-brand-200 uppercase font-semibold tracking-wider">Activity Points</p>
              <p className="text-3xl font-black tracking-tight">{stats.totalPoints}</p>
              <p className="text-[11px] text-teal-200">Across {stats.eventsAttended} attended events</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── B. Dynamic Statistics Cards ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Events Registered"
          value={stats.eventsRegistered}
          subtitle="Active reservations & tickets"
          icon={<CalendarDays size={20} className="text-brand-700" />}
          iconBg="bg-brand-100"
        />
        <StatCard
          title="Events Attended"
          value={stats.eventsAttended}
          subtitle="Verified check-ins recorded"
          icon={<CheckCircle size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-100"
        />
        <StatCard
          title="Certificates Earned"
          value={stats.certificatesEarned}
          subtitle="Issued & verified credentials"
          icon={<Award size={20} className="text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <StatCard
          title="Club Memberships"
          value={stats.clubMemberships}
          subtitle="Active campus organizations"
          icon={<Users size={20} className="text-teal-600" />}
          iconBg="bg-teal-100"
        />
      </div>

      {/* ── C. Upcoming Events Section ─────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Upcoming Campus Events</h2>
            <p className="text-xs text-slate-500">Discover and register for open workshops, labs, and hackathons</p>
          </div>
          <Link
            to="/student/events"
            className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View Complete Catalog ({events.length})</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter upcoming events by title or club..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={[
                  'text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap',
                  categoryFilter === cat
                    ? 'bg-brand-800 text-white border-brand-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-800',
                ].join(' ')}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Events Cards */}
        {upcomingEvents.length === 0 ? (
          <Card className="text-center py-12 text-slate-400">
            No upcoming events matching your filter.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingEvents.map((event) => (
              <UpcomingEventCard key={event.eventId} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* ── D. My Registrations & E. My Clubs Previews ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* D. Registrations Preview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">My Registrations</h2>
              <p className="text-xs text-slate-500">Your recent event bookings and pass status</p>
            </div>
            <Link
              to="/student/registrations"
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
            >
              <span>Manage Passes</span>
              <ArrowRight size={13} />
            </Link>
          </div>
          <MyRegistrationsTable registrations={registrations.slice(0, 4)} />
        </section>

        {/* E. Clubs Preview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">My Clubs</h2>
              <p className="text-xs text-slate-500">Student societies you belong to</p>
            </div>
            <Link
              to="/student/clubs"
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
            >
              <span>Explore Clubs</span>
              <ArrowRight size={13} />
            </Link>
          </div>
          <MyClubsGrid clubs={memberships} />
        </section>
      </div>

      {/* ── F. Recent Activity Timeline & G. Quick Navigation ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Recent Student Activity</h2>
              <p className="text-xs text-slate-500">Live log of event sign-ups, attendance, and certifications</p>
            </div>
          </div>
          <ActivityFeed activities={activities.slice(0, 6)} />
        </div>

        {/* G. Navigation Quick Links (1 Col) */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800">Quick Navigation</h2>
          <Card padding="sm" className="space-y-2">
            {[
              {
                label: 'Browse Campus Events',
                path: '/student/events',
                desc: 'Discover upcoming hackathons & workshops',
                icon: <Compass size={16} className="text-brand-700" />,
              },
              {
                label: 'My Registrations & Passes',
                path: '/student/registrations',
                desc: 'Access QR codes & manage active seats',
                icon: <Ticket size={16} className="text-teal-600" />,
              },
              {
                label: 'Club Affiliations',
                path: '/student/clubs',
                desc: 'Browse student chapters & request to join',
                icon: <Users size={16} className="text-indigo-600" />,
              },
              {
                label: 'Official Certificates',
                path: '/student/certificates',
                desc: 'Download cryptographically signed certificates',
                icon: <Award size={16} className="text-amber-600" />,
              },
              {
                label: 'Notification Center',
                path: '/student/notifications',
                desc: `${unreadNotificationsCount} unread alerts waiting`,
                icon: <Bell size={16} className="text-red-500" />,
              },
              {
                label: 'Student Academic Profile',
                path: '/student/profile',
                desc: 'View student ID, department & points',
                icon: <UserCircle size={16} className="text-slate-600" />,
              },
            ].map((navItem, idx) => (
              <Link
                key={idx}
                to={navItem.path}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    {navItem.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-brand-800 transition-colors">
                      {navItem.label}
                    </h4>
                    <p className="text-[11px] text-slate-400">{navItem.desc}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-700 transition-colors" />
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
