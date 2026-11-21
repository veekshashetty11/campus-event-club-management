import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Calendar, MapPin, ArrowRight, Layers } from 'lucide-react';
import type { CampusEvent } from '../../types/event';
import { computeSimilarEvents } from '../../services/recommendationService';
import { formatDate, formatTime } from '../../utils';
import Card from '../common/Card';

interface SimilarEventsSectionProps {
  currentEvent: CampusEvent;
  allEvents: CampusEvent[];
}

export default function SimilarEventsSection({
  currentEvent,
  allEvents,
}: SimilarEventsSectionProps) {
  const navigate = useNavigate();

  const similarEvents = useMemo(() => {
    return computeSimilarEvents(currentEvent, allEvents, 3);
  }, [currentEvent, allEvents]);

  if (similarEvents.length === 0) {
    return null;
  }

  return (
    <Card padding="md" className="space-y-4 bg-[#111C32] border border-[#263650]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Sparkles size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Similar Events (AI Recommendations)
            </h3>
            <p className="text-[11px] text-slate-400">
              Discovered via affinity matching in {currentEvent.category} & student clubs
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {similarEvents.map(({ event: simEvent, similarityScore, matchFactors }) => {
          return (
            <div
              key={simEvent.eventId}
              onClick={() => {
                navigate(`/student/events/${simEvent.eventId}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group bg-[#17243B] hover:bg-[#1f304f] rounded-xl border border-[#263650] hover:border-indigo-500/50 p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
            >
              <div>
                {/* Similarity score pill */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                    {similarityScore}% Match
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 truncate max-w-[120px]">
                    {simEvent.category}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                  {simEvent.title}
                </h4>

                <p className="text-[11px] text-slate-400 mt-0.5 truncate font-medium">
                  {simEvent.clubName}
                </p>

                {/* Match factors */}
                <div className="mt-2 text-[10px] text-indigo-300 bg-[#0d1426]/60 rounded-md p-1.5 flex items-center gap-1 border border-[#263650]/60">
                  <Layers size={10} className="shrink-0 text-indigo-400" />
                  <span className="truncate">{matchFactors.join(' • ')}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#263650]/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate">
                  {formatDate(simEvent.startDate || simEvent.startTime)}
                </span>
                <span className="flex items-center gap-1 text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  View <ArrowRight size={11} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
