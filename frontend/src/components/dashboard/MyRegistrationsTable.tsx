import { Link } from 'react-router-dom';
import type { EventRegistration } from '../../types/registration';
import Badge from '../common/Badge';
import Card from '../common/Card';
import { formatDate } from '../../utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary' | 'teal' | 'amber';

function statusBadge(status: EventRegistration['status']): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'registered': return { label: 'Registered', variant: 'primary' };
    case 'attended': return { label: 'Attended', variant: 'success' };
    case 'cancelled': return { label: 'Cancelled', variant: 'danger' };
    case 'no_show': return { label: 'No Show', variant: 'warning' };
    case 'waitlisted': return { label: 'Waitlisted', variant: 'amber' };
    default: return { label: status, variant: 'default' };
  }
}

function attendanceBadge(status?: string): { label: string; variant: BadgeVariant } | null {
  if (!status) return null;
  switch (status) {
    case 'present': return { label: 'Present', variant: 'success' };
    case 'absent': return { label: 'Absent', variant: 'danger' };
    case 'late': return { label: 'Late', variant: 'warning' };
    case 'excused': return { label: 'Excused', variant: 'info' };
    default: return null;
  }
}

interface MyRegistrationsTableProps {
  registrations: EventRegistration[];
}

export default function MyRegistrationsTable({ registrations }: MyRegistrationsTableProps) {
  if (registrations.length === 0) {
    return (
      <Card className="text-center py-8 text-slate-400 text-sm">
        No registrations yet.
      </Card>
    );
  }

  return (
    <div className="rounded-2xl border border-[#263650] bg-[#111C32] shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-[#17243B] border-b border-[#263650]">
              <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-300 uppercase tracking-wider">Event</th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">Registered</th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">Event Date</th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-300 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-300 uppercase tracking-wider">Attendance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#263650]/50">
            {registrations.map((reg) => {
              const { label: sLabel, variant: sVariant } = statusBadge(reg.status);
              const attendance = attendanceBadge(reg.attendanceStatus);
              return (
                <tr key={reg.registrationId} className="hover:bg-[#17243B]/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/student/events/${reg.eventId}`}
                      className="font-semibold text-white hover:text-indigo-400 leading-tight line-clamp-1 transition-colors"
                    >
                      {reg.eventTitle}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">{reg.clubName}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(reg.registrationDate || reg.registeredAt || '')}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-300 whitespace-nowrap font-medium">
                    {formatDate(reg.startTime)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={sVariant} size="sm">
                      {sLabel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    {attendance ? (
                      <Badge variant={attendance.variant} size="sm" dot>
                        {attendance.label}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
