import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  FileCheck2,
  MapPin,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
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
  const navigate = useNavigate();
  const { users, clubs, events, approvals, venueBookings, auditLogs } = useManagement();

  // Dual role check: is user Student Affairs or Administrator?
  const isAffairs = user?.role === 'student_affairs';
  const isAdmin = user?.role === 'administrator';

  // Pending approvals relevant to current role:
  // If student affairs, stage === 'student_affairs'
  // If administrator, stage === 'administrator' (or both if viewing high-level)
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

  // Category counts for Recharts
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [events]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Administrator', path: '/admin/dashboard' },
          { label: 'Dashboard' },
        ]}
      />

      {/* Hero Welcome Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-brand-900 to-brand-800 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur mb-3">
            <ShieldAlert size={14} className="text-brand-300" />
            {isAffairs ? 'Student Affairs Administration' : 'Campus Systems Governance'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome, {user?.fullName || 'Administrator'}
          </h1>
          <p className="text-sm text-slate-200 mt-1 max-w-2xl">
            Overview of university extracurricular activities, multi-stage approval pipelines, facility allocations, and student memberships.
          </p>
        </div>

        <Link to="/admin/approvals">
          <Button variant="secondary" className="bg-white text-brand-900 hover:bg-slate-100 shadow-sm shrink-0">
            <FileCheck2 size={16} className="mr-2 text-brand-600" />
            View Approval Queue ({pendingApprovals.length})
          </Button>
        </Link>
      </div>

      {/* 6 Key Campus Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="p-3.5 bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Students</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalStudents}</p>
        </Card>

        <Card className="p-3.5 bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Clubs</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalClubs}</p>
        </Card>

        <Card className="p-3.5 bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Events</p>
          <p className="text-xl font-bold text-brand-800 mt-1">{totalEvents}</p>
        </Card>

        <Card className="p-3.5 bg-amber-50/70 border border-amber-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Pending Review</p>
          <p className="text-xl font-bold text-amber-900 mt-1">{pendingApprovals.length}</p>
        </Card>

        <Card className="p-3.5 bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Bookings</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{activeBookings}</p>
        </Card>

        <Card className="p-3.5 bg-emerald-50/70 border border-emerald-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Campus Budget</p>
          <p className="text-xl font-bold text-emerald-900 mt-1">${(totalCampusBudget / 1000).toFixed(0)}k</p>
        </Card>
      </div>

      {/* Main Grid: Pending Approvals & Quick Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 size={20} className="text-brand-700" />
              {isAffairs ? 'Level 2: Student Affairs Pending Reviews' : 'Administrative Approval Pipeline'}
            </h2>
            <Link to="/admin/approvals" className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1">
              View All Queue <ArrowRight size={13} />
            </Link>
          </div>

          <Card className="overflow-hidden border border-slate-200/80">
            {pendingApprovals.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
                <p className="font-semibold text-slate-700">No pending requests</p>
                <p className="text-xs text-slate-400 mt-1">All proposed events have been processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Club</th>
                      <th className="py-3 px-4">Current Stage</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingApprovals.map((appr) => {
                      const evt = events.find((e) => e.eventId === appr.eventId);
                      return (
                        <tr key={appr.approvalId} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{evt?.title}</p>
                            <span className="text-xs text-slate-400">{evt?.startDate} • ${evt?.budget}</span>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-700">{appr.clubName}</td>
                          <td className="py-3 px-4">
                            <Badge variant="warning" className="text-[11px] capitalize">
                              {appr.stage.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link to="/admin/approvals">
                              <Button variant="outline" size="sm">
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
            <h3 className="text-base font-bold text-slate-900 mb-1">Campus Event Distribution by Category</h3>
            <p className="text-xs text-slate-500 mb-6">Activity concentration across diverse student interest domains.</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar dataKey="count" fill="#1b3b57" radius={[4, 4, 0, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column: Recent Audit Trail */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert size={20} className="text-brand-700" />
              Recent Audit Log
            </h2>
            <Link to="/admin/audit" className="text-xs font-semibold text-brand-700 hover:underline">
              View Log
            </Link>
          </div>

          <Card className="p-4 border border-slate-200/80">
            <div className="space-y-3.5">
              {auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold text-slate-700">{log.performedBy}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <Badge variant="neutral" className="text-[10px] uppercase font-mono mb-1">
                    {log.action.replace(/_/g, ' ')}
                  </Badge>
                  <p className="text-slate-600 leading-snug">{log.details}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
