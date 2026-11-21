import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  CheckCircle2,
  BrainCircuit,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';
import {
  getPersonalizedEventRecommendations,
  RecommendedEvent,
} from '../../services/recommendationService';
import { formatDate, formatTime, capacityPercent } from '../../utils';
import RegistrationModal from '../common/RegistrationModal';
import Button from '../common/Button';

export default function AiRecommendedSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, registrations, memberships } = useStudent();

  const [recommendations, setRecommendations] = useState<RecommendedEvent[]>([]);
  const [selectedEventForReg, setSelectedEventForReg] = useState<RecommendedEvent | null>(null);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRecommendations = async () => {
    setIsRefreshing(true);
    try {
      const recs = await getPersonalizedEventRecommendations(
        user,
        events,
        registrations,
        memberships
      );
      setRecommendations(recs.slice(0, 3));
    } catch (_e) {
      // Handled silently
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [user, events, registrations, memberships]);

  if (recommendations.length === 0) {
    return null;
  }

  const handleRegisterClick = (e: React.MouseEvent, ev: RecommendedEvent) => {
    e.stopPropagation();
    setSelectedEventForReg(ev);
    setIsRegModalOpen(true);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#121b36] via-[#151e3f] to-[#0d1428] border border-indigo-500/30 p-5 sm:p-6 shadow-xl text-slate-100">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <BrainCircuit size={22} className={isRefreshing ? 'animate-spin' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                AI Recommended For You
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                <Sparkles size={10} className="text-cyan-400" />
                Smart Match
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized based on your memberships in <span className="text-indigo-300 font-semibold">{memberships.length} clubs</span> and interest history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => loadRecommendations()}
            disabled={isRefreshing}
            className="text-xs text-slate-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-[#263650] hover:border-cyan-500/40 bg-[#17243B]/60 transition-all flex items-center gap-1.5"
            title="Recalculate AI event affinities"
          >
            <Sparkles size={12} className={isRefreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'} />
            <span>Recalibrate</span>
          </button>
          <button
            onClick={() => navigate('/student/events?sort=ai_match')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors"
          >
            <span>View All Picks</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 3 AI Match Cards Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 z-10">
        {recommendations.map((rec) => {
          const filled = capacityPercent(rec.registeredCount, rec.maxCapacity);
          const spotsLeft = rec.maxCapacity - rec.registeredCount;

          return (
            <div
              key={rec.eventId}
              onClick={() => navigate(`/student/events/${rec.eventId}`)}
              className="group relative bg-[#17243B]/90 hover:bg-[#1a2944] rounded-xl border border-indigo-500/20 hover:border-indigo-500/60 transition-all duration-300 p-4 flex flex-col justify-between cursor-pointer shadow-md hover:shadow-indigo-500/10 hover:-translate-y-0.5"
            >
              <div>
                {/* Match percentage pill & reason badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black shadow-sm">
                    <Zap size={11} className="text-emerald-400 fill-emerald-400" />
                    <span>{rec.matchPercentage}% Match</span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                    {rec.reasonTag}
                  </span>
                </div>

                {/* Event Title */}
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                  {rec.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium truncate">
                  {rec.clubName}
                </p>

                {/* AI Reason narrative pill */}
                <div className="mt-3 p-2 rounded-lg bg-[#0d1426]/70 border border-[#263650] text-[11px] text-slate-300 flex items-start gap-1.5 leading-relaxed">
                  <Sparkles size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{rec.matchReason}</span>
                </div>

                {/* Meta info */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-indigo-400 shrink-0" />
                    <span className="truncate">
                      {formatDate(rec.startDate || rec.startTime)} • {rec.startTime?.includes('T') ? formatTime(rec.startTime) : (rec.startTime || '10:00 AM')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-rose-400 shrink-0" />
                    <span className="truncate">
                      {rec.isOnline ? '🌐 Online Event' : (rec.venue?.name ?? rec.venueName ?? 'Campus Venue')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom capacity and quick action */}
              <div className="mt-4 pt-3 border-t border-[#263650]/80 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>{spotsLeft} seats remaining</span>
                    <span className="font-semibold text-slate-300">{filled}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0d1426] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        filled >= 85 ? 'bg-amber-400' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, filled)}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => handleRegisterClick(e, rec)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-1.5 shrink-0"
                >
                  Register
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Registration Modal for Quick 1-Click Register */}
      {selectedEventForReg && (
        <RegistrationModal
          isOpen={isRegModalOpen}
          onClose={() => {
            setIsRegModalOpen(false);
            setSelectedEventForReg(null);
          }}
          event={selectedEventForReg}
        />
      )}
    </section>
  );
}
