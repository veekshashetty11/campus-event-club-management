import React, { useState } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { Building2, Users, Search, DollarSign } from 'lucide-react';

export default function AdminClubsPage() {
  const { clubs, memberships, events } = useManagement();
  const [search, setSearch] = useState('');

  const filteredClubs = clubs.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    (c.advisorName || c.facultyAdvisorName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Administrator', path: '/admin/dashboard' },
          { label: 'Campus Clubs' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">University Student Clubs</h1>
          <p className="text-sm text-slate-400">
            Registered extracurricular societies, faculty advisors, and annual budget allocations.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search club, category, advisor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs rounded-xl border border-[#263650] bg-[#17243B] py-2 px-3.5 placeholder-slate-400 text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClubs.map((c) => {
          const membersCount = memberships.filter((m) => m.clubId === c.clubId && m.status === 'approved').length;
          const clubEventsCount = events.filter((e) => e.clubId === c.clubId).length;

          return (
            <Card key={c.clubId} className="p-5 flex flex-col justify-between border border-[#263650] hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={c.logoUrl}
                      alt={c.name}
                      className="w-12 h-12 rounded-xl object-contain bg-[#17243B] border border-[#263650] p-1 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                    <div>
                      <h3 className="font-bold text-slate-100 leading-tight">{c.name}</h3>
                      <Badge variant="neutral" className="mt-1 text-[11px]">{c.category}</Badge>
                    </div>
                  </div>
                  <Badge variant={c.status === 'active' ? 'success' : 'neutral'} className="capitalize">
                    {c.status}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 mb-4">{c.description}</p>

                <div className="space-y-1.5 text-xs text-slate-300 p-3 rounded-xl bg-[#17243B] border border-[#263650] mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Faculty Advisor:</span>
                    <span className="font-semibold text-slate-100">{c.advisorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">President:</span>
                    <span className="font-semibold text-slate-100">{c.presidentName}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#263650]/60 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  {membersCount} Members • {clubEventsCount} Events
                </span>
                <span className="font-bold text-emerald-400">${c.allocatedBudget.toLocaleString()}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
