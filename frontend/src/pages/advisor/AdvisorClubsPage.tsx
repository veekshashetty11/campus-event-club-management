import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import {
  Building2,
  Users,
  DollarSign,
  Calendar,
  Mail,
  User,
} from 'lucide-react';

export default function AdvisorClubsPage() {
  const { user } = useAuth();
  const { clubs, memberships, events, expenses } = useManagement();

  const advisedClubs = useMemo(() => {
    return clubs.filter(
      (c) =>
        c.advisorEmail === user?.email ||
        c.facultyAdvisorEmail === user?.email ||
        (c.advisorName || c.facultyAdvisorName || '').toLowerCase().includes('finch')
    );
  }, [clubs, user?.email]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Advisor', path: '/advisor/dashboard' },
          { label: 'Assigned Clubs' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assigned Student Clubs</h1>
          <p className="text-sm text-slate-500">
            Faculty advisory oversight for student organizations and affiliated chapters.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-800">
          {advisedClubs.length} Active Organizations Assigned
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {advisedClubs.map((c) => {
          const clubMembers = memberships.filter((m) => m.clubId === c.clubId && m.status === 'approved');
          const clubEvents = events.filter((e) => e.clubId === c.clubId);
          const clubExpenses = expenses.filter((e) => e.clubId === c.clubId);
          const totalSpent = clubExpenses.reduce((sum, e) => sum + e.amount, 0);

          return (
            <Card key={c.clubId} className="p-6 flex flex-col justify-between border border-slate-200/80 hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={c.logoUrl}
                    alt={c.name}
                    className="w-14 h-14 rounded-2xl object-contain bg-slate-50 border border-slate-100 p-1.5 shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80';
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">{c.name}</h2>
                      <Badge variant="neutral" className="text-[11px]">{c.category}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                  </div>
                </div>

                {/* President & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <span>President: <strong>{c.presidentName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{c.contactEmail}</span>
                  </div>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-3 gap-2.5 text-center mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-medium">Members</span>
                    <span className="text-base font-bold text-slate-900">{clubMembers.length}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-medium">Events</span>
                    <span className="text-base font-bold text-brand-800">{clubEvents.length}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-medium">Allocated</span>
                    <span className="text-base font-bold text-emerald-700">${c.allocatedBudget.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Budget bar */}
              <div className="pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between font-medium text-slate-600 mb-1">
                  <span>Budget Utilized</span>
                  <span>${totalSpent} of ${c.allocatedBudget}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-brand-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.round((totalSpent / c.allocatedBudget) * 100))}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
