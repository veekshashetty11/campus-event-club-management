import { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  CalendarCheck,
  Award,
  Users,
  CheckCheck,
  ArrowRight,
} from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { timeAgo } from '../../utils';
import { Link } from 'react-router-dom';
import type { NotificationType } from '../../types/notification';

export default function StudentNotificationsPage() {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, unreadNotificationsCount } = useStudent();
  const [filterType, setFilterType] = useState<string>('all'); // all, unread, event, club, certificate

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (filterType === 'unread') return !notif.isRead;
      if (filterType === 'event') {
        return (
          notif.type === 'event_registration' ||
          notif.type === 'event_reminder' ||
          notif.type === 'event_cancelled' ||
          notif.type === 'waitlist_promoted'
        );
      }
      if (filterType === 'club') {
        return notif.type === 'club_membership_approved';
      }
      if (filterType === 'certificate') {
        return notif.type === 'certificate_issued';
      }
      return true;
    });
  }, [notifications, filterType]);

  const getIconForType = (type: NotificationType | string) => {
    switch (type) {
      case 'event_registration':
      case 'registration_confirmed':
        return <CalendarCheck size={18} className="text-brand-700" />;
      case 'waitlist_promoted':
        return <CheckCircle2 size={18} className="text-emerald-600" />;
      case 'certificate_issued':
        return <Award size={18} className="text-amber-600" />;
      case 'club_membership_approved':
        return <Users size={18} className="text-teal-600" />;
      case 'event_reminder':
        return <Bell size={18} className="text-sky-600" />;
      default:
        return <Bell size={18} className="text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <Breadcrumbs
        items={[{ label: 'Student', path: '/student/dashboard' }, { label: 'Notifications & Alerts' }]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notification Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time updates regarding event registrations, waitlist status, certificates, and club memberships.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadNotificationsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck size={14} />}
              onClick={markAllNotificationsAsRead}
            >
              Mark All as Read ({unreadNotificationsCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <Card padding="sm">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Alerts', count: notifications.length },
            { id: 'unread', label: 'Unread Only', count: unreadNotificationsCount },
            { id: 'event', label: 'Events & Waitlist' },
            { id: 'club', label: 'Club Updates' },
            { id: 'certificate', label: 'Certificates' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={[
                'px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5',
                filterType === tab.id
                  ? 'bg-brand-800 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={[
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                    filterType === tab.id ? 'bg-brand-900 text-white' : 'bg-slate-200 text-slate-600',
                  ].join(' ')}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="text-center py-16 text-slate-400">
          <Bell size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="text-base font-semibold text-slate-700">No notifications in this filter.</p>
          <p className="text-xs text-slate-400 mt-1">
            You're all caught up with your latest event and club activities!
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-slate-100">
            {filteredNotifications.map((notif) => (
              <li
                key={notif.notificationId}
                onClick={() => {
                  if (!notif.isRead) markNotificationAsRead(notif.notificationId);
                }}
                className={[
                  'flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer',
                  !notif.isRead ? 'bg-brand-50/50 hover:bg-brand-50' : 'hover:bg-slate-50',
                ].join(' ')}
              >
                {/* Icon Circle */}
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                  {getIconForType(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {timeAgo(notif.createdAt)}
                    </span>

                    {notif.actionUrl && (
                      <Link
                        to={notif.actionUrl}
                        className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Details <ArrowRight size={11} />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Mark as read tick button */}
                {!notif.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationAsRead(notif.notificationId);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-brand-700 hover:bg-white text-xs shrink-0"
                    title="Mark as read"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
