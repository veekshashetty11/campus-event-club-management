import React from 'react';
import type { ActivityItem } from '../../types/notification';
import { timeAgo } from '../../utils';
import {
  CalendarCheck,
  CheckCircle2,
  Award,
  Users,
  Bell,
  Star,
} from 'lucide-react';
import Card from '../common/Card';

const iconMap: Record<string, React.ReactNode> = {
  event_registration: <CalendarCheck size={15} />,
  registration_confirmed: <CheckCircle2 size={15} />,
  attendance_recorded: <CheckCircle2 size={15} />,
  certificate_issued: <Award size={15} />,
  club_membership_approved: <Users size={15} />,
  event_reminder: <Bell size={15} />,
  general: <Star size={15} />,
};

const colorMap: Record<string, { bg: string; text: string; glow: string; dot: string }> = {
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-700',    glow: 'shadow-teal-200',    dot: 'bg-teal-500' },
  green:   { bg: 'bg-emerald-100', text: 'text-emerald-700', glow: 'shadow-emerald-200', dot: 'bg-emerald-500' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   glow: 'shadow-amber-200',   dot: 'bg-amber-500' },
  blue:    { bg: 'bg-violet-100',  text: 'text-violet-700',  glow: 'shadow-violet-200',  dot: 'bg-violet-500' },
  red:     { bg: 'bg-red-100',     text: 'text-red-700',     glow: 'shadow-red-200',     dot: 'bg-red-500' },
  default: { bg: 'bg-slate-100',   text: 'text-slate-500',   glow: '',                   dot: 'bg-slate-400' },
};

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card className="text-center py-10">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Star size={20} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium">No recent activity</p>
          <p className="text-xs">Activity will appear here as you use the platform</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[2.6rem] top-0 bottom-0 w-px bg-gradient-to-b from-violet-200 via-slate-200 to-transparent pointer-events-none" />

        <ul className="divide-y divide-slate-50">
          {activities.map((activity, idx) => {
            const colors = colorMap[activity.iconColor ?? 'default'] ?? colorMap.default;
            const icon = iconMap[activity.type] ?? iconMap.general;

            return (
              <li
                key={activity.activityId}
                className={[
                  'flex items-start gap-3 px-5 py-4 hover:bg-slate-50/80 transition-colors duration-150',
                  idx === 0 ? 'rounded-t-2xl' : '',
                  idx === activities.length - 1 ? 'rounded-b-2xl' : '',
                ].join(' ')}
              >
                <div className="relative flex flex-col items-center shrink-0">
                  <div
                    className={[
                      'w-8 h-8 rounded-full flex items-center justify-center shadow-sm z-10',
                      colors.bg, colors.text,
                    ].join(' ')}
                  >
                    {icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                    {activity.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {activity.description}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {timeAgo(activity.timestamp)}
                  </span>
                  <span className={['w-2 h-2 rounded-full', colors.dot].join(' ')} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
