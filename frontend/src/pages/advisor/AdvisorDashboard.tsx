import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  FileCheck2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Calendar,
  Building2,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { events, approvals, clubs, memberships } = useManagement();

  // Find clubs advised by this advisor
  const advisedClubs = useMemo(() => {
    return clubs.filter(
      (c) =>
        c.advisorEmail === user?.email ||
        c.facultyAdvisorEmail === user?.email ||
        (c.advisorName || c.facultyAdvisorName || '').toLowerCase().includes('finch')
    );
  }, [clubs, user?.email]);

  const advisedClubIds = useMemo(() => advisedClubs.map((c) => c.clubId), [advisedClubs]);

  // Level 1 pending approvals for advised clubs
  const pendingApprovals = useMemo(() => {
    return approvals.filter(
      (a) =>
        a.stage === 'club_advisor' &&
        a.status === 'pending' &&
        a.clubId !== undefined &&
        advisedClubIds.includes(a.clubId)
    );
  }, [approvals, advisedClubIds]);

  const approvedCount = useMemo(() => {
    return approvals.filter(
      (a) =>
        a.stage === 'club_advisor' &&
        a.status === 'approved' &&
        a.clubId !== undefined &&
        advisedClubIds.includes(a.clubId)
    ).length;
  }, [approvals, advisedClubIds]);

  const rejectedCount = useMemo(() => {
    return approvals.filter(
      (a) =>
        a.stage === 'club_advisor' &&
        a.status === 'rejected' &&
        a.clubId !== undefined &&
        advisedClubIds.includes(a.clubId)
    ).length;
  }, [approvals, advisedClubIds]);

  // Total members in advised clubs
  const totalStudents = useMemo(() => {
    return memberships.filter((m) => advisedClubIds.includes(m.clubId) && m.status === 'approved').length;
  }, [memberships, advisedClubIds]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs items={[{ label: 'Advisor', path: '/advisor/dashboard' }, { label: 'Dashboard' }]} />

      {/* Greeting Banner */}
      <div className="relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 text-white shadow-xl overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-emerald-500/20 blur-2xl animate-pulse-slow" />
        <div className="absolute -bottom-8 right-24 w-36 h-36 rounded-full bg-teal-400/20 blur-2xl animate-float" />
        <div className="absolute top-4 left-1/3 w-24 h-24 rounded-full bg-cyan-500/10 blur-xl" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold backdrop-blur mb-3 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Faculty Advisor Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Welcome back, {user?.fullName || 'Prof. Finch'}
            </h1>
            <p className="text-sm text-emerald-100/80 mt-2 max-w-2xl leading-relaxed">
              You are overseeing <span className="font-bold text-cyan-300">{advisedClubs.length} campus student clubs</span>. There are currently{' '}
              <span className="font-bold text-white">{pendingApprovals.length} events</span> awaiting your Level 1 faculty review.
            </p>
          </div>

          <Link to="/advisor/approvals">
            <Button variant="secondary" className="bg-white text-emerald-900 hover:bg-emerald-50 shadow-sm shrink-0 font-bold">
              <FileCheck2 size={16} className="mr-2 text-emerald-600" />
              Review Pending Queue ({pendingApprovals.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{pendingApprovals.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Events</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{approvedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Clubs</p>
              <p className="text-2xl font-bold text-brand-900 mt-1">{advisedClubs.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Building2 size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student Members</p>
              <p className="text-2xl font-bold text-teal-800 mt-1">{totalStudents}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Pending Queue & Assigned Clubs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 size={20} className="text-brand-700" />
              Level 1 Approval Queue
            </h2>
            <Link to="/advisor/approvals" className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          {pendingApprovals.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="font-semibold text-slate-700">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1">There are no pending events requiring faculty review right now.</p>
            </Card>
          ) : (
            pendingApprovals.map((appr) => {
              const evt = events.find((e) => e.eventId === appr.eventId);
              if (!evt) return null;

              return (
                <Card key={appr.approvalId} className="p-5 border border-slate-200/80 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="warning">Stage 1: Faculty Review</Badge>
                        <span className="text-xs text-slate-400">• {evt.category}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{evt.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Organized by <strong>{evt.clubName}</strong> • Submitted on {new Date(appr.submittedAt).toLocaleDateString()}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          {evt.startDate ? new Date(evt.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (evt.eventDate || 'TBD')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={13} className="text-slate-400" />
                          {evt.capacity} pax capacity
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <DollarSign size={13} className="text-emerald-600" />
                          ${evt.budget ? evt.budget.toLocaleString() : '0'} Budget
                        </span>
                      </div>
                    </div>

                    <Link to="/advisor/approvals">
                      <Button variant="primary" className="shadow-xs shrink-0">
                        Review Event
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Assigned Clubs List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={20} className="text-brand-700" />
            Assigned Clubs
          </h2>

          <div className="space-y-3">
            {advisedClubs.map((c) => {
              const membersCount = memberships.filter((m) => m.clubId === c.clubId && m.status === 'approved').length;
              return (
                <Card key={c.clubId} className="p-4 border border-slate-200/80">
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={c.logoUrl}
                      alt={c.name}
                      className="w-10 h-10 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{c.name}</h4>
                      <p className="text-xs text-slate-400">{c.category}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>{membersCount} Members</span>
                    <span className="font-bold text-emerald-700">${c.allocatedBudget.toLocaleString()} Budget</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
