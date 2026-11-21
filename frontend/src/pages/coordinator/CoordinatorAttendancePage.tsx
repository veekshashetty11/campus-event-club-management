import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  CheckSquare,
  Search,
  Check,
  Clock,
  X,
  Users,
  Percent,
  CheckCircle2,
  Calendar,
  Award,
  Download,
} from 'lucide-react';
import type { AttendanceMark } from '../../types/registration';

export default function CoordinatorAttendancePage() {
  const { user } = useAuth();
  const { events, registrations, getRegistrationsForEvent, markAttendance, issueCertificatesForEvent } = useManagement();

  const clubEvents = useMemo(() => {
    if (!user?.clubId) return events;
    return events.filter((e) => e.clubId === user.clubId);
  }, [events, user?.clubId]);

  const [selectedEventId, setSelectedEventId] = useState<number>(
    clubEvents[0]?.eventId || 1
  );
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);
  const [isIssuingCerts, setIsIssuingCerts] = useState(false);

  const selectedEvent = clubEvents.find((e) => e.eventId === selectedEventId) || clubEvents[0];

  const attendees = useMemo(() => {
    return getRegistrationsForEvent(selectedEventId).filter((r) => r.status === 'confirmed' || r.status === 'registered');
  }, [selectedEventId, registrations, getRegistrationsForEvent]);

  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const name = a.studentName || '';
      const email = a.studentEmail || '';
      const roll = a.rollNumber || '';
      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()) ||
        roll.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterState === 'all' || a.attendanceStatus === filterState;
      return matchesSearch && matchesFilter;
    });
  }, [attendees, search, filterState]);

  // Statistics
  const totalCount = attendees.length;
  const presentCount = attendees.filter((a) => a.attendanceStatus === 'present').length;
  const lateCount = attendees.filter((a) => a.attendanceStatus === 'late').length;
  const absentCount = attendees.filter((a) => a.attendanceStatus === 'absent').length;
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  const handleMark = async (regNumericId: number, status: AttendanceMark) => {
    await markAttendance(regNumericId, status);
  };

  const handleMarkAllPresent = async () => {
    for (const attendee of attendees) {
      if (attendee.attendanceStatus !== 'present') {
        await markAttendance(Number(attendee.id || attendee.registrationId), 'present');
      }
    }
    setNotification('All attendees marked as Present.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleIssueCertificates = async () => {
    setIsIssuingCerts(true);
    try {
      const res = await issueCertificatesForEvent(selectedEventId);
      setNotification(res.message);
      setTimeout(() => setNotification(null), 6000);
    } catch (err: unknown) {
      setNotification(err instanceof Error ? err.message : 'Failed to issue certificates.');
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsIssuingCerts(false);
    }
  };

  const handleExportAttendanceReport = () => {
    const title = selectedEvent?.title || 'Event';
    const header = 'Registration ID,Student Name,Email,Roll Number,Attendance Status,Checked In At,Certificate Status\n';
    const rows = attendees
      .map((a) => {
        const cert = a.certificateIssued ? (a.certificateId || 'Issued') : 'Not Issued';
        return `"${a.registrationId}","${a.studentName || 'Student'}","${a.studentEmail || ''}","${a.rollNumber || 'N/A'}","${a.attendanceStatus || 'not_marked'}","${a.checkedInAt || 'N/A'}","${cert}"`;
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Attendance_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Attendance Tracking' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Event Attendance Tracking</h1>
          <p className="text-sm text-slate-500">
            Check-in registered students in real time and monitor attendance rates.
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
                {evt.title} ({evt.startDate ? new Date(evt.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (evt.eventDate || 'TBD')})
              </option>
            ))}
          </select>

          <Button variant="secondary" onClick={handleMarkAllPresent} disabled={attendees.length === 0} size="sm">
            <CheckCircle2 size={15} className="mr-1.5 text-emerald-600" />
            Mark All Present
          </Button>

          <Button
            variant="primary"
            onClick={handleIssueCertificates}
            disabled={attendees.length === 0 || isIssuingCerts || (presentCount + lateCount) === 0}
            size="sm"
            isLoading={isIssuingCerts}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0"
          >
            <Award size={15} className="mr-1.5" />
            Generate Certificates ({presentCount + lateCount})
          </Button>

          <Button variant="outline" onClick={handleExportAttendanceReport} disabled={attendees.length === 0} size="sm">
            <Download size={15} className="mr-1.5" />
            Export Sheet
          </Button>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Real-time Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="p-3.5 bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Confirmed</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </Card>

        <Card className="p-3.5 bg-emerald-50/60 border border-emerald-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Present</p>
          <p className="text-xl font-bold text-emerald-800 mt-1">{presentCount}</p>
        </Card>

        <Card className="p-3.5 bg-amber-50/60 border border-amber-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Late</p>
          <p className="text-xl font-bold text-amber-800 mt-1">{lateCount}</p>
        </Card>

        <Card className="p-3.5 bg-rose-50/60 border border-rose-200/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Absent</p>
          <p className="text-xl font-bold text-rose-800 mt-1">{absentCount}</p>
        </Card>

        <Card className="p-3.5 bg-brand-50/60 border border-brand-200/80 col-span-2 lg:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">Attendance Rate</p>
          <p className="text-xl font-bold text-brand-900 mt-1">{attendanceRate}%</p>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search attendee by name, roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Attendees ({attendees.length})</option>
              <option value="present">Present ({presentCount})</option>
              <option value="late">Late ({lateCount})</option>
              <option value="absent">Absent ({absentCount})</option>
              <option value="not_marked">Not Marked</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Attendance Check-in Table */}
      <Card className="overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Reg ID</th>
                <th className="py-3.5 px-4">Attendee</th>
                <th className="py-3.5 px-4">Roll Number</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4">Certificate</th>
                <th className="py-3.5 px-5 text-right">Quick Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="font-medium text-slate-600">No attendees match your filter</p>
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((a) => {
                  const regId = Number(a.id || a.registrationId);
                  const attStatus = a.attendanceStatus || 'not_marked';
                  const isPresent = attStatus === 'present' || attStatus === 'late';

                  return (
                    <tr key={regId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-xs text-slate-500">{a.registrationId}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{a.studentName || 'Student'}</p>
                        <p className="text-xs text-slate-400">{a.studentEmail || 'student@campus.edu'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{a.rollNumber || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            attStatus === 'present'
                              ? 'success'
                              : attStatus === 'late'
                              ? 'warning'
                              : attStatus === 'absent'
                              ? 'danger'
                              : 'neutral'
                          }
                          className="capitalize"
                        >
                          {attStatus.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {a.certificateIssued ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Award size={12} className="text-amber-600" />
                            Issued
                          </span>
                        ) : isPresent ? (
                          <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Eligible
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleMark(regId, 'present')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              attStatus === 'present'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            Present
                          </button>

                          <button
                            onClick={() => handleMark(regId, 'late')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              attStatus === 'late'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            Late
                          </button>

                          <button
                            onClick={() => handleMark(regId, 'absent')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              attStatus === 'absent'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
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
