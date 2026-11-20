export type NotificationType =
  | 'event_registration'
  | 'registration_confirmed'
  | 'attendance_recorded'
  | 'certificate_issued'
  | 'club_membership_approved'
  | 'club_membership_requested'
  | 'event_reminder'
  | 'event_cancelled'
  | 'waitlist_promoted'
  | 'approval_required'
  | 'event_submitted'
  | 'event_approved'
  | 'event_rejected'
  | 'event_changes_requested'
  | 'venue_booking_requested'
  | 'venue_booking_approved'
  | 'venue_booking_rejected'
  | 'equipment_booking_approved'
  | 'equipment_booking_rejected'
  | 'expense_logged'
  | 'general';

export interface Notification {
  notificationId: string;
  id?: number | string;
  type: NotificationType | string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityId?: string | number;
  relatedEntityType?: 'event' | 'club' | 'registration' | 'certificate' | 'booking' | 'expense' | 'user';
  actionUrl?: string;
  targetRole?: string; // target role filter e.g. 'club_advisor', 'administrator', 'venue_manager', 'event_coordinator', 'student'
}

export interface ActivityItem {
  activityId: string;
  id?: number | string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
  iconColor?: string;
  roleScope?: string;
}

export interface AuditLog {
  logId: string;
  id?: number | string;
  action: string;
  entityType?: 'event' | 'approval' | 'booking' | 'expense' | 'user' | 'club' | 'member' | 'equipment';
  entityId: string | number;
  entityName?: string;
  performedBy: string;
  userRole?: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}
