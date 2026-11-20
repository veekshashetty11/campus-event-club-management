import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import ApprovalTimeline from '../../components/common/ApprovalTimeline';
import {
  FileCheck2,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calendar,
  Building2,
  DollarSign,
  Sparkles,
} from 'lucide-react';

export default function AdvisorDashboard() {
  const { user } = useAuth();
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
    const advisedClubNames = advisedClubs.map((c) => c.name.toLowerCase());
    return approvals.filter((a) => {
      if (a.stage !== 'club_advisor' || a.status !== 'pending') return false;
      const targetClubId =
        a.clubId ??
        events.find((e) => e.eventId === a.eventId)?.clubId ??
        clubs.find((c) => c.name.toLowerCase() === (a.clubName || '').toLowerCase())?.clubId;

      if (targetClubId !== undefined && advisedClubIds.includes(targetClubId)) {
        return true;
      }
      return advisedClubNames.includes((a.clubName || '').toLowerCase());
    });
  }, [approvals, advisedClubIds, advisedClubs, events, clubs]);

  const approvedCount = useMemo(() => {
    const advisedClubNames = advisedClubs.map((c) => c.name.toLowerCase());
    return approvals.filter((a) => {
      if (a.stage !== 'club_advisor' || a.status !== 'approved') return false;
      const targetClubId =
        a.clubId ??
        events.find((e) => e.eventId === a.eventId)?.clubId ??
        clubs.find((c) => c.name.toLowerCase() === (a.clubName || '').toLowerCase())?.clubId;

      if (targetClubId !== undefined && advisedClubIds.includes(targetClubId)) {
        return true;
      }
      return advisedClubNames.includes((a.clubName || '').toLowerCase());
    });
  }, [approvals, advisedClubIds, advisedClubs, events, clubs]).length;

  // Total members in advised clubs
  const totalStudents = useMemo(() => {
    return memberships.filter((m) => advisedClubIds.includes(m.clubId) && m.status === 'approved').length;
  }, [memberships, advisedClubIds]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full text-slate-100">
      <Breadcrumbs items={[{ label: 'Advisor', path: '/advisor/dashboard' }, { label: 'Dashboard' }]} />

      {/* Greeting Banner */}
      <div className="relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#111C32] via-[#17243B] to-[#0D1426] border border-[#263650] text-white shadow-2xl overflow-hidden">
        {/* Glow accents */}
        <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-[#10B981]/15 blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute -bottom-8 right-24 w-48 h-48 rounded-full bg-[#06B6D4]/15 blur-3xl animate-float pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17243B] text-xs font-bold mb-3 border border-emerald-500/30 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Faculty Advisor Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Welcome back, {user?.fullName || 'Prof. Finch'}
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              You are overseeing <span className="font-bold text-emerald-400">{advisedClubs.length} campus student clubs</span>. There are currently{' '}
              <span className="font-bold text-white">{pendingApprovals.length} events</span> awaiting your Level 1 faculty review.
            </p>
          </div>

          <Link to="/advisor/approvals">
            <Button variant="primary" className="shadow-lg shrink-0 font-bold" leftIcon={<FileCheck2 size={16} />}>
              Review Pending Queue ({pendingApprovals.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Review"
          value={pendingApprovals.length}
          subtitle="Awaiting Level 1 sign-off"
          icon={<Clock size={20} className="text-amber-400" />}
          gradient="from-[#F59E0B] to-[#D97706]"
        />
        <StatCard
          title="Approved Events"
          value={approvedCount}
          subtitle="Successfully cleared L1"
          icon={<CheckCircle2 size={20} className="text-emerald-400" />}
          gradient="from-[#10B981] to-[#059669]"
        />
        <StatCard
          title="Assigned Clubs"
          value={advisedClubs.length}
          subtitle="Active faculty mentorship"
          icon={<Building2 size={20} className="text-indigo-400" />}
          gradient="from-[#4F46E5] to-[#3B82F6]"
        />
        <StatCard
          title="Student Members"
          value={totalStudents}
          subtitle="Enrolled club participants"
          icon={<Users size={20} className="text-cyan-400" />}
          gradient="from-[#06B6D4] to-[#0284C7]"
        />
      </div>

      {/* Main Grid: Pending Queue & Assigned Clubs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck2 size={20} className="text-indigo-400" />
              Level 1 Approval Queue
            </h2>
            <Link to="/advisor/approvals" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          {pendingApprovals.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-400 opacity-80" />
              <p className="font-semibold text-slate-200">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1">There are no pending events requiring faculty review right now.</p>
            </Card>
          ) : (
            pendingApprovals.map((appr) => {
              const evt = events.find((e) => e.eventId === appr.eventId);
              if (!evt) return null;

              return (
                <Card key={appr.approvalId} className="p-5 hover:border-[#3B82F6]/50 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="warning">Stage 1: Faculty Review</Badge>
                        <span className="text-xs text-slate-400">• {evt.category}</span>
                      </div>
                      <h3 className="font-bold text-white text-base">{evt.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Organized by <strong className="text-slate-200">{evt.clubName}</strong> • Submitted on {new Date(appr.submittedAt).toLocaleDateString()}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-indigo-400" />
                          {evt.startDate ? new Date(evt.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (evt.eventDate || 'TBD')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={13} className="text-cyan-400" />
                          {evt.capacity} pax capacity
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                          <DollarSign size={13} />
                          ${evt.budget ? evt.budget.toLocaleString() : '0'} Budget
                        </span>
                      </div>
                    </div>

                    <Link to="/advisor/approvals">
                      <Button variant="primary" size="sm" className="shrink-0">
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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 size={20} className="text-indigo-400" />
            Assigned Clubs
          </h2>

          <div className="space-y-3">
            {advisedClubs.map((c) => {
              const membersCount = memberships.filter((m) => m.clubId === c.clubId && m.status === 'approved').length;
              return (
                <Card key={c.clubId} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={c.logoUrl}
                      alt={c.name}
                      className="w-10 h-10 rounded-xl object-contain bg-[#17243B] border border-[#263650] p-1 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{c.name}</h4>
                      <p className="text-xs text-slate-400">{c.category}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#263650] flex items-center justify-between text-xs text-slate-400">
                    <span>{membersCount} Members</span>
                    <span className="font-bold text-emerald-400">${c.allocatedBudget.toLocaleString()} Budget</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Multi-Level Approval Pipeline Inspection */}
      <section className="space-y-3">
        <ApprovalTimeline
          event={events.find((e) => e.eventId === pendingApprovals[0]?.eventId) || events[0]}
          approvals={approvals}
        />
      </section>
    </div>
  );
}
