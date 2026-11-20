import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  ClipboardList,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  FileCheck2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { formatDate } from '../../utils';

const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const { events, clubs, memberships, expenses, approvals, registrations, notifications } = useManagement();

  // Find primary club for coordinator (CodeCraft Society by default)
  const club = clubs[0] || {
    clubId: 1,
    name: 'CodeCraft Society',
    memberCount: 112,
    allocatedBudget: 120000,
    totalExpenses: 78500,
    remainingBudget: 41500,
  };

  const clubEvents = useMemo(() => events.filter((e) => e.clubId === club.clubId), [events, club]);
  const now = new Date();
  const upcomingEvents = useMemo(
    () => clubEvents.filter((e) => e.status === 'published' && new Date(e.endTime) >= now),
    [clubEvents, now]
  );
  const pendingApprovals = useMemo(
    () => clubEvents.filter((e) => e.status === 'pending_approval'),
    [clubEvents]
  );
  const changesRequestedEvents = useMemo(
    () => clubEvents.filter((e) => e.status === 'changes_requested'),
    [clubEvents]
  );
  const pendingMemberRequests = useMemo(
    () => memberships.filter((m) => m.clubId === club.clubId && m.membershipStatus === 'pending'),
    [memberships, club]
  );

  const totalClubRegistrations = useMemo(() => {
    return clubEvents.reduce((sum, e) => sum + e.registeredCount, 0);
  }, [clubEvents]);

  // Chart data: Event registrations vs capacity
  const eventPerformanceData = useMemo(() => {
    return clubEvents.slice(0, 5).map((e) => ({
      name: e.title.length > 14 ? e.title.substring(0, 12) + '...' : e.title,
      Registrations: e.registeredCount,
      Capacity: e.maxCapacity,
    }));
  }, [clubEvents]);

  // Chart data: Expense by category
  const expenseChartData = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses
      .filter((exp) => exp.clubId === club.clubId)
      .forEach((exp) => {
        cats[exp.category] = (cats[exp.category] || 0) + exp.amount;
      });
    return Object.entries(cats).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [expenses, club]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto text-slate-100">
      <Breadcrumbs
        items={[{ label: 'Coordinator', path: '/coordinator/dashboard' }, { label: 'Dashboard' }]}
      />

      {/* Hero Welcome Banner */}
      <div className="relative bg-gradient-to-br from-[#111C32] via-[#17243B] to-[#0D1426] border border-[#263650] rounded-2xl px-6 py-8 text-white shadow-2xl overflow-hidden">
        {/* Glow accents */}
        <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-[#4F46E5]/15 blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute -bottom-6 right-20 w-48 h-48 rounded-full bg-[#3B82F6]/15 blur-3xl animate-float pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#17243B] text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
                <Sparkles size={11} className="text-indigo-400" />
                {club.name} · Leadership Suite
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome, {user?.fullName || 'Chris Martinez'}! 👋
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-xl leading-relaxed">
              Manage your club profile, submit multi-level event proposals, reserve campus venues, and monitor
              budget allocation in real time.
            </p>
            <div className="flex items-center gap-2.5 mt-5 flex-wrap">
              <Link to="/coordinator/events/create">
                <Button
                  size="xs"
                  leftIcon={<PlusCircle size={13} />}
                  className="bg-gradient-to-r from-[#4F46E5] to-[#3B82F6] hover:opacity-95 text-white font-bold border-0 shadow-md"
                >
                  Create New Event
                </Button>
              </Link>
              <Link to="/coordinator/members">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Users size={13} />}
                >
                  Member Requests ({pendingMemberRequests.length})
                </Button>
              </Link>
              <Link to="/coordinator/budget">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<DollarSign size={13} />}
                >
                  Manage Budget
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Budget Health Pill */}
          <div className="bg-[#17243B]/80 backdrop-blur-md border border-[#263650] rounded-2xl p-4 shrink-0 text-right self-start md:self-auto min-w-[210px] shadow-lg">
            <p className="text-xs text-indigo-300 uppercase font-bold tracking-wider">Remaining Budget</p>
            <p className="text-2xl sm:text-3xl font-black mt-1 text-white">₹{club.remainingBudget.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              {Math.round((club.totalExpenses / club.allocatedBudget) * 100)}% utilized of ₹{club.allocatedBudget.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Action Required Alert Banner */}
      {changesRequestedEvents.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-700/50 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm text-amber-200">
            <strong>Changes Requested on Event Proposal:</strong> Reviewers requested modifications on{' '}
            <strong className="text-white">"{changesRequestedEvents[0].title}"</strong>. Please revise details and resubmit.
          </div>
          <Link to={`/coordinator/events/create`}>
            <Button variant="primary" size="xs">
              Revise & Resubmit
            </Button>
          </Link>
        </div>
      )}

      {/* 8 Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Club Members"
          value={club.memberCount}
          subtitle={`${pendingMemberRequests.length} pending applications`}
          icon={<Users size={20} className="text-indigo-400" />}
          gradient="from-[#4F46E5] to-[#3B82F6]"
        />
        <StatCard
          title="Events Organized"
          value={clubEvents.length}
          subtitle={`${upcomingEvents.length} currently upcoming`}
          icon={<Calendar size={20} className="text-cyan-400" />}
          gradient="from-[#06B6D4] to-[#0284C7]"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          subtitle="Awaiting Advisor/Admin"
          icon={<Clock size={20} className="text-amber-400" />}
          gradient="from-[#F59E0B] to-[#D97706]"
        />
        <StatCard
          title="Event Registrations"
          value={totalClubRegistrations}
          subtitle="Cumulative campus sign-ups"
          icon={<ClipboardList size={20} className="text-blue-400" />}
          gradient="from-[#3B82F6] to-[#1D4ED8]"
        />
        <StatCard
          title="Allocated Budget"
          value={`₹${(club.allocatedBudget / 1000).toFixed(0)}k`}
          subtitle="Fiscal Year 2026-27"
          icon={<DollarSign size={20} className="text-emerald-400" />}
          gradient="from-[#10B981] to-[#059669]"
        />
        <StatCard
          title="Total Expenses"
          value={`₹${(club.totalExpenses / 1000).toFixed(0)}k`}
          subtitle={`${expenses.length} claims filed`}
          icon={<TrendingUp size={20} className="text-rose-400" />}
          gradient="from-[#F43F5E] to-[#E11D48]"
        />
        <StatCard
          title="Remaining Balance"
          value={`₹${(club.remainingBudget / 1000).toFixed(0)}k`}
          subtitle="Available for allocation"
          icon={<CheckCircle2 size={20} className="text-teal-400" />}
          gradient="from-[#0D9488] to-[#14B8A6]"
        />
        <StatCard
          title="Pending Tasks"
          value={pendingApprovals.length + pendingMemberRequests.length + changesRequestedEvents.length}
          subtitle="Actions requiring attention"
          icon={<FileCheck2 size={20} className="text-purple-400" />}
          gradient="from-[#8B5CF6] to-[#6D28D9]"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Event Performance */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Event Registration vs Capacity</h3>
              <p className="text-xs text-slate-400">Seat fill metrics for recent club events</p>
            </div>
            <Link to="/coordinator/reports" className="text-xs text-indigo-400 font-semibold hover:underline">
              Detailed Analytics →
            </Link>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} stroke="#263650" interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} stroke="#263650" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C32', borderColor: '#263650', color: '#F1F5F9', borderRadius: '12px' }}
                />
                <Bar dataKey="Registrations" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Capacity" fill="#263650" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Budget Breakdown */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Budget Utilization by Category</h3>
              <p className="text-xs text-slate-400">Expense distribution across club operations</p>
            </div>
            <Link to="/coordinator/budget" className="text-xs text-indigo-400 font-semibold hover:underline">
              Manage Expenses →
            </Link>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {expenseChartData.length === 0 ? (
              <span className="text-xs text-slate-400">No expenses logged yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111C32', borderColor: '#263650', color: '#F1F5F9', borderRadius: '12px' }}
                    formatter={(value: unknown) => `₹${Number(value).toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Two Column Layout: Upcoming Events & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Club Events */}
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#263650]">
            <div>
              <h3 className="font-bold text-white text-sm">Upcoming Club Events</h3>
              <p className="text-xs text-slate-400">Active events accepting student registrations</p>
            </div>
            <Link to="/coordinator/events" className="text-xs text-indigo-400 font-semibold hover:underline">
              View All ({clubEvents.length})
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No upcoming events scheduled.</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className="p-3 bg-[#17243B] border border-[#263650] rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate">{ev.title}</h4>
                    <p className="text-slate-400 mt-0.5">
                      {formatDate(ev.startTime)} · {ev.venue?.name || 'TBD'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-indigo-300 block mb-1">
                      {ev.registeredCount}/{ev.maxCapacity} Seats
                    </span>
                    <Badge variant="teal" size="sm">
                      Published
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending Tasks & Approval Tracking */}
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#263650]">
            <div>
              <h3 className="font-bold text-white text-sm">Action Items & Workflow Status</h3>
              <p className="text-xs text-slate-400">Approvals, membership applications, and reviews</p>
            </div>
            <Link to="/coordinator/events" className="text-xs text-indigo-400 font-semibold hover:underline">
              Events Manager
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            {pendingMemberRequests.length > 0 && (
              <div className="p-3.5 bg-indigo-950/40 border border-indigo-700/50 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-white block font-bold">
                    {pendingMemberRequests.length} Membership Request(s) Pending
                  </strong>
                  <span className="text-indigo-300 text-[11px]">
                    Candidates waiting for coordinator review to join {club.name}.
                  </span>
                </div>
                <Link to="/coordinator/members">
                  <Button variant="primary" size="xs">
                    Review
                  </Button>
                </Link>
              </div>
            )}

            {pendingApprovals.map((p) => (
              <div
                key={p.eventId}
                className="p-3.5 bg-amber-950/40 border border-amber-700/50 rounded-xl flex items-center justify-between"
              >
                <div>
                  <strong className="text-white block font-bold truncate max-w-[220px]">
                    {p.title}
                  </strong>
                  <span className="text-amber-300 text-[11px]">
                    Awaiting {p.approvalStage === 'club_advisor' ? 'Level 1: Faculty Advisor' : 'Level 2: Student Affairs'}
                  </span>
                </div>
                <Badge variant="amber" size="sm" dot>
                  In Review
                </Badge>
              </div>
            ))}

            {pendingApprovals.length === 0 && pendingMemberRequests.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 size={26} className="mx-auto text-emerald-400 mb-1.5" />
                <p className="font-semibold text-slate-300">All coordinator tasks are up to date!</p>
                <p className="text-xs text-slate-500 mt-0.5">No pending approval reviews or applications require action.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
