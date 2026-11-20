import React from 'react';
import { Calendar, MapPin, Users, Clock, ArrowRight, Zap } from 'lucide-react';
import type { CampusEvent } from '../../types/event';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { formatDate, formatTime, capacityPercent } from '../../utils';
import { useNavigate } from 'react-router-dom';

interface UpcomingEventCardProps {
  event: CampusEvent;
}

type BadgeVariant = 'primary' | 'teal' | 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'default' | 'violet';

const categoryConfig: Record<string, { variant: BadgeVariant; gradient: string; emoji: string }> = {
  Technical: { variant: 'violet', gradient: 'from-violet-500 to-blue-500', emoji: '⚡' },
  Cultural:  { variant: 'amber',  gradient: 'from-amber-400 to-orange-500', emoji: '🎭' },
  Sports:    { variant: 'danger', gradient: 'from-red-500 to-rose-500', emoji: '🏆' },
  Workshop:  { variant: 'info',   gradient: 'from-sky-500 to-cyan-500', emoji: '🛠️' },
  Career:    { variant: 'success',gradient: 'from-emerald-500 to-teal-500', emoji: '💼' },
  Seminar:   { variant: 'teal',   gradient: 'from-teal-500 to-cyan-500', emoji: '📚' },
  Social:    { variant: 'warning',gradient: 'from-orange-400 to-pink-500', emoji: '🎉' },
};

export default function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const navigate = useNavigate();
  const filled = capacityPercent(event.registeredCount, event.maxCapacity);
  const spotsLeft = event.maxCapacity - event.registeredCount;
  const isFull = spotsLeft <= 0;
  const isCompleted = event.status === 'completed';
  const catCfg = categoryConfig[event.category] ?? { variant: 'default' as BadgeVariant, gradient: 'from-slate-400 to-slate-500', emoji: '📅' };

  const handleNavigate = () => navigate(`/student/events/${event.eventId}`);

  return (
    <div
      onClick={handleNavigate}
      className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-violet-200 transition-all duration-300 cursor-pointer overflow-hidden card-lift flex flex-col"
    >
      {/* Category gradient header */}
      <div className={`h-24 bg-gradient-to-br ${catCfg.gradient} relative overflow-hidden flex-shrink-0`}>
        {/* Decorative circles */}
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -right-2 bottom-2 w-12 h-12 rounded-full bg-white/10" />
        <div className="absolute top-3 left-4 text-3xl">{catCfg.emoji}</div>

        {/* Status badge in top right */}
        <div className="absolute top-3 right-3">
          {event.isRegistered ? (
            event.registrationStatus === 'waitlisted' ? (
              <span className="text-xs font-bold bg-white/90 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                Waitlisted
              </span>
            ) : (
              <span className="text-xs font-bold bg-white/90 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Registered
              </span>
            )
          ) : isCompleted ? (
            <span className="text-xs font-bold bg-white/90 text-slate-600 px-2 py-0.5 rounded-full">Done</span>
          ) : isFull ? (
            <span className="text-xs font-bold bg-white/90 text-red-600 px-2 py-0.5 rounded-full">Full</span>
          ) : filled >= 80 ? (
            <span className="text-xs font-bold bg-white/90 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Zap size={10} /> Filling
            </span>
          ) : (
            <span className="text-xs font-bold bg-white/90 text-emerald-600 px-2 py-0.5 rounded-full">Open</span>
          )}
        </div>

        {/* Category label */}
        <div className="absolute bottom-3 left-4">
          <span className="text-xs font-bold text-white/90 uppercase tracking-wider">{event.category}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Title */}
        <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
          {event.title}
        </h3>

        {/* Meta details */}
        <div className="flex flex-col gap-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-violet-50 flex items-center justify-center">
              <Calendar size={11} className="text-violet-500" />
            </div>
            <span>{formatDate(event.startTime)}, {formatTime(event.startTime)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
              <MapPin size={11} className="text-blue-500" />
            </div>
            <span className="truncate">{event.isOnline ? '🌐 Online Event' : (event.venue?.name ?? 'Venue TBD')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-teal-50 flex items-center justify-center">
              <Users size={11} className="text-teal-500" />
            </div>
            <span className="truncate font-medium text-slate-600">{event.clubName}</span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500">{event.registeredCount}/{event.maxCapacity} seats</span>
            <span className={isFull ? 'text-red-500 font-bold' : filled >= 80 ? 'text-orange-500 font-bold' : 'text-emerald-600 font-semibold'}>
              {isFull ? 'Waitlist open' : `${spotsLeft} left`}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={[
                'h-full rounded-full transition-all duration-500',
                filled >= 100 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                filled >= 80  ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                'bg-gradient-to-r from-emerald-400 to-teal-500',
              ].join(' ')}
              style={{ width: `${Math.min(filled, 100)}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          <Button
            variant={event.isRegistered ? 'outline' : isFull ? 'secondary' : 'primary'}
            size="sm"
            rightIcon={<ArrowRight size={13} />}
            className="w-full"
            onClick={(e) => { e.stopPropagation(); handleNavigate(); }}
          >
            {event.isRegistered ? 'View Pass' : isFull ? 'Join Waitlist' : 'Register Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
