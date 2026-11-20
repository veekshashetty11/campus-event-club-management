import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  MapPin,
  Calendar,
  Clock,
  Boxes,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Tv,
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

export default function VenueManagerDashboard() {
  const { user } = useAuth();
  const { venues, venueBookings, equipment, equipmentBookings, decideVenueBooking } = useManagement();

  const totalVenues = venues.length;
  const activeVenues = venues.filter((v) => v.status === 'active').length;
  const pendingBookings = venueBookings.filter((b) => b.status === 'pending');
  const pendingEquipment = equipmentBookings.filter((eb) => eb.status === 'pending');

  const totalEquipmentUnits = equipment.reduce((sum, eq) => sum + eq.quantityTotal, 0);
  const availableEquipmentUnits = equipment.reduce((sum, eq) => sum + eq.quantityAvailable, 0);
  const inUseUnits = totalEquipmentUnits - availableEquipmentUnits;

  // Chart data: bookings per venue
  const bookingStats = useMemo(() => {
    return venues.map((v) => {
      const count = venueBookings.filter((b) => b.venueId === v.venueId).length;
      return {
        name: v.name.length > 15 ? v.name.substring(0, 13) + '...' : v.name,
        bookings: count,
        capacity: v.capacity,
      };
    });
  }, [venues, venueBookings]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Venue Manager', path: '/venue-manager/dashboard' },
          { label: 'Dashboard' },
        ]}
      />

      {/* Hero Welcome Banner */}
      <div className="relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-sky-900 via-blue-900 to-indigo-900 text-white shadow-xl overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-sky-500/20 blur-2xl animate-pulse-slow" />
        <div className="absolute -bottom-8 right-24 w-36 h-36 rounded-full bg-blue-400/20 blur-2xl animate-float" />
        <div className="absolute top-4 left-1/3 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl" />

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
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Campus Facilities & Logistics Control
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Welcome, {user?.fullName || 'Morgan Vance'}
            </h1>
            <p className="text-sm text-sky-100/80 mt-2 max-w-2xl leading-relaxed">
              Manage <span className="font-bold text-white">{totalVenues} campus halls</span>, auditoriums, and labs. There are{' '}
              <span className="font-bold text-sky-300">{pendingBookings.length} venue booking requests</span> awaiting approval.
            </p>
          </div>

          <Link to="/venue-manager/bookings">
            <Button variant="secondary" className="bg-white text-sky-900 hover:bg-sky-50 shadow-sm shrink-0 font-bold">
              <ClipboardList size={16} className="mr-2 text-sky-700" />
              Review Requests ({pendingBookings.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Campus Venues</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {activeVenues} <span className="text-xs font-normal text-slate-400">/ {totalVenues} Active</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <MapPin size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50/70 border border-amber-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending Bookings</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{pendingBookings.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Equipment in Use</p>
              <p className="text-2xl font-bold text-brand-900 mt-1">
                {inUseUnits} <span className="text-xs font-normal text-slate-400">/ {totalEquipmentUnits} units</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Boxes size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Equipment Requests</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{pendingEquipment.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Pending Bookings & Utilization Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Requests */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList size={20} className="text-teal-700" />
              Pending Venue Booking Requests
            </h2>
            <Link to="/venue-manager/bookings" className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <Card className="overflow-hidden border border-slate-200/80">
            {pendingBookings.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
                <p className="font-semibold text-slate-700">No pending booking requests</p>
                <p className="text-xs text-slate-400 mt-1">All venue reservation requests have been processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                      <th className="py-3 px-4">Event & Club</th>
                      <th className="py-3 px-4">Venue</th>
                      <th className="py-3 px-4">Schedule</th>
                      <th className="py-3 px-4">Attendance</th>
                      <th className="py-3 px-4 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingBookings.map((b) => (
                      <tr key={b.bookingId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{b.eventName}</p>
                          <span className="text-xs text-slate-400">{b.clubName}</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700">{b.venueName}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <p>{new Date(b.bookingDate || b.date || '2026-11-20').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          <span className="text-[11px] text-slate-400">{b.startTime} - {b.endTime}</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-800">{b.expectedAttendance} pax</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => decideVenueBooking(b.bookingId, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                              title="Approve Booking"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => decideVenueBooking(b.bookingId, 'rejected', 'Time slot conflict')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors"
                              title="Reject Booking"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Venue Booking Volume Chart */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">Venue Reservation Frequency</h3>
            <p className="text-xs text-slate-500 mb-6">Booking allocation distribution across main campus facilities.</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="bookings" fill="#0d9488" radius={[4, 4, 0, 0]} name="Total Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column: Campus Venues Snapshot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin size={20} className="text-teal-700" />
              Facilities Status
            </h2>
            <Link to="/venue-manager/venues" className="text-xs font-semibold text-teal-700 hover:underline">
              Manage All
            </Link>
          </div>

          <div className="space-y-3">
            {venues.slice(0, 5).map((v) => (
              <Card key={v.venueId} className="p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-slate-900 text-xs">{v.name}</h4>
                  <Badge variant={v.status === 'active' ? 'success' : 'neutral'} className="text-[10px]">
                    {v.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">{v.building}, Floor {v.floor}</p>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span>Capacity: <strong>{v.capacity}</strong></span>
                  <span className="text-teal-700 font-semibold">{v.amenities.length} AV amenities</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
