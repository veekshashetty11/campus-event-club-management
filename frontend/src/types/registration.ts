export type RegistrationStatus = 'registered' | 'confirmed' | 'cancelled' | 'attended' | 'no_show' | 'waitlisted' | 'promoted';
export type AttendanceMark = 'not_marked' | 'present' | 'late' | 'absent';

export interface EventRegistration {
  registrationId: number;
  id?: number;
  eventId: number;
  eventTitle: string;
  eventCategory: string;
  eventCategoryColor?: string;
  startTime: string;
  endTime: string;
  venueName?: string;
  clubName: string;
  registeredAt: string;
  registrationDate?: string;
  status: RegistrationStatus;
  cancelledAt?: string;
  cancellationReason?: string;
  checkedInAt?: string;
  ticketCode: string;
  attendanceStatus?: AttendanceMark;
  certificateIssued?: boolean;
  waitlistPosition?: number;
  dietaryPreferences?: string;
  specialNotes?: string;
  promotedAt?: string;

  // Student specific identifiers for coordinator attendance & registration lists
  studentName?: string;
  studentId?: string;
  studentEmail?: string;
  rollNumber?: string;
  department?: string;
}

export interface Certificate {
  certificateId: string;
  eventId: number;
  eventTitle: string;
  eventCategory: string;
  clubName: string;
  certificateType: 'participation' | 'achievement' | 'completion' | 'speaker' | 'volunteer';
  issuedAt: string;
  status: 'pending' | 'issued' | 'revoked';
  pdfUrl?: string;
  verificationHash?: string;
  pointsEarned: number;
  studentName?: string;
  studentId?: string;
  issueDateFormatted?: string;
}

export interface DashboardStats {
  eventsRegistered: number;
  eventsAttended: number;
  certificatesEarned: number;
  clubMemberships: number;
  totalPoints: number;
  upcomingEvents: number;
}
