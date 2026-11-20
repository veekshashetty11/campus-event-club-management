import React, { useState, useMemo } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import type { VenueBooking } from '../../types/event';

export default function VenueBookingsPage() {
  const { venues, venueBookings, decideVenueBooking } = useManagement();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [rejectingBooking, setRejectingBooking] = useState<VenueBooking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const filteredBookings = useMemo(() => {
    return venueBookings.filter((b) => {
      const matchesSearch =
        (b.eventName || b.eventTitle || '').toLowerCase().includes(search.toLowerCase()) ||
        b.clubName.toLowerCase().includes(search.toLowerCase()) ||
        b.venueName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesVenue = venueFilter === 'all' || b.venueId === Number(venueFilter);
      return matchesSearch && matchesStatus && matchesVenue;
    });
  }, [venueBookings, search, statusFilter, venueFilter]);

  const handleApprove = async (bookingId: number) => {
    setMessage(null);
    try {
      const res = await decideVenueBooking(bookingId, 'approved');
      setMessage({ text: res.message, isError: !res.success });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Approval failed',
        isError: true,
      });
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingBooking) return;
    setMessage(null);
    try {
      const res = await decideVenueBooking(rejectingBooking.bookingId, 'rejected', rejectionReason || 'Schedule conflict');
      setMessage({ text: res.message, isError: !res.success });
      setRejectingBooking(null);
      setRejectionReason('');
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Rejection failed',
        isError: true,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Venue Manager', path: '/venue-manager/dashboard' },
          { label: 'Venue Bookings' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facility Booking Requests</h1>
          <p className="text-sm text-slate-500">
            Review event room reservation schedules, detect double-booking conflicts, and confirm hall allocations.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border text-sm ${
            !message.isError
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {!message.isError ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search event, club, venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-3 bg-white text-slate-700"
            >
              <option value="all">All Facilities</option>
              {venues.map((v) => (
                <option key={v.venueId} value={v.venueId}>{v.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-3 bg-white text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Bookings Table */}
      <Card className="overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Event</th>
                <th className="py-3.5 px-4">Club</th>
                <th className="py-3.5 px-4">Requested Venue</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Attendees</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ClipboardList size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="font-medium text-slate-600">No booking requests found</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.bookingId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900">{b.eventName}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{b.clubName}</td>
                    <td className="py-3.5 px-4 text-xs font-medium text-brand-800">{b.venueName}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <p className="font-medium">{new Date(b.bookingDate || b.date || '2026-11-20').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <span className="text-[11px] text-slate-400">{b.startTime} - {b.endTime}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">{b.expectedAttendance} pax</td>
                    <td className="py-3.5 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-3.5 px-5 text-right">
                      {b.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleApprove(b.bookingId)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setRejectingBooking(b)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Decided</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectingBooking}
        onClose={() => setRejectingBooking(null)}
        title="Reject Facility Booking Request"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            Provide a clear rationale for declining <strong className="text-slate-800">{rejectingBooking?.venueName}</strong> for{' '}
            <strong className="text-slate-800">{rejectingBooking?.eventName}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Rejection Rationale
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Venue booked for university convocation rehearsal during this slot..."
              className="w-full text-sm rounded-xl border border-slate-300 p-2.5 text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setRejectingBooking(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRejectConfirm}>
              Reject Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
