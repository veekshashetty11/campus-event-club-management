import { useState, useMemo } from 'react';
import {
  CalendarDays,
  CheckCircle,
  Award,
  Users,
  Search,
  ArrowRight,
  Ticket,
  Bell,
  UserCircle,
  Compass,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';
import StatCard from '../../components/common/StatCard';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import UpcomingEventCard from '../../components/dashboard/UpcomingEventCard';
import AiRecommendedSection from '../../components/dashboard/AiRecommendedSection';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import MyRegistrationsTable from '../../components/dashboard/MyRegistrationsTable';
import MyClubsGrid from '../../components/dashboard/MyClubsGrid';
import CampusPassport from '../../components/common/CampusPassport';
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
        // Any approved or published campus event
        const isApprovedOrPublished =
          ev.status === 'published' ||
          ev.status === 'approved' ||
          ev.approvalStage === 'final_approved';
        const evDate = ev.endTime
          ? new Date(ev.endTime)
          : ev.startDate
          ? new Date(ev.startDate)
          : ev.startTime
          ? new Date(ev.startTime)
          : null;
        const isUpcoming = isApprovedOrPublished && (!evDate || evDate >= now);
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto text-slate-100">
      <Breadcrumbs
        items={[{ label: 'Student', path: '/student/dashboard' }, { label: 'Dashboard' }]}
      />

      {/* ── A. Welcome Hero Section ─────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#111C32] via-[#17243B] to-[#0D1426] border border-[#263650] rounded-2xl px-6 py-8 text-white shadow-2xl overflow-hidden">
        {/* Animated ambient background orbs */}
        <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-[#4F46E5]/15 blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute -bottom-6 right-20 w-48 h-48 rounded-full bg-[#06B6D4]/15 blur-3xl animate-float pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#17243B] text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {todayFriendly()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {firstName(user?.fullName ?? 'Student')}! 👋
            </h1>
            <p className="text-slate-300 text-sm mt-2 max-w-xl leading-relaxed">
              You have <span className="font-bold text-cyan-400">{stats.upcomingEvents} upcoming events</span> registered. Check in on time to earn verified credentials and student development activity points.
            </p>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2.5 mt-5 flex-wrap">
              <Link to="/student/events">
                <Button
                  size="xs"
                  className="bg-gradient-to-r from-[#4F46E5] to-[#3B82F6] hover:opacity-95 text-white font-bold border-0 shadow-md"
                  leftIcon={<Compass size={13} />}
                >
                  Browse Events
                </Button>
              </Link>
              <Link to="/student/registrations">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Ticket size={13} />}
                >
                  My Passes
                </Button>
              </Link>
              <Link to="/student/clubs">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Users size={13} />}
                >
                  Campus Clubs
                </Button>
              </Link>
              {unreadNotificationsCount > 0 && (
                <Link to="/student/notifications">
                  <Button
                    variant="danger"
                    size="xs"
                    leftIcon={<Bell size={13} />}
                  >
                    {unreadNotificationsCount} Alerts
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats summary pills */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            {[
              { label: 'Events Attended', value: stats.eventsAttended, emoji: '✅', color: 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300' },
              { label: 'Activity Points', value: stats.totalPoints, emoji: '⭐', color: 'bg-amber-950/50 border-amber-700/50 text-amber-300' },
              { label: 'Clubs Joined', value: stats.clubMemberships, emoji: '🏛️', color: 'bg-indigo-950/50 border-indigo-700/50 text-indigo-300' },
              { label: 'Certificates', value: stats.certificatesEarned, emoji: '🎓', color: 'bg-cyan-950/50 border-cyan-700/50 text-cyan-300' },
            ].map((s) => (
              <div key={s.label} className={`flex flex-col gap-0.5 p-3 rounded-xl border ${s.color} bg-[#17243B]/80 text-center min-w-[95px] shadow-sm`}>
                <span className="text-xl">{s.emoji}</span>
                <span className="text-xl font-black text-white">{s.value ?? 0}</span>
                <span className="text-[10px] font-semibold text-slate-400 leading-tight">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── B. Bento Grid: Campus Passport & High-Impact Stats ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bento Cell 1: Campus Passport / Achievement Wall (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              Campus Passport & Achievement Wall
            </h2>
            <Link
              to="/student/certificates"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>My Certificates ({stats.certificatesEarned})</span>
              <ArrowRight size={13} />
            </Link>
          </div>
          <CampusPassport
            totalPoints={stats.totalPoints}
            eventsAttended={stats.eventsAttended}
            clubMemberships={stats.clubMemberships}
            certificatesEarned={stats.certificatesEarned}
            studentName={user?.fullName || 'Student'}
            compact
          />
        </div>

        {/* Bento Cell 2: Key Operational Metric Scorecards (1 Col) */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Award size={18} className="text-cyan-400" />
            Participation Snapshot
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3.5">
            <StatCard
              title="Active Reservations"
              value={stats.eventsRegistered}
              subtitle="Confirmed event passes & bookings"
              icon={<CalendarDays size={20} className="text-indigo-400" />}
              gradient="from-[#4F46E5] to-[#3B82F6]"
            />
            <StatCard
              title="Verified Check-Ins"
              value={stats.eventsAttended}
              subtitle="Official attendance logged"
              icon={<CheckCircle size={20} className="text-emerald-400" />}
              gradient="from-[#10B981] to-[#0D9488]"
            />
            <StatCard
              title="Club Affiliations"
              value={stats.clubMemberships}
              subtitle="Registered member organizations"
              icon={<Users size={20} className="text-cyan-400" />}
              gradient="from-[#06B6D4] to-[#3B82F6]"
            />
          </div>
        </div>
      </div>

      {/* ── AI Recommendation Engine Section ───────────────────── */}
      <AiRecommendedSection />

      {/* ── C. Upcoming Events Section ─────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">Upcoming Campus Events</h2>
            <p className="text-xs text-slate-400">Discover and register for open workshops, labs, and hackathons</p>
          </div>
          <Link
            to="/student/events"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View Complete Catalog ({events.length})</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter upcoming events by title or club..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-[#263650] bg-[#17243B] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={[
                  'text-xs font-medium px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap',
                  categoryFilter === cat
                    ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-[0_0_12px_rgba(79,70,229,0.4)]'
                    : 'bg-[#17243B] text-slate-300 border-[#263650] hover:border-slate-500 hover:text-white',
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
              <h2 className="text-lg font-black text-white">My Registrations</h2>
              <p className="text-xs text-slate-400">Your recent event bookings and pass status</p>
            </div>
            <Link
              to="/student/registrations"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
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
              <h2 className="text-lg font-black text-white">My Clubs</h2>
              <p className="text-xs text-slate-400">Student societies you belong to</p>
            </div>
            <Link
              to="/student/clubs"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
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
              <h2 className="text-lg font-black text-white">Recent Student Activity</h2>
              <p className="text-xs text-slate-400">Live log of event sign-ups, attendance, and certifications</p>
            </div>
          </div>
          <ActivityFeed activities={activities.slice(0, 6)} />
        </div>

        {/* G. Navigation Quick Links (1 Col) */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Quick Navigation</h2>
          <Card padding="sm" className="space-y-2">
            {[
              {
                label: 'Browse Campus Events',
                path: '/student/events',
                desc: 'Discover upcoming hackathons & workshops',
                icon: <Compass size={16} className="text-indigo-400" />,
              },
              {
                label: 'My Registrations & Passes',
                path: '/student/registrations',
                desc: 'Access QR codes & manage active seats',
                icon: <Ticket size={16} className="text-cyan-400" />,
              },
              {
                label: 'Club Affiliations',
                path: '/student/clubs',
                desc: 'Browse student chapters & request to join',
                icon: <Users size={16} className="text-emerald-400" />,
              },
              {
                label: 'Official Certificates',
                path: '/student/certificates',
                desc: 'Download cryptographically signed credentials',
                icon: <Award size={16} className="text-amber-400" />,
              },
              {
                label: 'Notification Center',
                path: '/student/notifications',
                desc: `${unreadNotificationsCount} unread alerts waiting`,
                icon: <Bell size={16} className="text-rose-400" />,
              },
              {
                label: 'Student Academic Profile',
                path: '/student/profile',
                desc: 'View student ID, department & points',
                icon: <UserCircle size={16} className="text-slate-400" />,
              },
            ].map((navItem, idx) => (
              <Link
                key={idx}
                to={navItem.path}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#17243B] transition-colors group border border-transparent hover:border-[#263650]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#17243B] border border-[#263650] flex items-center justify-center shrink-0">
                    {navItem.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {navItem.label}
                    </h4>
                    <p className="text-[11px] text-slate-400">{navItem.desc}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
