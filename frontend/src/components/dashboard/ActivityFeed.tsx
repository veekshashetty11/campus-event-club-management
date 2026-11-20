import React, { useState, useMemo } from 'react';
import type { ActivityItem } from '../../types/notification';
import { timeAgo } from '../../utils';
import {
  CalendarCheck,
  CheckCircle2,
  Award,
  Users,
  Bell,
  Star,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';

const iconMap: Record<string, React.ReactNode> = {
  event_registration: <CalendarCheck size={16} />,
  registration_cancelled: <XCircle size={16} />,
  waitlist_promoted: <Sparkles size={16} />,
  registration_confirmed: <CheckCircle2 size={16} />,
  attendance_recorded: <CheckCircle2 size={16} />,
  certificate_issued: <Award size={16} />,
  club_membership_approved: <Users size={16} />,
  achievement_unlocked: <Star size={16} />,
  event_reminder: <Bell size={16} />,
  general: <Star size={16} />,
};

const categoryBadgeMap: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'amber' | 'teal' | 'neutral' }> = {
  event_registration: { label: 'Event Booking', variant: 'primary' },
  registration_cancelled: { label: 'Cancellation', variant: 'danger' },
  waitlist_promoted: { label: 'Waitlist Promoted', variant: 'amber' },
  registration_confirmed: { label: 'Confirmed Pass', variant: 'success' },
  attendance_recorded: { label: 'Check-In Verified', variant: 'success' },
  certificate_issued: { label: 'Credential Earned', variant: 'amber' },
  club_membership_approved: { label: 'Club Membership', variant: 'teal' },
  achievement_unlocked: { label: 'Achievement', variant: 'primary' },
  event_reminder: { label: 'Reminder', variant: 'neutral' },
  general: { label: 'Activity', variant: 'neutral' },
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  teal:    { bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/20' },
  green:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  blue:    { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20' },
  red:     { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20' },
  default: { bg: 'bg-[#17243B]',      text: 'text-slate-300',   border: 'border-[#263650]' },
};

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Group activities chronologically
  const groupedActivities = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const groups: { label: string; items: ActivityItem[] }[] = [];
    const todayItems: ActivityItem[] = [];
    const yesterdayItems: ActivityItem[] = [];
    const earlierItems: ActivityItem[] = [];

    activities.forEach((act) => {
      const actDate = new Date(act.timestamp).toDateString();
      if (actDate === today) {
        todayItems.push(act);
      } else if (actDate === yesterday) {
        yesterdayItems.push(act);
      } else {
        earlierItems.push(act);
      }
    });

    if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
    if (earlierItems.length > 0) groups.push({ label: 'Earlier Activity', items: earlierItems });

    // Fallback if timestamps are grouped into single bucket
    if (groups.length === 0 && activities.length > 0) {
      groups.push({ label: 'Recent Activity Timeline', items: activities });
    }

    return groups;
  }, [activities]);

  if (activities.length === 0) {
    return (
      <Card className="text-center py-12 bg-[#111C32] border-[#263650]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-[#17243B] border border-[#263650] flex items-center justify-center">
            <Star size={20} className="text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-300">No recent activity recorded</p>
          <p className="text-xs text-slate-500">Live events and updates will appear here automatically</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="bg-[#111C32] border-[#263650] overflow-hidden">
      <div className="divide-y divide-[#263650]/50">
        {groupedActivities.map((group) => (
          <div key={group.label} className="p-4 sm:p-5">
            {/* Date separator header */}
            <div className="flex items-center gap-2 mb-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                {group.label}
              </span>
              <div className="h-px flex-1 bg-[#263650]/60" />
            </div>

            {/* Timeline for this group */}
            <div className="relative pl-7 space-y-4 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-[#263650]">
              {group.items.map((activity) => {
                const colors = colorMap[activity.iconColor ?? 'default'] ?? colorMap.default;
                const icon = iconMap[activity.type] ?? iconMap.general;
                const badgeInfo = categoryBadgeMap[activity.type] ?? categoryBadgeMap.general;
                const isExpanded = expandedId === activity.activityId;

                return (
                  <div key={activity.activityId} className="relative group/item">
                    {/* Node Dot / Icon */}
                    <div
                      className={`absolute -left-7 top-0.5 w-7 h-7 rounded-xl ${colors.bg} ${colors.text} ${colors.border} border flex items-center justify-center shrink-0 z-10 shadow-sm transition-transform group-hover/item:scale-110`}
                    >
                      {icon}
                    </div>

                    {/* Content Box */}
                    <div
                      onClick={() => toggleExpand(activity.activityId)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isExpanded
                          ? 'bg-[#17243B] border-indigo-500/40 shadow-md'
                          : 'bg-[#17243B]/60 hover:bg-[#17243B] border-[#263650]/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant={badgeInfo.variant} size="sm">
                              {badgeInfo.label}
                            </Badge>
                            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                              <Clock size={11} className="text-slate-500" />
                              {timeAgo(activity.timestamp)}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 leading-tight">
                            {activity.title}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {activity.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-200 p-1 shrink-0 mt-0.5"
                          aria-label="Toggle details"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      {/* Expandable detail card */}
                      {isExpanded && (
                        <div className="mt-3 pt-2.5 border-t border-[#263650]/70 text-[11px] text-slate-300 space-y-1.5 animate-fadeIn">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Timestamp:</span>
                            <span className="font-mono text-slate-200">
                              {new Date(activity.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Activity ID:</span>
                            <span className="font-mono text-slate-400">{activity.activityId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Category Tag:</span>
                            <span className="capitalize text-indigo-300">{activity.type.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
