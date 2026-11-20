import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import CampusActivityHeatmap from '../../components/dashboard/CampusActivityHeatmap';
import {
  FileCheck2,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AdministratorDashboard() {
  const { user } = useAuth();
  const { users, clubs, events, approvals, venueBookings, auditLogs } = useManagement();

  const isAffairs = user?.role === 'student_affairs';
  const isAdmin = user?.role === 'administrator';

  const pendingApprovals = useMemo(() => {
    return approvals.filter((a) => {
      if (isAffairs) return a.stage === 'student_affairs' && a.status === 'pending';
      if (isAdmin) return a.stage === 'administrator' && a.status === 'pending';
      return (a.stage === 'student_affairs' || a.stage === 'administrator') && a.status === 'pending';
    });
  }, [approvals, isAffairs, isAdmin]);

  const totalStudents = users.filter((u) => u.role === 'student').length;
  const totalClubs = clubs.length;
  const totalEvents = events.length;
  const activeBookings = venueBookings.filter((b) => b.status === 'approved').length;
  const totalCampusBudget = clubs.reduce((sum, c) => sum + c.allocatedBudget, 0);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [events]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full text-slate-100">
      <Breadcrumbs
        items={[
          { label: 'Administrator', path: '/admin/dashboard' },
          { label: 'Dashboard' },
        ]}
      />

      {/* Hero Welcome Banner */}
      <div className="relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#111C32] via-[#17243B] to-[#0D1426] border border-[#263650] text-white shadow-2xl overflow-hidden">
        {/* Glow accents */}
        <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-rose-600/15 blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute -bottom-8 right-28 w-48 h-48 rounded-full bg-[#4F46E5]/15 blur-3xl animate-float pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17243B] text-xs font-bold mb-3 border border-rose-500/30 text-rose-300">
              <ShieldAlert size={14} className="text-rose-400" />
              {isAffairs ? 'Student Affairs Administration' : 'Campus Systems Governance'}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Welcome, {user?.fullName || 'Administrator'}
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              University-wide overview of extracurricular activities, multi-stage approval pipelines, facility allocations, and student memberships.
            </p>
          </div>

          <Link to="/admin/approvals">
            <Button variant="primary" className="shadow-lg shrink-0 font-bold" leftIcon={<FileCheck2 size={16} />}>
              View Approval Queue ({pendingApprovals.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Key Campus Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-3.5 bg-[#111C32] border border-[#263650] rounded-xl shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Students</p>
          <p className="text-xl font-black text-white mt-1">{totalStudents}</p>
        </div>

        <div className="p-3.5 bg-[#111C32] border border-[#263650] rounded-xl shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Clubs</p>
          <p className="text-xl font-black text-white mt-1">{totalClubs}</p>
        </div>

        <div className="p-3.5 bg-[#111C32] border border-[#263650] rounded-xl shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Events</p>
          <p className="text-xl font-black text-indigo-400 mt-1">{totalEvents}</p>
        </div>

        <div className="p-3.5 bg-amber-950/40 border border-amber-700/50 rounded-xl shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Pending Review</p>
          <p className="text-xl font-black text-amber-400 mt-1">{pendingApprovals.length}</p>
        </div>

        <div className="p-3.5 bg-[#111C32] border border-[#263650] rounded-xl shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Bookings</p>
          <p className="text-xl font-black text-cyan-400 mt-1">{activeBookings}</p>
        </div>

        <div className="p-3.5 bg-emerald-950/40 border border-emerald-700/50 rounded-xl shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Campus Budget</p>
          <p className="text-xl font-black text-emerald-400 mt-1">${(totalCampusBudget / 1000).toFixed(0)}k</p>
        </div>
      </div>

      {/* Main Grid: Pending Approvals & Quick Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck2 size={20} className="text-indigo-400" />
              {isAffairs ? 'Level 2: Student Affairs Pending Reviews' : 'Administrative Approval Pipeline'}
            </h2>
            <Link to="/admin/approvals" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All Queue <ArrowRight size={13} />
            </Link>
          </div>

          <Card padding="none" className="overflow-hidden">
            {pendingApprovals.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400 opacity-80" />
                <p className="font-semibold text-slate-200">No pending requests</p>
                <p className="text-xs text-slate-500 mt-1">All proposed events have been processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#17243B] border-b border-[#263650] text-xs font-bold uppercase text-slate-300">
                      <th className="py-3.5 px-4">Event</th>
                      <th className="py-3.5 px-4">Club</th>
                      <th className="py-3.5 px-4">Current Stage</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263650]/50">
                    {pendingApprovals.map((appr) => {
                      const evt = events.find((e) => e.eventId === appr.eventId);
                      return (
                        <tr key={appr.approvalId} className="hover:bg-[#17243B]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-white">{evt?.title}</p>
                            <span className="text-xs text-slate-400">{evt?.startDate || evt?.eventDate} • ${evt?.budget}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-300">{appr.clubName}</td>
                          <td className="py-3.5 px-4">
                            <Badge variant="warning" size="sm" className="capitalize">
                              {appr.stage.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link to="/admin/approvals">
                              <Button variant="outline" size="xs">
                                Review
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Event Distribution Chart */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-white mb-1">Campus Event Distribution by Category</h3>
            <p className="text-xs text-slate-400 mb-6">Activity concentration across diverse student interest domains.</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263650" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111C32',
                      borderColor: '#263650',
                      color: '#F1F5F9',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column: Recent Audit Trail */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert size={20} className="text-indigo-400" />
              Recent Audit Log
            </h2>
            <Link to="/admin/audit" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              View Log
            </Link>
          </div>

          <Card className="p-4">
            <div className="space-y-3">
              {auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="pb-3 border-b border-[#263650]/50 last:border-0 last:pb-0 text-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold text-slate-200">{log.performedBy}</span>
                    <span className="text-[11px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <Badge variant="neutral" size="sm" className="text-[10px] uppercase font-mono mb-1.5">
                    {log.action.replace(/_/g, ' ')}
                  </Badge>
                  <p className="text-slate-300 leading-snug">{log.details}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Institutional Bento Cell: Campus Activity Heatmap ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity size={20} className="text-cyan-400" />
            Extracurricular Density Heatmap
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {events.length} Live Institutional Events Tracked
          </span>
        </div>
        <CampusActivityHeatmap events={events} />
      </section>
    </div>
  );
}
