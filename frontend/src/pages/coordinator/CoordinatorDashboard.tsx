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
  ArrowRight,
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

const COLORS = ['#25547b', '#0d9488', '#d97706', '#dc2626', '#64748b', '#7c3aed'];

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
    return clubEvents.reduce((acc, curr) => acc + curr.registeredCount, 0);
  }, [clubEvents]);

  // Chart data: Event attendance & registration comparison
  const eventPerformanceData = useMemo(() => {
    return clubEvents.slice(0, 5).map((e) => ({
      name: e.title.length > 18 ? e.title.slice(0, 16) + '...' : e.title,
      Registrations: e.registeredCount,
      Capacity: e.maxCapacity,
    }));
  }, [clubEvents]);

  // Chart data: Expenses by Category
  const expenseChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expenses
      .filter((e) => e.clubId === club.clubId)
      .forEach((exp) => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [expenses, club]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <Breadcrumbs
        items={[{ label: 'Coordinator', path: '/coordinator/dashboard' }, { label: 'Dashboard' }]}
      />

      {/* Hero Welcome Banner */}
      <div className="relative bg-gradient-to-br from-violet-900 via-purple-900 to-blue-900 rounded-2xl p-6 sm:p-7 text-white shadow-xl overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-violet-500/20 blur-2xl animate-pulse-slow" />
        <div className="absolute -bottom-8 right-24 w-36 h-36 rounded-full bg-purple-400/20 blur-2xl animate-float" />
        <div className="absolute top-4 left-1/3 w-24 h-24 rounded-full bg-blue-500/10 blur-xl" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/15 text-purple-200 px-3 py-1 rounded-full border border-white/10">
                <Sparkles size={11} className="text-purple-300" />
                {club.name} · Leadership Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
              Welcome, {user?.fullName || 'Chris Martinez'}! 👋
            </h1>
            <p className="text-purple-100/80 text-xs sm:text-sm mt-2 max-w-xl leading-relaxed">
              Manage your club profile, submit multi-level event proposals, book campus venues, and monitor
              budget allocation in real time.
            </p>
            <div className="flex items-center gap-2 mt-5 flex-wrap">
              <Link to="/coordinator/events/create">
                <Button
                  size="xs"
                  leftIcon={<PlusCircle size={13} />}
                  className="bg-purple-500 hover:bg-purple-400 text-white font-bold border-0 shadow-lg"
                >
                  Create New Event
                </Button>
              </Link>
              <Link to="/coordinator/members">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Users size={13} />}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                >
                  Member Requests ({pendingMemberRequests.length})
                </Button>
              </Link>
              <Link to="/coordinator/budget">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<DollarSign size={13} />}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                >
                  Manage Budget
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Budget Health Pill */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 shrink-0 text-right self-start md:self-auto min-w-[200px]">
            <p className="text-xs text-purple-200 uppercase font-semibold">Remaining Budget</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">₹{club.remainingBudget.toLocaleString()}</p>
            <p className="text-[11px] text-purple-200/70 mt-1">
              {Math.round((club.totalExpenses / club.allocatedBudget) * 100)}% utilized of ₹{club.allocatedBudget.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Action Required Alert Banner */}
      {changesRequestedEvents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm text-amber-900">
            <strong>Changes Requested on Event Proposal:</strong> Reviewers requested modifications on{' '}
            <strong>"{changesRequestedEvents[0].title}"</strong>. Please revise details and resubmit.
          </div>
          <Link to={`/coordinator/events/edit/${changesRequestedEvents[0].eventId}`}>
            <Button variant="secondary" size="xs">
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
          icon={<Users size={20} className="text-brand-700" />}
          iconBg="bg-brand-100"
        />
        <StatCard
          title="Events Organized"
          value={clubEvents.length}
          subtitle={`${upcomingEvents.length} currently upcoming`}
          icon={<Calendar size={20} className="text-teal-600" />}
          iconBg="bg-teal-100"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          subtitle="Awaiting Advisor/Admin"
          icon={<Clock size={20} className="text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <StatCard
          title="Event Registrations"
          value={totalClubRegistrations}
          subtitle="Cumulative campus sign-ups"
          icon={<ClipboardList size={20} className="text-indigo-600" />}
          iconBg="bg-indigo-100"
        />
        <StatCard
          title="Allocated Budget"
          value={`₹${(club.allocatedBudget / 1000).toFixed(0)}k`}
          subtitle="Fiscal Year 2026-27"
          icon={<DollarSign size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-100"
        />
        <StatCard
          title="Total Expenses"
          value={`₹${(club.totalExpenses / 1000).toFixed(0)}k`}
          subtitle={`${expenses.length} claims filed`}
          icon={<TrendingUp size={20} className="text-red-600" />}
          iconBg="bg-red-100"
        />
        <StatCard
          title="Remaining Balance"
          value={`₹${(club.remainingBudget / 1000).toFixed(0)}k`}
          subtitle="Available for allocation"
          icon={<CheckCircle2 size={20} className="text-emerald-700" />}
          iconBg="bg-emerald-100"
        />
        <StatCard
          title="Pending Tasks"
          value={pendingApprovals.length + pendingMemberRequests.length + changesRequestedEvents.length}
          subtitle="Actions requiring attention"
          icon={<FileCheck2 size={20} className="text-purple-600" />}
          iconBg="bg-purple-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Event Performance */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Event Registration vs Capacity</h3>
              <p className="text-xs text-slate-400">Seat fill metrics for recent club events</p>
            </div>
            <Link to="/coordinator/reports" className="text-xs text-brand-700 font-semibold hover:underline">
              Detailed Analytics →
            </Link>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Registrations" fill="#25547b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Capacity" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Budget Breakdown */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Budget Utilization by Category</h3>
              <p className="text-xs text-slate-400">Expense distribution across club operations</p>
            </div>
            <Link to="/coordinator/budget" className="text-xs text-brand-700 font-semibold hover:underline">
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
                  <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
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
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Upcoming Club Events</h3>
              <p className="text-xs text-slate-400">Active events accepting student registrations</p>
            </div>
            <Link to="/coordinator/events" className="text-xs text-brand-700 font-semibold hover:underline">
              View All ({clubEvents.length})
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No upcoming events scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{ev.title}</h4>
                    <p className="text-slate-500 mt-0.5">
                      {formatDate(ev.startTime)} · {ev.venue?.name || 'TBD'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-brand-800 block">
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
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Action Items & Workflow Status</h3>
              <p className="text-xs text-slate-400">Approvals, membership applications, and reviews</p>
            </div>
            <Link to="/coordinator/events" className="text-xs text-brand-700 font-semibold hover:underline">
              Events Manager
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            {pendingMemberRequests.length > 0 && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-indigo-900 block font-bold">
                    {pendingMemberRequests.length} Membership Request(s) Pending
                  </strong>
                  <span className="text-indigo-700 text-[11px]">
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
                className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <strong className="text-amber-900 block font-bold truncate max-w-[220px]">
                    {p.title}
                  </strong>
                  <span className="text-amber-700 text-[11px]">
                    Awaiting {p.approvalStage === 'club_advisor' ? 'Level 1: Faculty Advisor' : 'Level 2: Student Affairs'}
                  </span>
                </div>
                <Badge variant="amber" size="sm" dot>
                  In Review
                </Badge>
              </div>
            ))}

            {pendingApprovals.length === 0 && pendingMemberRequests.length === 0 && (
              <div className="text-center py-6 text-slate-400">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                <p>All coordinator tasks and approvals are up to date!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
