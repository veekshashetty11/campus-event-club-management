import React, { useState } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Bell, CheckCheck, MapPin } from 'lucide-react';

export default function VenueNotificationsPage() {
  const { notifications } = useManagement();
  const [localNotifications, setLocalNotifications] = useState(notifications);

  const markAllRead = () => {
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Venue Manager', path: '/venue-manager/dashboard' },
          { label: 'Notifications' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facility Alerts & Notifications</h1>
          <p className="text-sm text-slate-500">Updates regarding room reservations and logistics requests.</p>
        </div>
        <Button variant="secondary" onClick={markAllRead}>
          <CheckCheck size={16} className="mr-2" />
          Mark all as read
        </Button>
      </div>

      <div className="space-y-3">
        {localNotifications.map((n) => (
          <Card key={n.notificationId || n.id} className="p-4 border border-slate-200/80">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                <MapPin size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                  <span className="text-[11px] text-slate-400">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{n.message}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
