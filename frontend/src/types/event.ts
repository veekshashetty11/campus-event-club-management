export type EventCategory =
  | 'Technical'
  | 'Cultural'
  | 'Sports'
  | 'Workshop'
  | 'Career'
  | 'Seminar'
  | 'Social'
  | 'Hackathon'
  | 'Orientation';

export type EventStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'published'
  | 'ongoing'
  | 'completed'
  | 'cancelled';

export type ApprovalStage =
  | 'club_advisor'
  | 'student_affairs'
  | 'administrator'
  | 'final_approved'
  | 'rejected'
  | 'changes_requested';

export interface EventApproval {
  approvalId: number;
  eventId: number;
  eventTitle: string;
  clubId?: number;
  clubName: string;
  level: 1 | 2 | 3; // 1 = Club Advisor, 2 = Student Affairs, 3 = Administrator
  stage: 'club_advisor' | 'student_affairs' | 'administrator';
  stageDisplayName: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  approverName?: string;
  approverRole?: string;
  reviewerRole?: string;
  comments?: string;
  rejectionReason?: string;
  requestedChanges?: string;
  submittedAt: string;
  reviewedAt?: string;
  decidedAt?: string;
}

export interface Venue {
  venueId: number;
  name: string;
  building: string;
  floor?: string | number;
  roomNumber?: string;
  capacity: number;
  hasAvEquipment?: boolean;
  hasWifi?: boolean;
  isAccessible?: boolean;
  amenities: string[];
  photoUrl?: string;
  isActive?: boolean;
  status?: 'active' | 'maintenance' | 'inactive';
  hourlyRate?: number;
}

export interface VenueBooking {
  bookingId: number;
  venueId: number;
  venueName: string;
  eventId?: number;
  eventName?: string;
  eventTitle?: string;
  clubId?: number;
  clubName: string;
  bookedBy?: string;
  bookedByName?: string;
  date?: string; // YYYY-MM-DD
  bookingDate?: string;
  startTime: string; // HH:mm or ISO
  endTime: string;
  expectedAttendance: number;
  purpose?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export interface Equipment {
  equipmentId: number;
  venueId?: number;
  venueName?: string;
  name: string;
  category: string;
  quantityTotal: number;
  quantityAvailable: number;
  quantityBooked?: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'retired';
  status?: 'available' | 'maintenance' | 'retired';
  location?: string;
  notes?: string;
  serialNumber?: string;
}

export interface EquipmentBooking {
  bookingId: number;
  equipmentId: number;
  equipmentName: string;
  eventId?: number;
  eventName?: string;
  eventTitle?: string;
  clubId?: number;
  clubName: string;
  quantity?: number;
  quantityRequested?: number;
  date?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  bookedBy?: string;
  bookedByName?: string;
  notes?: string;
  createdAt?: string;
}

export interface CampusEvent {
  eventId: number;
  clubId: number;
  clubName: string;
  clubLogoUrl?: string;
  categoryId?: number;
  category: EventCategory | string;
  categoryColor?: string;
  title: string;
  description: string;
  shortDescription?: string;
  bannerUrl: string;
  startDate?: string;
  eventDate?: string;
  endDate?: string;
  startTime: string; // ISO 8601 or formatted time
  endTime: string;
  registrationDeadline: string;
  registrationStartDate?: string;
  venueId?: number;
  venueName?: string;
  venue?: Venue;
  preferredVenueId?: number;
  venueRequirements?: string;
  isOnline?: boolean;
  onlineLink?: string;
  capacity?: number;
  maxCapacity: number;
  registeredCount: number;
  waitlistCount?: number;
  waitlistCapacity?: number;
  waitlistEnabled?: boolean;
  isWaitlistEnabled?: boolean;
  isPublic?: boolean;
  status: EventStatus;
  pointsAwarded?: number;
  tags?: string[];
  organizerName?: string;
  organizerEmail?: string;
  coordinatorName?: string;
  coordinatorEmail?: string;
  coordinatorPhone?: string;
  isRegistered?: boolean;
  registrationStatus?: 'registered' | 'waitlisted' | 'cancelled' | 'attended';
  objectives?: string[];
  eligibility?: string;
  rules?: string | string[];
  equipmentNeeded?: string;
  equipmentRequirements?: string[];
  sponsorshipRequirements?: string;
  budget?: number;
  budgetAllocated?: number;
  budgetRequired?: number;
  approvalStage?: ApprovalStage;
  approvalHistory?: EventApproval[];
  submissionDate?: string;
  rejectionReason?: string;
  changesRequestedNotes?: string;
  waitlistPosition?: number;
}
