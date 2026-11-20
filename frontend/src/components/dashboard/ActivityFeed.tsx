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
  event_registration: <CalendarCheck size={16} />,
  registration_confirmed: <CheckCircle2 size={16} />,
  attendance_recorded: <CheckCircle2 size={16} />,
  certificate_issued: <Award size={16} />,
  club_membership_approved: <Users size={16} />,
  event_reminder: <Bell size={16} />,
  general: <Star size={16} />,
};

const colorMap: Record<string, string> = {
  teal: 'bg-teal-100 text-teal-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-brand-100 text-brand-700',
  red: 'bg-red-100 text-red-700',
  default: 'bg-slate-100 text-slate-500',
};

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card className="text-center py-8 text-slate-400 text-sm">
        No recent activity.
      </Card>
    );
  }

  return (
    <Card padding="none">
      <ul className="divide-y divide-slate-100">
        {activities.map((activity, idx) => {
          const color = colorMap[activity.iconColor ?? 'default'] ?? colorMap.default;
          const icon = iconMap[activity.type] ?? iconMap.general;

          return (
            <li
              key={activity.activityId}
              className={[
                'flex items-start gap-3 px-5 py-4',
                idx === 0 ? 'rounded-t-xl' : '',
                idx === activities.length - 1 ? 'rounded-b-xl' : '',
              ].join(' ')}
            >
              <div
                className={['w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', color].join(' ')}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 leading-snug">
                  {activity.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 mt-0.5 whitespace-nowrap">
                {timeAgo(activity.timestamp)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
