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
    <div className="rounded-xl border border-slate-200 shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Event</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Registered</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Event Date</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((reg) => {
              const { label: sLabel, variant: sVariant } = statusBadge(reg.status);
              const attendance = attendanceBadge(reg.attendanceStatus);
              return (
                <tr key={reg.registrationId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/student/events/${reg.eventId}`}
                      className="font-medium text-slate-800 hover:text-brand-800 leading-tight line-clamp-1 transition-colors"
                    >
                      {reg.eventTitle}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">{reg.clubName}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {formatDate(reg.registeredAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {formatDate(reg.startTime)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={sVariant} size="sm">{sLabel}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {attendance ? (
                      <Badge variant={attendance.variant} size="sm">{attendance.label}</Badge>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
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
