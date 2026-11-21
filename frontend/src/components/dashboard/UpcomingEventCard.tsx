import React from 'react';
import { Calendar, MapPin, Users, Clock, ArrowRight, Zap } from 'lucide-react';
import type { CampusEvent } from '../../types/event';
import Button from '../common/Button';
import { formatDate, formatTime, capacityPercent } from '../../utils';
import { useNavigate } from 'react-router-dom';

interface UpcomingEventCardProps {
  event: CampusEvent;
}

const categoryConfig: Record<string, { gradient: string; emoji: string }> = {
  Technical: { gradient: 'from-[#4F46E5] to-[#3B82F6]', emoji: '⚡' },
  Cultural:  { gradient: 'from-[#F59E0B] to-[#F97316]', emoji: '🎭' },
  Sports:    { gradient: 'from-[#F43F5E] to-[#E11D48]', emoji: '🏆' },
  Workshop:  { gradient: 'from-[#06B6D4] to-[#0284C7]', emoji: '🛠️' },
  Career:    { gradient: 'from-[#10B981] to-[#0D9488]', emoji: '💼' },
  Seminar:   { gradient: 'from-[#0D9488] to-[#059669]', emoji: '📚' },
  Social:    { gradient: 'from-[#EC4899] to-[#8B5CF6]', emoji: '🎉' },
};

export default function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const navigate = useNavigate();
  const filled = capacityPercent(event.registeredCount, event.maxCapacity);
  const spotsLeft = event.maxCapacity - event.registeredCount;
  const isFull = spotsLeft <= 0;
  const isCompleted = event.status === 'completed';
  const catCfg = categoryConfig[event.category] ?? { gradient: 'from-slate-600 to-slate-800', emoji: '📅' };

  const handleNavigate = () => navigate(`/student/events/${event.eventId}`);

  return (
    <div
      onClick={handleNavigate}
      className="group relative bg-[#111C32] rounded-2xl border border-[#263650] shadow-md hover:shadow-2xl hover:border-[#3B82F6]/50 transition-all duration-300 cursor-pointer overflow-hidden card-lift flex flex-col"
    >
      {/* Category gradient header banner */}
      <div className={`h-24 bg-gradient-to-br ${catCfg.gradient} relative overflow-hidden flex-shrink-0`}>
        {/* Subtle decorative circles */}
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -right-2 bottom-2 w-12 h-12 rounded-full bg-white/10" />
        <div className="absolute top-3 left-4 text-3xl">{catCfg.emoji}</div>

        {/* Status badge in top right */}
        <div className="absolute top-3 right-3">
          {event.isRegistered ? (
            event.registrationStatus === 'waitlisted' ? (
              <span className="text-[11px] font-bold bg-[#0D1426]/90 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 shadow-sm">
                Waitlisted
              </span>
            ) : (
              <span className="text-[11px] font-bold bg-[#0D1426]/90 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Registered
              </span>
            )
          ) : isCompleted ? (
            <span className="text-[11px] font-bold bg-[#0D1426]/90 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">Done</span>
          ) : isFull ? (
            <span className="text-[11px] font-bold bg-[#0D1426]/90 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/40">Full</span>
          ) : filled >= 80 ? (
            <span className="text-[11px] font-bold bg-[#0D1426]/90 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
              <Zap size={10} /> Filling
            </span>
          ) : (
            <span className="text-[11px] font-bold bg-[#0D1426]/90 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">Open</span>
          )}
        </div>

        {/* Category label */}
        <div className="absolute bottom-2.5 left-4">
          <span className="text-[11px] font-black text-white/90 uppercase tracking-widest">{event.category}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Title */}
        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors">
          {event.title}
        </h3>

        {/* Meta details */}
        <div className="flex flex-col gap-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#17243B] border border-[#263650] flex items-center justify-center shrink-0">
              <Calendar size={11} className="text-indigo-400" />
            </div>
            <span className="truncate">
              {formatDate(event.startDate || event.startTime)}, {event.startTime?.includes('T') ? formatTime(event.startTime) : (event.startTime || '10:00 AM')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#17243B] border border-[#263650] flex items-center justify-center shrink-0">
              <MapPin size={11} className="text-blue-400" />
            </div>
            <span className="truncate">{event.isOnline ? '🌐 Online Event' : (event.venue?.name ?? 'Venue TBD')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#17243B] border border-[#263650] flex items-center justify-center shrink-0">
              <Users size={11} className="text-emerald-400" />
            </div>
            <span className="truncate font-medium text-slate-300">{event.clubName}</span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">{event.registeredCount}/{event.maxCapacity} seats</span>
            <span className={isFull ? 'text-rose-400 font-bold' : filled >= 80 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-semibold'}>
              {isFull ? 'Waitlist open' : `${spotsLeft} left`}
            </span>
          </div>
          <div className="h-1.5 bg-[#17243B] rounded-full overflow-hidden border border-[#263650]">
            <div
              className={[
                'h-full rounded-full transition-all duration-500',
                filled >= 100 ? 'bg-gradient-to-r from-rose-500 to-red-600' :
                filled >= 80  ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                'bg-gradient-to-r from-emerald-400 to-teal-500',
              ].join(' ')}
              style={{ width: `${Math.min(filled, 100)}%` }}
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
            onClick={(e) => { e.stopPropagation(); handleNavigate(); }}
          >
            {event.isRegistered ? 'View Pass' : isFull ? 'Join Waitlist' : 'Register Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
