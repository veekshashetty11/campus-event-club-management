import React, { useState, useMemo } from 'react';
import type { CampusEvent } from '../../types/event';
import { Calendar, ChevronLeft, ChevronRight, Activity, Info } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';

interface CampusActivityHeatmapProps {
  events: CampusEvent[];
}

export default function CampusActivityHeatmap({ events }: CampusActivityHeatmapProps) {
  // Current view month & year (default to Oct/Nov 2026 or current date)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 1)); // Oct 2026

  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string;
    events: CampusEvent[];
    totalParticipants: number;
    x: number;
    y: number;
  } | null>(null);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  // Map events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, { events: CampusEvent[]; totalParticipants: number }> = {};

    events.forEach((ev) => {
      const dateKey = (ev.startDate || ev.eventDate || ev.startTime || '').split('T')[0];
      if (!dateKey) return;

      if (!map[dateKey]) {
        map[dateKey] = { events: [], totalParticipants: 0 };
      }
      map[dateKey].events.push(ev);
      map[dateKey].totalParticipants += ev.registeredCount || 0;
    });

    return map;
  }, [events]);

  // Generate calendar days for the selected month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Day of week offset (0 = Sunday, 1 = Monday, etc.)
    const startingDay = firstDay.getDay(); // 0 is Sunday
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Leading empty days from prev month
    for (let i = 0; i < startingDay; i++) {
      days.push({ dayNumber: null, dateStr: null });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr });
    }

    return days;
  }, [currentDate]);

  // Intensity color function
  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-[#17243B] border-[#263650]/80 text-slate-500 hover:border-slate-400';
    if (count === 1) return 'bg-indigo-950/70 border-indigo-700/60 text-indigo-300 hover:border-indigo-400';
    if (count === 2) return 'bg-indigo-700/80 border-indigo-500 text-white font-bold shadow-xs';
    if (count === 3) return 'bg-cyan-600/90 border-cyan-400 text-white font-bold shadow-sm';
    return 'bg-emerald-500 border-emerald-300 text-white font-black shadow-md';
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Card className="bg-[#111C32] border-[#263650] p-5 shadow-xl relative">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#263650]">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-cyan-400" />
            <h3 className="font-bold text-white text-base">Campus Event Activity Heatmap</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily event frequency and student participation volume across the university.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-[#17243B] border border-[#263650] text-slate-300 hover:text-white hover:bg-[#17243B]/80 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-bold text-xs text-slate-200 px-3 py-1 bg-[#17243B] border border-[#263650] rounded-lg min-w-[140px] text-center font-mono">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-[#17243B] border border-[#263650] text-slate-300 hover:text-white hover:bg-[#17243B]/80 transition-colors"
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
          <span key={w} className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {w}
          </span>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 gap-2 relative">
        {calendarDays.map((cell, idx) => {
          if (!cell.dayNumber || !cell.dateStr) {
            return (
              <div
                key={`empty-${idx}`}
                className="h-14 sm:h-16 rounded-xl bg-[#17243B]/20 border border-transparent"
              />
            );
          }

          const data = eventsByDate[cell.dateStr];
          const count = data?.events.length || 0;
          const isToday = cell.dateStr === todayStr;

          return (
            <div
              key={cell.dateStr}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredCell({
                  dateStr: cell.dateStr!,
                  events: data?.events || [],
                  totalParticipants: data?.totalParticipants || 0,
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                });
              }}
              onMouseLeave={() => setHoveredCell(null)}
              className={`h-14 sm:h-16 rounded-xl border p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer relative ${getIntensityClass(
                count
              )} ${isToday ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#111C32]' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold">{cell.dayNumber}</span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Today" />
                )}
              </div>

              {count > 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-mono leading-none block">
                    {count} {count === 1 ? 'evt' : 'evts'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend & Tooltip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-5 pt-3 border-t border-[#263650] text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Activity Intensity:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#17243B] border border-[#263650]" title="0 events" />
            <span className="text-[10px]">None</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-indigo-950/70 border border-indigo-700/60" title="1 event" />
            <span className="text-[10px]">Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-indigo-700/80 border border-indigo-500" title="2 events" />
            <span className="text-[10px]">Mod</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-cyan-600/90 border border-cyan-400" title="3 events" />
            <span className="text-[10px]">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-300" title="4+ events" />
            <span className="text-[10px]">Peak</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Hover any date to view scheduled events & participation count
        </div>
      </div>

      {/* Interactive Tooltip Card */}
      {hoveredCell && (
        <div
          className="fixed z-50 p-3 rounded-xl bg-[#0D1426] border border-[#263650] text-slate-100 shadow-2xl pointer-events-none max-w-xs -translate-x-1/2 -translate-y-full -mt-2 animate-fadeIn"
          style={{ left: hoveredCell.x, top: hoveredCell.y }}
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#263650] mb-2">
            <span className="font-bold text-xs text-white">
              {new Date(hoveredCell.dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <Badge variant={hoveredCell.events.length > 0 ? 'primary' : 'neutral'} size="sm">
              {hoveredCell.events.length} Events
            </Badge>
          </div>

          {hoveredCell.events.length === 0 ? (
            <p className="text-[11px] text-slate-400">No scheduled campus activities on this date.</p>
          ) : (
            <div className="space-y-1.5 text-[11px]">
              <div className="text-emerald-400 font-medium">
                👥 Total Expected Attendees: {hoveredCell.totalParticipants}
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {hoveredCell.events.map((ev) => (
                  <div key={ev.eventId} className="bg-[#17243B] p-1.5 rounded border border-[#263650]/60">
                    <p className="font-semibold text-slate-200 truncate">{ev.title}</p>
                    <span className="text-[10px] text-slate-400">
                      {ev.clubName} • {ev.venue?.name || 'Campus Venue'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
