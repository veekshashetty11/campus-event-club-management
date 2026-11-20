import React, { useState } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import {
  MapPin,
  Users,
  Search,
  CheckCircle2,
  Tv,
  Mic,
  Wind,
  Maximize2,
} from 'lucide-react';

export default function CoordinatorVenuesPage() {
  const { venues } = useManagement();
  const [search, setSearch] = useState('');

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.building.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Campus Venues' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campus Venues & Facilities</h1>
          <p className="text-sm text-slate-500">
            Explore venue capacities, AV amenities, and suitability for upcoming club events.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search venue or building..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm rounded-xl border border-slate-200 bg-white py-2 px-3.5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
          </input>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVenues.map((v) => (
          <Card key={v.venueId} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-900 text-base">{v.name}</h3>
                <Badge variant={v.status === 'active' ? 'success' : 'neutral'} className="capitalize">
                  {v.status}
                </Badge>
              </div>

              <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-4">
                <MapPin size={14} className="text-brand-600 shrink-0" />
                <span>{v.building}, Floor {v.floor}</span>
              </p>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Users size={14} className="text-slate-400" /> Max Capacity
                  </span>
                  <span className="font-bold text-slate-900">{v.capacity} seats</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Facilities & AV</p>
                <div className="flex flex-wrap gap-1.5">
                  {v.amenities.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      <CheckCircle2 size={12} className="text-brand-600" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Managed by Facility Services</span>
              <span className="font-semibold text-brand-800">Available for Booking</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
