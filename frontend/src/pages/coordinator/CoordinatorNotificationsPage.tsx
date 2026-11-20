import React, { useState } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  Bell,
  CheckCheck,
  Calendar,
  AlertCircle,
  FileCheck2,
  Users,
  CheckCircle2,
} from 'lucide-react';
import type { NotificationType } from '../../types/notification';

export default function CoordinatorNotificationsPage() {
  const { notifications } = useManagement();
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = localNotifications.filter((n) => {
    if (filterType === 'unread') return !n.isRead;
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const unreadCount = localNotifications.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markSingleRead = (id: string | number | undefined) => {
    if (!id) return;
    setLocalNotifications((prev) =>
      prev.map((n) => ((n.id === id || n.notificationId === id) ? { ...n, isRead: true } : n))
    );
  };

  const getIcon = (type: NotificationType | string) => {
    switch (type) {
      case 'event_approved':
        return <CheckCircle2 size={18} className="text-emerald-600" />;
      case 'event_rejected':
      case 'changes_requested':
        return <AlertCircle size={18} className="text-amber-600" />;
      case 'club_join_request':
        return <Users size={18} className="text-brand-600" />;
      default:
        return <Bell size={18} className="text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Notifications' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification Center</h1>
          <p className="text-sm text-slate-500">
            Real-time updates on approvals, club membership inquiries, and facility allocations.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllRead}>
            <CheckCheck size={16} className="mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {['all', 'unread', 'event_approved', 'changes_requested', 'club_join_request'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filterType === t
                ? 'bg-brand-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Notification Items */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-slate-400">
            <Bell size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium text-slate-600">No notifications in this view</p>
          </Card>
        ) : (
          filtered.map((n) => (
            <Card
              key={n.notificationId || n.id}
              onClick={() => markSingleRead(n.notificationId || n.id)}
              className={`p-4 transition-all cursor-pointer border ${
                !n.isRead
                  ? 'bg-brand-50/30 border-brand-200/80 shadow-xs'
                  : 'bg-white border-slate-200/70 opacity-90'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className={`text-sm font-semibold truncate ${!n.isRead ? 'text-brand-950 font-bold' : 'text-slate-800'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                </div>
                {!n.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600 shrink-0 mt-1.5" />
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
