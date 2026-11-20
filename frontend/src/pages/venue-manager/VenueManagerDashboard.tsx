import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import {
  MapPin,
  Clock,
  Boxes,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Building,
  Users,
  AlertTriangle,
  Sparkles,
  Wifi,
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

  const [selectedVenueId, setSelectedVenueId] = useState<number>(venues[0]?.venueId || 1);

  // Derive availability states for each venue
  const venuesWithAvailability = useMemo(() => {
    return venues.map((v) => {
      const activeBooking = venueBookings.find(
        (b) => b.venueId === v.venueId && b.status === 'approved'
      );
      const pendingReq = venueBookings.find(
        (b) => b.venueId === v.venueId && b.status === 'pending'
      );

      let availabilityState: 'available' | 'booked' | 'pending' | 'maintenance' = 'available';
      if (v.status === 'maintenance') {
        availabilityState = 'maintenance';
      } else if (activeBooking) {
        availabilityState = 'booked';
      } else if (pendingReq) {
        availabilityState = 'pending';
      }

      return {
        ...v,
        availabilityState,
        activeBooking,
        pendingReq,
      };
    });
  }, [venues, venueBookings]);

  // Selected venue bookings for time-slot calendar
  const selectedVenue = venues.find((v) => v.venueId === selectedVenueId) || venues[0];
  const selectedVenueBookings = useMemo(() => {
    return venueBookings.filter(
      (b) => b.venueId === selectedVenueId && b.status !== 'rejected'
    );
  }, [venueBookings, selectedVenueId]);

  // Standard time slots for visual schedule
  const standardTimeSlots = [
    { slot: '08:00 - 10:00 AM', label: 'Morning Slot A' },
    { slot: '10:00 - 12:00 PM', label: 'Morning Slot B' },
    { slot: '01:00 - 03:00 PM', label: 'Afternoon Slot A' },
    { slot: '03:00 - 05:00 PM', label: 'Afternoon Slot B' },
    { slot: '05:00 - 07:00 PM', label: 'Evening Keynote' },
    { slot: '07:00 - 09:00 PM', label: 'Night Session' },
  ];

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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full text-slate-100">
      <Breadcrumbs
        items={[
          { label: 'Venue Manager', path: '/venue-manager/dashboard' },
          { label: 'Dashboard' },
        ]}
      />

      {/* Hero Welcome Banner */}
      <div className="relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#111C32] via-[#17243B] to-[#0D1426] border border-[#263650] text-white shadow-2xl overflow-hidden">
        {/* Glow accents */}
        <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-[#06B6D4]/15 blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute -bottom-8 right-24 w-48 h-48 rounded-full bg-[#3B82F6]/15 blur-3xl animate-float pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17243B] text-xs font-bold mb-3 border border-cyan-500/30 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Campus Facilities & Logistics Control
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Welcome, {user?.fullName || 'Morgan Vance'}
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Manage <span className="font-bold text-white">{totalVenues} campus halls</span>, auditoriums, and labs. There are{' '}
              <span className="font-bold text-cyan-400">{pendingBookings.length} venue booking requests</span> awaiting approval.
            </p>
          </div>

          <Link to="/venue-manager/bookings">
            <Button variant="primary" className="shadow-lg shrink-0 font-bold" leftIcon={<ClipboardList size={16} />}>
              Review Requests ({pendingBookings.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Campus Venues"
          value={`${activeVenues} / ${totalVenues}`}
          subtitle="Active operational facilities"
          icon={<MapPin size={20} className="text-cyan-400" />}
          gradient="from-[#06B6D4] to-[#0284C7]"
        />
        <StatCard
          title="Pending Bookings"
          value={pendingBookings.length}
          subtitle="Awaiting manager sign-off"
          icon={<Clock size={20} className="text-amber-400" />}
          gradient="from-[#F59E0B] to-[#D97706]"
        />
        <StatCard
          title="Equipment in Use"
          value={`${inUseUnits} / ${totalEquipmentUnits}`}
          subtitle="Checked out units"
          icon={<Boxes size={20} className="text-indigo-400" />}
          gradient="from-[#4F46E5] to-[#3B82F6]"
        />
        <StatCard
          title="Equipment Requests"
          value={pendingEquipment.length}
          subtitle="Pending requisitions"
          icon={<ClipboardList size={20} className="text-emerald-400" />}
          gradient="from-[#10B981] to-[#059669]"
        />
      </div>

      {/* Main Grid: Pending Bookings & Utilization Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Requests */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList size={20} className="text-cyan-400" />
              Pending Venue Booking Requests
            </h2>
            <Link to="/venue-manager/bookings" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <Card padding="none" className="overflow-hidden">
            {pendingBookings.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400 opacity-80" />
                <p className="font-semibold text-slate-200">No pending booking requests</p>
                <p className="text-xs text-slate-500 mt-1">All venue reservation requests have been processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#17243B] border-b border-[#263650] text-xs font-bold uppercase text-slate-300">
                      <th className="py-3.5 px-4">Event & Club</th>
                      <th className="py-3.5 px-4">Venue</th>
                      <th className="py-3.5 px-4">Schedule</th>
                      <th className="py-3.5 px-4">Attendance</th>
                      <th className="py-3.5 px-4 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263650]/50">
                    {pendingBookings.map((b) => (
                      <tr key={b.bookingId} className="hover:bg-[#17243B]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">{b.eventName || b.eventTitle || 'Campus Event'}</p>
                          <span className="text-xs text-slate-400">{b.clubName}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-300">{b.venueName}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-300">
                          <p>{new Date(b.bookingDate || b.date || '2026-11-20').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          <span className="text-[11px] text-slate-500">{b.startTime} - {b.endTime}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-cyan-400">{b.expectedAttendance} pax</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => decideVenueBooking(b.bookingId, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/80 text-xs font-semibold transition-colors"
                              title="Approve Booking"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => decideVenueBooking(b.bookingId, 'rejected', 'Time slot conflict')}
                              className="px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-700/50 text-rose-300 hover:bg-rose-900/80 text-xs font-semibold transition-colors"
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
            <h3 className="text-base font-bold text-white mb-1">Venue Reservation Frequency</h3>
            <p className="text-xs text-slate-400 mb-6">Booking allocation distribution across main campus facilities.</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263650" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111C32', borderColor: '#263650', color: '#F1F5F9', borderRadius: '12px' }}
                  />
                  <Bar dataKey="bookings" fill="#06B6D4" radius={[6, 6, 0, 0]} name="Total Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column: Visual Facilities Availability Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin size={20} className="text-cyan-400" />
              Live Venue Availability
            </h2>
            <Link to="/venue-manager/venues" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
              Manage All
            </Link>
          </div>

          <div className="space-y-3">
            {venuesWithAvailability.slice(0, 5).map((v) => {
              const isSelected = v.venueId === selectedVenueId;
              const stateBadge = {
                available: { label: 'Available', variant: 'success' as const, glow: true },
                booked: { label: 'Booked', variant: 'primary' as const, glow: false },
                pending: { label: 'Pending Req', variant: 'amber' as const, glow: false },
                maintenance: { label: 'Maintenance', variant: 'danger' as const, glow: false },
              }[v.availabilityState];

              return (
                <div
                  key={v.venueId}
                  onClick={() => setSelectedVenueId(v.venueId)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#17243B] border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                      : 'bg-[#111C32] hover:bg-[#17243B]/60 border-[#263650]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-bold text-white text-xs truncate max-w-[170px]">{v.name}</h4>
                    <Badge variant={stateBadge.variant} size="sm" dot={stateBadge.glow}>
                      {stateBadge.label}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-2">
                    {v.building} • Floor {v.floor} {v.roomNumber ? `• Rm ${v.roomNumber}` : ''}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#263650]/60">
                    <span className="flex items-center gap-1">
                      <Users size={12} className="text-slate-400" />
                      Cap: <strong className="text-white">{v.capacity}</strong>
                    </span>
                    <span className="text-[10px] text-cyan-300 font-medium bg-[#17243B] px-1.5 py-0.5 rounded border border-[#263650]">
                      {v.amenities.length} AV amenities
                    </span>
                  </div>

                  {v.activeBooking && (
                    <div className="mt-2 pt-1.5 border-t border-[#263650]/40 text-[10px] text-indigo-300 truncate">
                      Active: {v.activeBooking.eventName} ({v.activeBooking.startTime} - {v.activeBooking.endTime})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Visual Time-Slot & Conflict Matrix Bento Section ── */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-cyan-400" />
              Time-Slot Availability Matrix — {selectedVenue?.name}
            </h2>
            <p className="text-xs text-slate-400">
              Interactive slot schedule and conflict inspector for scheduled campus operations.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Open Slot
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ml-2" /> Booked
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ml-2" /> Pending
          </div>
        </div>

        <Card className="p-5 bg-[#111C32] border-[#263650]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {standardTimeSlots.map((slotInfo, idx) => {
              // Check if any booking overlaps with this slot index
              const matchingBooking = selectedVenueBookings[idx % Math.max(1, selectedVenueBookings.length)];
              const hasBooking = idx < selectedVenueBookings.length;
              const isApproved = hasBooking && matchingBooking?.status === 'approved';
              const isPending = hasBooking && matchingBooking?.status === 'pending';

              return (
                <div
                  key={slotInfo.slot}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isApproved
                      ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
                      : isPending
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-[#17243B]/60 border-[#263650] text-slate-300 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-white">{slotInfo.slot}</span>
                    {isApproved ? (
                      <Badge variant="primary" size="sm">Booked</Badge>
                    ) : isPending ? (
                      <Badge variant="amber" size="sm" dot>Pending</Badge>
                    ) : (
                      <Badge variant="success" size="sm">Available</Badge>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {hasBooking && matchingBooking ? matchingBooking.eventName : slotInfo.label}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-[#263650]/50">
                    <span>{hasBooking && matchingBooking ? matchingBooking.clubName : 'No Reservations'}</span>
                    <span className="font-mono">
                      {hasBooking && matchingBooking ? `${matchingBooking.expectedAttendance} pax` : `Max: ${selectedVenue?.capacity}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
