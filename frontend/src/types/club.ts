export type ClubStatus = 'active' | 'inactive' | 'pending' | 'dissolved';
export type MemberRole =
  | 'member'
  | 'core_member'
  | 'officer'
  | 'coordinator'
  | 'vice_president'
  | 'co_president'
  | 'president'
  | 'faculty_advisor';
export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'inactive';

export interface Club {
  clubId: number;
  departmentId?: number;
  departmentName?: string;
  name: string;
  shortName?: string;
  tagline?: string;
  description: string;
  logoUrl?: string;
  foundedYear?: number;
  foundedDate?: string;
  status: ClubStatus;
  presidentId?: string;
  presidentName: string;
  presidentEmail?: string;
  advisorName?: string;
  advisorEmail?: string;
  facultyAdvisorId?: string;
  facultyAdvisorName?: string;
  facultyAdvisorEmail?: string;
  contactEmail: string;
  website?: string;
  maxMembers?: number;
  memberCount: number;
  eventCount: number;
  category: string;
  meetingSchedule?: string;
  roomLocation?: string;
  allocatedBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  fiscalYear?: number;
  createdAt?: string;
}

export interface ClubMembership {
  membershipId: number;
  clubId: number;
  clubName: string;
  clubLogoUrl?: string;
  clubCategory?: string;
  userId?: string;
  studentName?: string;
  studentId?: string;
  studentEmail?: string;
  rollNumber?: string;
  department?: string;
  role?: MemberRole;
  memberRole?: MemberRole;
  status?: MembershipStatus;
  membershipStatus?: MembershipStatus;
  joinedDate?: string;
  joinedAt?: string;
  isActive?: boolean;
  memberCount?: number;
  notes?: string;
}

export type ExpenseCategory =
  | 'venue'
  | 'equipment'
  | 'catering'
  | 'marketing'
  | 'transport'
  | 'prizes'
  | 'miscellaneous'
  | 'other';

export interface Expense {
  expenseId: number;
  clubId: number;
  clubName?: string;
  eventId?: number;
  eventTitle?: string;
  title: string;
  description?: string;
  amount: number;
  category: ExpenseCategory;
  date?: string;
  incurredDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  receiptUrl?: string;
  submittedBy: string;
  submittedByName?: string;
  notes?: string;
  createdAt?: string;
}

export type SponsorTier = 'title' | 'platinum' | 'gold' | 'silver' | 'bronze';

export interface Sponsor {
  sponsorId: number;
  name: string;
  organization?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string;
  amount: number;
  tier?: SponsorTier;
  eventId?: number;
  eventTitle?: string;
  clubId: number;
  clubName?: string;
  paymentStatus?: 'pledged' | 'received';
  status?: 'confirmed' | 'pledged' | 'received' | 'cancelled';
  logoUrl?: string;
  notes?: string;
  createdAt?: string;
}
