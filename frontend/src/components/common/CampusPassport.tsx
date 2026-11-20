import React, { useState } from 'react';
import {
  Award,
  Trophy,
  Star,
  Sparkles,
  Lock,
  CheckCircle2,
  Calendar,
  Users,
  ShieldCheck,
  ChevronRight,
  Zap,
} from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import Modal from './Modal';

export interface AchievementBadge {
  id: string;
  title: string;
  category: 'events' | 'clubs' | 'leadership' | 'certificates';
  description: string;
  requirement: string;
  iconName: string;
  points: number;
  unlockedAt?: string;
  isUnlocked: boolean;
  progress?: { current: number; total: number };
}

interface CampusPassportProps {
  totalPoints: number;
  eventsAttended: number;
  clubMemberships: number;
  certificatesEarned: number;
  studentName?: string;
  compact?: boolean;
}

export default function CampusPassport({
  totalPoints,
  eventsAttended,
  clubMemberships,
  certificatesEarned,
  studentName = 'Student',
  compact = false,
}: CampusPassportProps) {
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);

  // Determine Level & Tier based on actual points
  const getLevelInfo = (pts: number) => {
    if (pts >= 300) return { level: 4, name: 'Platinum Luminary', min: 300, max: 500, color: 'text-cyan-300', bg: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30' };
    if (pts >= 180) return { level: 3, name: 'Gold Scholar', min: 180, max: 300, color: 'text-amber-300', bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30' };
    if (pts >= 80) return { level: 2, name: 'Silver Achiever', min: 80, max: 180, color: 'text-slate-200', bg: 'from-slate-400/20 to-indigo-500/20', border: 'border-slate-400/30' };
    return { level: 1, name: 'Bronze Explorer', min: 0, max: 80, color: 'text-emerald-300', bg: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30' };
  };

  const levelInfo = getLevelInfo(totalPoints);
  const nextLevelPoints = levelInfo.max;
  const progressInLevel = Math.min(100, Math.round(((totalPoints - levelInfo.min) / (levelInfo.max - levelInfo.min)) * 100));

  // Compute real badges from student records
  const badges: AchievementBadge[] = [
    {
      id: 'first_checkin',
      title: 'First Step',
      category: 'events',
      description: 'Attended your first extracurricular campus event.',
      requirement: 'Attend 1 verified campus event',
      iconName: 'calendar',
      points: 25,
      isUnlocked: eventsAttended >= 1,
      unlockedAt: eventsAttended >= 1 ? 'Fall 2026' : undefined,
      progress: { current: Math.min(1, eventsAttended), total: 1 },
    },
    {
      id: 'event_enthusiast',
      title: 'Event Enthusiast',
      category: 'events',
      description: 'Active campus participant with at least 3 attended events.',
      requirement: 'Attend 3 verified campus events',
      iconName: 'zap',
      points: 50,
      isUnlocked: eventsAttended >= 3,
      unlockedAt: eventsAttended >= 3 ? 'Fall 2026' : undefined,
      progress: { current: Math.min(3, eventsAttended), total: 3 },
    },
    {
      id: 'campus_legend',
      title: 'Campus Master',
      category: 'events',
      description: 'Consistently engaged student attending 6 or more major events.',
      requirement: 'Attend 6 campus events',
      iconName: 'trophy',
      points: 100,
      isUnlocked: eventsAttended >= 6,
      progress: { current: Math.min(6, eventsAttended), total: 6 },
    },
    {
      id: 'club_voyager',
      title: 'Club Voyager',
      category: 'clubs',
      description: 'Enrolled member of a registered campus student society.',
      requirement: 'Join at least 1 student club or chapter',
      iconName: 'users',
      points: 30,
      isUnlocked: clubMemberships >= 1,
      unlockedAt: clubMemberships >= 1 ? 'Fall 2026' : undefined,
      progress: { current: Math.min(1, clubMemberships), total: 1 },
    },
    {
      id: 'multidisciplinary',
      title: 'Club Multi-Pass',
      category: 'clubs',
      description: 'Active participant in 2 or more campus clubs simultaneously.',
      requirement: 'Active membership in 2+ student clubs',
      iconName: 'sparkles',
      points: 60,
      isUnlocked: clubMemberships >= 2,
      unlockedAt: clubMemberships >= 2 ? 'Fall 2026' : undefined,
      progress: { current: Math.min(2, clubMemberships), total: 2 },
    },
    {
      id: 'credential_holder',
      title: 'Certified Scholar',
      category: 'certificates',
      description: 'Earned and verified an official academic participation certificate.',
      requirement: 'Receive 1 verified completion certificate',
      iconName: 'shield',
      points: 40,
      isUnlocked: certificatesEarned >= 1,
      unlockedAt: certificatesEarned >= 1 ? 'October 2026' : undefined,
      progress: { current: Math.min(1, certificatesEarned), total: 1 },
    },
    {
      id: 'credential_collector',
      title: 'Honor Diplomat',
      category: 'certificates',
      description: 'Earned 3 or more verifiable event and workshop credentials.',
      requirement: 'Receive 3 verified certificates',
      iconName: 'award',
      points: 90,
      isUnlocked: certificatesEarned >= 3,
      progress: { current: Math.min(3, certificatesEarned), total: 3 },
    },
    {
      id: 'point_titan',
      title: 'Century Milestone',
      category: 'leadership',
      description: 'Surpassed 100 cumulative student development activity points.',
      requirement: 'Earn 100 activity points',
      iconName: 'star',
      points: 50,
      isUnlocked: totalPoints >= 100,
      unlockedAt: totalPoints >= 100 ? 'Fall 2026' : undefined,
      progress: { current: Math.min(100, totalPoints), total: 100 },
    },
  ];

  const getBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const cls = isUnlocked ? 'text-white' : 'text-slate-500';
    switch (iconName) {
      case 'calendar': return <Calendar size={18} className={cls} />;
      case 'zap': return <Zap size={18} className={cls} />;
      case 'trophy': return <Trophy size={18} className={cls} />;
      case 'users': return <Users size={18} className={cls} />;
      case 'sparkles': return <Sparkles size={18} className={cls} />;
      case 'shield': return <ShieldCheck size={18} className={cls} />;
      case 'award': return <Award size={18} className={cls} />;
      case 'star': default: return <Star size={18} className={cls} />;
    }
  };

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  return (
    <div className="space-y-4">
      {/* Passport Header & Progress Ring Card */}
      <Card className="bg-gradient-to-br from-[#111C32] via-[#17243B] to-[#0D1426] border border-[#263650] p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${levelInfo.bg} ${levelInfo.border} border flex items-center justify-center shadow-lg shrink-0`}>
              <Trophy size={22} className={levelInfo.color} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-indigo-400">
                  Campus Passport
                </span>
                <Badge variant="primary" size="sm">Level {levelInfo.level}</Badge>
              </div>
              <h3 className="text-lg font-black text-white">{levelInfo.name}</h3>
              <p className="text-xs text-slate-400">
                {studentName} · <span className="text-amber-400 font-bold">{totalPoints} Activity Pts</span>
              </p>
            </div>
          </div>

          <div className="w-full sm:w-56 space-y-1.5 self-stretch sm:self-auto flex flex-col justify-center">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Next Tier Progress</span>
              <span className="font-bold text-slate-200">{totalPoints} / {nextLevelPoints} pts</span>
            </div>
            <div className="w-full h-2 bg-[#17243B] rounded-full overflow-hidden border border-[#263650]">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${progressInLevel}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 text-right">
              {unlockedCount} of {badges.length} Achievements Unlocked
            </span>
          </div>
        </div>
      </Card>

      {/* Badges Collection Grid */}
      <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-4'} gap-3`}>
        {badges.map((badge) => (
          <button
            key={badge.id}
            onClick={() => setSelectedBadge(badge)}
            className={`text-left p-3.5 rounded-xl border transition-all duration-200 relative group flex flex-col justify-between ${
              badge.isUnlocked
                ? 'bg-[#111C32] hover:bg-[#17243B] border-indigo-500/30 hover:border-indigo-500/60 shadow-md hover:shadow-indigo-500/10'
                : 'bg-[#111C32]/60 hover:bg-[#111C32] border-[#263650]/60 opacity-70 hover:opacity-90'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    badge.isUnlocked
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-600 shadow-md shadow-indigo-600/30'
                      : 'bg-[#17243B] border border-[#263650]'
                  }`}
                >
                  {getBadgeIcon(badge.iconName, badge.isUnlocked)}
                </div>
                {badge.isUnlocked ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> +{badge.points}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-500 bg-[#17243B] px-1.5 py-0.5 rounded border border-[#263650] flex items-center gap-0.5">
                    <Lock size={10} /> {badge.points} pts
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                {badge.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                {badge.description}
              </p>
            </div>

            {/* Progress bar for locked badges */}
            {badge.progress && !badge.isUnlocked && (
              <div className="mt-3 pt-2 border-t border-[#263650]/40">
                <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                  <span>Req: {badge.requirement}</span>
                  <span className="font-bold text-slate-300">{badge.progress.current}/{badge.progress.total}</span>
                </div>
                <div className="w-full h-1 bg-[#17243B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-500 rounded-full"
                    style={{ width: `${(badge.progress.current / badge.progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {badge.isUnlocked && badge.unlockedAt && (
              <span className="text-[10px] text-emerald-400/80 font-mono mt-2 block">
                ✓ Earned {badge.unlockedAt}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedBadge && (
        <Modal
          isOpen={!!selectedBadge}
          onClose={() => setSelectedBadge(null)}
          title="Achievement Details"
        >
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#17243B] border border-[#263650]">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  selectedBadge.isUnlocked
                    ? 'bg-gradient-to-br from-indigo-600 to-cyan-500 shadow-xl'
                    : 'bg-[#111C32] border border-[#263650]'
                }`}
              >
                {getBadgeIcon(selectedBadge.iconName, selectedBadge.isUnlocked)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">{selectedBadge.title}</h3>
                  <Badge variant={selectedBadge.isUnlocked ? 'success' : 'neutral'} size="sm">
                    {selectedBadge.isUnlocked ? 'Unlocked' : 'Locked'}
                  </Badge>
                </div>
                <p className="text-xs text-amber-400 font-bold mt-0.5">
                  +{selectedBadge.points} Activity Points
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Description</span>
                <p className="text-slate-200">{selectedBadge.description}</p>
              </div>
              <div className="pt-2 border-t border-[#263650]/60">
                <span className="text-slate-400 block font-semibold mb-0.5">Eligibility Requirement</span>
                <p className="text-slate-200">{selectedBadge.requirement}</p>
              </div>
              {selectedBadge.progress && (
                <div className="pt-2 border-t border-[#263650]/60">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Current Progress</span>
                    <span className="font-bold text-slate-200">
                      {selectedBadge.progress.current} of {selectedBadge.progress.total}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#17243B] rounded-full overflow-hidden border border-[#263650]">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, (selectedBadge.progress.current / selectedBadge.progress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBadge(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#17243B] text-slate-200 hover:bg-[#17243B]/80 border border-[#263650]"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
