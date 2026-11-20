import { Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import type { CampusEvent } from '../../types/event';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { formatDate, formatTime, capacityPercent } from '../../utils';
import { useNavigate } from 'react-router-dom';

interface UpcomingEventCardProps {
  event: CampusEvent;
}

const categoryBadgeVariant = (cat: string): 'primary' | 'teal' | 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'default' => {
  switch (cat) {
    case 'Technical': return 'primary';
    case 'Cultural': return 'amber';
    case 'Sports': return 'danger';
    case 'Workshop': return 'info';
    case 'Career': return 'success';
    case 'Seminar': return 'teal';
    case 'Social': return 'warning';
    default: return 'default';
  }
};

export default function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const navigate = useNavigate();
  const filled = capacityPercent(event.registeredCount, event.maxCapacity);
  const spotsLeft = event.maxCapacity - event.registeredCount;
  const isFull = spotsLeft <= 0;
  const isCompleted = event.status === 'completed';

  const handleNavigate = () => {
    navigate(`/student/events/${event.eventId}`);
  };

  return (
    <div
      onClick={handleNavigate}
      className="bg-white rounded-xl border border-slate-200 shadow-soft flex flex-col overflow-hidden hover:border-brand-400 hover:shadow-card transition-all duration-150 cursor-pointer group"
    >
      {/* Top category strip */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: event.categoryColor || '#1b3b57' }}
      />

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Category + Status */}
        <div className="flex items-start justify-between gap-2">
          <Badge variant={categoryBadgeVariant(event.category)} size="sm">
            {event.category}
          </Badge>
          {event.isRegistered ? (
            event.registrationStatus === 'waitlisted' ? (
              <Badge variant="amber" size="sm" dot>
                Waitlist #{event.waitlistPosition ?? 1}
              </Badge>
            ) : (
              <Badge variant="success" size="sm" dot>
                Registered
              </Badge>
            )
          ) : isCompleted ? (
            <Badge variant="default" size="sm">Completed</Badge>
          ) : isFull ? (
            <Badge variant="danger" size="sm">Full ({event.waitlistCount} WL)</Badge>
          ) : filled >= 80 ? (
            <Badge variant="warning" size="sm">Filling Fast</Badge>
          ) : (
            <Badge variant="teal" size="sm">Open</Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-brand-800 transition-colors">
          {event.title}
        </h3>

        {/* Meta details */}
        <div className="flex flex-col gap-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>{formatDate(event.startTime)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400 shrink-0" />
            <span>
              {formatTime(event.startTime)} – {formatTime(event.endTime)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">
              {event.isOnline ? 'Online Event' : (event.venue?.name ?? 'Venue TBD')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{event.clubName}</span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>
              {event.registeredCount}/{event.maxCapacity} seats
            </span>
            <span className={isFull ? 'text-red-500 font-medium' : 'text-emerald-600 font-medium'}>
              {isFull ? 'Waitlist open' : `${spotsLeft} spots left`}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={[
                'h-full rounded-full transition-all duration-300',
                filled >= 100 ? 'bg-red-500' : filled >= 80 ? 'bg-amber-400' : 'bg-emerald-500',
              ].join(' ')}
              style={{ width: `${filled}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto pt-1">
          <Button
            variant={event.isRegistered ? 'outline' : isFull ? 'secondary' : 'primary'}
            size="sm"
            rightIcon={<ArrowRight size={13} />}
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate();
            }}
          >
            {event.isRegistered
              ? 'View Details & Pass'
              : isFull
              ? 'Join Waitlist'
              : 'View Details & Register'}
          </Button>
        </div>
      </div>
    </div>
  );
}
