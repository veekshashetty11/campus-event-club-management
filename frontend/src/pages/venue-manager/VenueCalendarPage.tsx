import React, { useState, useMemo } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Building,
} from 'lucide-react';

export default function VenueCalendarPage() {
  const { venues, venueBookings } = useManagement();
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');

  const filteredBookings = useMemo(() => {
    return venueBookings.filter((b) => {
      const matchesVenue = selectedVenueId === 'all' || b.venueId === Number(selectedVenueId);
      return matchesVenue && b.status !== 'rejected';
    });
  }, [venueBookings, selectedVenueId]);

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map: Record<string, typeof filteredBookings> = {};
    filteredBookings.forEach((b) => {
      const dateKey = b.bookingDate || b.date || '2026-11-20';
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(b);
    });
    return map;
  }, [filteredBookings]);

  const dates = Object.keys(bookingsByDate).sort();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Venue Manager', path: '/venue-manager/dashboard' },
          { label: 'Facility Calendar' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facility Schedule & Calendar</h1>
          <p className="text-sm text-slate-500">
            Chronological view of scheduled campus event reservations and hall allocations.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedVenueId}
            onChange={(e) => setSelectedVenueId(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white text-slate-800 shadow-sm"
          >
            <option value="all">All Campus Facilities</option>
            {venues.map((v) => (
              <option key={v.venueId} value={v.venueId}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Timeline List */}
      <div className="space-y-6">
        {dates.length === 0 ? (
          <Card className="p-12 text-center text-slate-400">
            <CalendarRange size={36} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium text-slate-600">No active bookings for this filter</p>
          </Card>
        ) : (
          dates.map((dateStr) => {
            const dayBookings = bookingsByDate[dateStr];
            const dateObj = new Date(dateStr);
            const isToday = new Date().toDateString() === dateObj.toDateString();

            return (
              <div key={dateStr} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold shadow-xs">
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  {isToday && (
                    <Badge variant="success" className="text-[10px]">Today</Badge>
                  )}
                  <span className="text-xs text-slate-400 font-medium">{dayBookings.length} booking slots</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayBookings.map((b) => (
                    <Card
                      key={b.bookingId}
                      className={`p-4 border transition-all ${
                        b.status === 'approved'
                          ? 'border-teal-200 bg-teal-50/20'
                          : 'border-amber-200 bg-amber-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant={b.status === 'approved' ? 'success' : 'warning'}
                          className="text-[10px] capitalize"
                        >
                          {b.status}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {b.startTime} - {b.endTime}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mb-1">{b.eventName}</h4>
                      <p className="text-xs text-slate-500 mb-3">{b.clubName}</p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-medium text-teal-800">
                          <MapPin size={13} className="text-teal-600" />
                          {b.venueName}
                        </span>
                        <span>{b.expectedAttendance} pax</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
