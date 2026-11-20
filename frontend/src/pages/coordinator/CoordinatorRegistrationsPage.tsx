import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpCircle,
} from 'lucide-react';
import type { RegistrationStatus } from '../../types/registration';

export default function CoordinatorRegistrationsPage() {
  const { user } = useAuth();
  const { events, registrations, getRegistrationsForEvent } = useManagement();

  // Coordinator's club events
  const clubEvents = useMemo(() => {
    if (!user?.clubId) return events;
    return events.filter((e) => e.clubId === user.clubId);
  }, [events, user?.clubId]);

  const [selectedEventId, setSelectedEventId] = useState<number>(
    clubEvents[0]?.eventId || 1
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const selectedEvent = clubEvents.find((e) => e.eventId === selectedEventId) || clubEvents[0];

  // Get registrations for selected event
  const eventRegistrations = useMemo(() => {
    return getRegistrationsForEvent(selectedEventId);
  }, [selectedEventId, registrations, getRegistrationsForEvent]);

  const filteredRegistrations = useMemo(() => {
    return eventRegistrations.filter((r) => {
      const name = r.studentName || '';
      const email = r.studentEmail || '';
      const roll = r.rollNumber || '';
      const regId = String(r.registrationId);

      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()) ||
        roll.toLowerCase().includes(search.toLowerCase()) ||
        regId.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [eventRegistrations, search, statusFilter]);

  const confirmedCount = eventRegistrations.filter((r) => r.status === 'confirmed' || r.status === 'registered').length;
  const waitlistedCount = eventRegistrations.filter((r) => r.status === 'waitlisted').length;

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!selectedEvent || filteredRegistrations.length === 0) return;

    const headers = ['Registration ID', 'Student Name', 'Email', 'Roll Number', 'Registered Date', 'Status', 'Attendance'];
    const rows = filteredRegistrations.map((r) => [
      `"${r.registrationId}"`,
      `"${r.studentName || 'Student'}"`,
      `"${r.studentEmail || ''}"`,
      `"${r.rollNumber || ''}"`,
      `"${new Date(r.registrationDate || r.registeredAt).toLocaleDateString()}"`,
      `"${r.status}"`,
      `"${r.attendanceStatus || 'not_marked'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedEvent.title.replace(/\s+/g, '_')}_Registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePromoteWaitlist = (regId: string) => {
    setAlertMessage(`Registration ${regId} has been promoted to Confirmed status.`);
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'waitlisted':
        return <Badge variant="warning">Waitlisted</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Registrations' },
        ]}
      />

      {/* Header and Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendee Registrations</h1>
          <p className="text-sm text-slate-500">
            Monitor registration volume, process waitlists, and export roster data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="text-sm font-semibold rounded-xl border border-slate-300 bg-white py-2 px-3.5 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {clubEvents.map((evt) => (
              <option key={evt.eventId} value={evt.eventId}>
                {evt.title} ({new Date(evt.startDate || evt.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
              </option>
            ))}
          </select>

          <Button variant="outline" onClick={handleExportCSV} disabled={filteredRegistrations.length === 0}>
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {alertMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-sm">
          <CheckCircle2 size={18} />
          <span>{alertMessage}</span>
        </div>
      )}

      {/* Metrics Strip for the Selected Event */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Registered</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {confirmedCount}{' '}
                <span className="text-xs font-normal text-slate-400">/ {selectedEvent?.capacity || 0} seats</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirmed Attendees</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{confirmedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Waitlist Queue</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{waitlistedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student, email, roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Filter size={14} /> Filter Status:
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All ({eventRegistrations.length})</option>
              <option value="confirmed">Confirmed</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Registrations Table */}
      <Card className="overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Reg ID</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Roll Number</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Attendance</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ClipboardList size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="font-medium text-slate-600">No registrations found</p>
                    <p className="text-xs text-slate-400 mt-1">No attendees have signed up for this event yet.</p>
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((r) => {
                  const regDate = r.registrationDate || r.registeredAt;
                  const attStatus = r.attendanceStatus || 'not_marked';

                  return (
                    <tr key={r.registrationId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-brand-700">
                        {r.registrationId}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{r.studentName || 'Student'}</p>
                        <p className="text-xs text-slate-400">{r.studentEmail || 'student@campus.edu'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{r.rollNumber || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(regDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            attStatus === 'present'
                              ? 'success'
                              : attStatus === 'absent'
                              ? 'danger'
                              : 'neutral'
                          }
                          className="capitalize"
                        >
                          {attStatus.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {r.status === 'waitlisted' && (
                          <button
                            onClick={() => handlePromoteWaitlist(String(r.registrationId))}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition-colors"
                            title="Promote to Confirmed"
                          >
                            <ArrowUpCircle size={14} />
                            <span>Promote</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
