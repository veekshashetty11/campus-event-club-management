import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type {
  CampusEvent,
  EventApproval,
  Venue,
  VenueBooking,
  Equipment,
  EquipmentBooking,
  EventStatus,
} from '../types/event';
import type { Club, ClubMembership, Expense, Sponsor, MemberRole } from '../types/club';
import type { EventRegistration, AttendanceMark } from '../types/registration';
import type { Notification, ActivityItem, AuditLog } from '../types/notification';
import type { User, UserRole } from '../types/auth';
import {
  MOCK_EVENTS,
  MOCK_EVENT_APPROVALS,
  MOCK_CLUBS,
  MOCK_MEMBERSHIPS,
  MOCK_VENUES,
  MOCK_VENUE_BOOKINGS,
  MOCK_EQUIPMENT,
  MOCK_EQUIPMENT_BOOKINGS,
  MOCK_EXPENSES,
  MOCK_SPONSORS,
  MOCK_USERS,
  MOCK_NOTIFICATIONS,
  MOCK_ACTIVITIES,
  MOCK_AUDIT_LOGS,
  MOCK_REGISTRATIONS,
} from '../mock-data';
import { useAuth } from './AuthContext';

interface ManagementContextType {
  events: CampusEvent[];
  approvals: EventApproval[];
  clubs: Club[];
  memberships: ClubMembership[];
  venues: Venue[];
  venueBookings: VenueBooking[];
  equipment: Equipment[];
  equipmentBookings: EquipmentBooking[];
  expenses: Expense[];
  sponsors: Sponsor[];
  users: User[];
  registrations: EventRegistration[];
  notifications: Notification[];
  activities: ActivityItem[];
  auditLogs: AuditLog[];

  // Coordinator Actions
  createEvent: (data: Partial<CampusEvent>, submitNow: boolean) => Promise<{ success: boolean; event: CampusEvent; message: string }>;
  updateEventDraft: (eventId: number, data: Partial<CampusEvent>, submitNow: boolean) => Promise<{ success: boolean; message: string }>;
  resubmitEvent: (eventId: number, data: Partial<CampusEvent>) => Promise<{ success: boolean; message: string }>;
  updateClubDetails: (clubId: number, data: Partial<Club>) => Promise<{ success: boolean; message: string }>;
  updateMembershipStatus: (membershipId: number, status: 'approved' | 'rejected') => Promise<{ success: boolean; message: string }>;
  updateMemberRole: (membershipId: number, role: MemberRole) => Promise<{ success: boolean; message: string }>;
  markAttendance: (registrationId: number, status: AttendanceMark) => Promise<{ success: boolean; message: string }>;
  issueCertificatesForEvent: (eventId: number) => Promise<{ success: boolean; message: string; count: number }>;
  addExpense: (data: Omit<Expense, 'expenseId' | 'createdAt'>) => Promise<{ success: boolean; message: string }>;
  deleteExpense: (expenseId: number) => Promise<{ success: boolean; message: string }>;
  addSponsor: (data: Omit<Sponsor, 'sponsorId' | 'createdAt'>) => Promise<{ success: boolean; message: string }>;
  deleteSponsor: (sponsorId: number) => Promise<{ success: boolean; message: string }>;

  // Advisor & Administrator Approval Actions
  decideEventApproval: (
    approvalId: number,
    decision: 'approved' | 'rejected' | 'changes_requested',
    comments: string,
    rejectionReason?: string,
    requestedChanges?: string
  ) => Promise<{ success: boolean; message: string }>;

  // Venue Manager Actions
  addVenue: (data: Omit<Venue, 'venueId'>) => Promise<{ success: boolean; message: string }>;
  updateVenue: (venueId: number, data: Partial<Venue>) => Promise<{ success: boolean; message: string }>;
  toggleVenueActive: (venueId: number) => Promise<{ success: boolean; message: string }>;
  decideVenueBooking: (bookingId: number, decision: 'approved' | 'rejected', reason?: string) => Promise<{ success: boolean; message: string }>;
  addEquipment: (data: Omit<Equipment, 'equipmentId'>) => Promise<{ success: boolean; message: string }>;
  updateEquipment: (equipmentId: number, data: Partial<Equipment>) => Promise<{ success: boolean; message: string }>;
  decideEquipmentBooking: (bookingId: number, decision: 'approved' | 'rejected') => Promise<{ success: boolean; message: string }>;

  // Administrator User Actions
  updateUserStatus: (userId: string, status: 'active' | 'inactive' | 'suspended') => Promise<{ success: boolean; message: string }>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<{ success: boolean; message: string }>;

  // Helpers
  getEvent: (eventId: number) => CampusEvent | undefined;
  getClub: (clubId: number) => Club | undefined;
  getVenue: (venueId: number) => Venue | undefined;
  getRegistrationsForEvent: (eventId: number) => EventRegistration[];
}

const ManagementContext = createContext<ManagementContextType | null>(null);

const STORAGE_PREFIX = 'campus_mgmt_state_v1_';

export function ManagementProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Helper to load persisted state or fallback to fixtures
  // Uses localStorage so data is shared across role switches in the same browser
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const [events, setEvents] = useState<CampusEvent[]>(() => loadState('events', MOCK_EVENTS));
  const [approvals, setApprovals] = useState<EventApproval[]>(() => loadState('approvals', MOCK_EVENT_APPROVALS));
  const [clubs, setClubs] = useState<Club[]>(() => loadState('clubs', MOCK_CLUBS));
  const [memberships, setMemberships] = useState<ClubMembership[]>(() => loadState('memberships', MOCK_MEMBERSHIPS));
  const [venues, setVenues] = useState<Venue[]>(() => loadState('venues', MOCK_VENUES));
  const [venueBookings, setVenueBookings] = useState<VenueBooking[]>(() => loadState('venue_bookings', MOCK_VENUE_BOOKINGS));
  const [equipment, setEquipment] = useState<Equipment[]>(() => loadState('equipment', MOCK_EQUIPMENT));
  const [equipmentBookings, setEquipmentBookings] = useState<EquipmentBooking[]>(() => loadState('equipment_bookings', MOCK_EQUIPMENT_BOOKINGS));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('expenses', MOCK_EXPENSES));
  const [sponsors, setSponsors] = useState<Sponsor[]>(() => loadState('sponsors', MOCK_SPONSORS));
  const [users, setUsers] = useState<User[]>(() => loadState('users', MOCK_USERS));
  const [registrations, setRegistrations] = useState<EventRegistration[]>(() => loadState('registrations', MOCK_REGISTRATIONS));
  const [notifications, setNotifications] = useState<Notification[]>(() => loadState('notifications', MOCK_NOTIFICATIONS));
  const [activities, setActivities] = useState<ActivityItem[]>(() => loadState('activities', MOCK_ACTIVITIES));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadState('audit_logs', MOCK_AUDIT_LOGS));

  // Sync to localStorage (shared across all roles in this browser)
  const saveState = (key: string, data: any) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    } catch {
      // storage quota or fallback
    }
  };

  const addAuditLog = useCallback(
    (action: string, entityType: AuditLog['entityType'], entityId: string | number, entityName: string, details: string) => {
      const newLog: AuditLog = {
        logId: `AUD-${Date.now().toString().slice(-4)}`,
        action,
        entityType,
        entityId: String(entityId),
        entityName,
        performedBy: user ? `${user.fullName} (${user.roleDisplayName})` : 'System User',
        userRole: user?.role || 'system',
        details,
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.100',
      };
      setAuditLogs((prev) => {
        const updated = [newLog, ...prev];
        saveState('audit_logs', updated);
        return updated;
      });
    },
    [user]
  );

  // ── 1. COORDINATOR: Event Creation & Resubmission ──────────────────────────
  const createEvent = useCallback(
    async (data: Partial<CampusEvent>, submitNow: boolean) => {
      await new Promise((r) => setTimeout(r, 600));

      const newEventId = Date.now();
      const club = clubs.find((c) => c.clubId === (data.clubId || 1)) || clubs[0];
      const selectedVenue = venues.find((v) => v.venueId === data.preferredVenueId);

      const status: EventStatus = submitNow ? 'pending_approval' : 'draft';

      let initialApprovals: EventApproval[] = [];
      if (submitNow) {
        const approvalRecord: EventApproval = {
          approvalId: Date.now() + 1,
          eventId: newEventId,
          eventTitle: data.title || 'Untitled Event',
          clubId: club.clubId,
          clubName: club.name,
          level: 1,
          stage: 'club_advisor',
          stageDisplayName: 'Club Advisor',
          status: 'pending',
          submittedAt: new Date().toISOString(),
        };
        initialApprovals = [approvalRecord];
        setApprovals((prev) => {
          const updated = [approvalRecord, ...prev];
          saveState('approvals', updated);
          return updated;
        });
      }

      const newEvent: CampusEvent = {
        eventId: newEventId,
        clubId: club.clubId,
        clubName: club.name,
        categoryId: data.categoryId || 1,
        category: data.category || 'Technical',
        categoryColor: data.categoryColor || '#25547b',
        title: data.title || 'New Proposed Event',
        shortDescription: data.shortDescription || data.description?.slice(0, 100),
        description: data.description || '',
        bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
        startTime: data.startTime || new Date(Date.now() + 86400000 * 14).toISOString(),
        endTime: data.endTime || new Date(Date.now() + 86400000 * 14 + 14400000).toISOString(),
        registrationDeadline: data.registrationDeadline || new Date(Date.now() + 86400000 * 10).toISOString(),
        venueId: selectedVenue?.venueId,
        venue: selectedVenue,
        preferredVenueId: selectedVenue?.venueId,
        venueRequirements: data.venueRequirements,
        isOnline: data.isOnline || false,
        onlineLink: data.onlineLink,
        maxCapacity: data.maxCapacity || 100,
        registeredCount: 0,
        waitlistCount: 0,
        waitlistEnabled: data.waitlistEnabled ?? true,
        isPublic: true,
        status,
        pointsAwarded: data.pointsAwarded || 30,
        tags: data.tags || ['campus', 'student-event'],
        organizerName: user?.fullName || 'Chris Martinez',
        organizerEmail: user?.email || 'coordinator@campus.edu',
        coordinatorName: user?.fullName || 'Chris Martinez',
        coordinatorEmail: user?.email || 'coordinator@campus.edu',
        coordinatorPhone: user?.phone || '+1-555-0104',
        budgetRequired: data.budgetRequired || 5000,
        budgetAllocated: data.budgetRequired || 5000,
        equipmentRequirements: data.equipmentRequirements,
        sponsorshipRequirements: data.sponsorshipRequirements,
        approvalStage: submitNow ? 'club_advisor' : undefined,
        approvalHistory: initialApprovals,
        submissionDate: submitNow ? new Date().toISOString() : undefined,
      };

      // If preferred venue chosen and submitting, auto-create a venue booking request
      if (selectedVenue && submitNow) {
        const newBooking: VenueBooking = {
          bookingId: Date.now() + 2,
          venueId: selectedVenue.venueId,
          venueName: selectedVenue.name,
          eventId: newEventId,
          eventTitle: newEvent.title,
          clubName: club.name,
          bookedBy: user?.userId || 'usr-coordinator-001',
          bookedByName: user?.fullName || 'Chris Martinez',
          date: newEvent.startTime.split('T')[0],
          bookingDate: newEvent.startTime.split('T')[0],
          startTime: newEvent.startTime.split('T')[1]?.slice(0, 5) || '10:00',
          endTime: newEvent.endTime.split('T')[1]?.slice(0, 5) || '14:00',
          expectedAttendance: newEvent.maxCapacity || 100,
          purpose: `Venue reservation for ${newEvent.title}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        setVenueBookings((prev) => {
          const updated = [newBooking, ...prev];
          saveState('venue_bookings', updated);
          return updated;
        });
      }

      setEvents((prev) => {
        const updated = [newEvent, ...prev];
        saveState('events', updated);
        return updated;
      });

      addAuditLog(
        submitNow ? 'EVENT_SUBMITTED' : 'EVENT_DRAFT_CREATED',
        'event',
        newEventId,
        newEvent.title,
        submitNow
          ? `Submitted proposal to Club Advisor for Level 1 review. Budget required: ₹${newEvent.budgetRequired}`
          : 'Created new event draft.'
      );

      return {
        success: true,
        event: newEvent,
        message: submitNow
          ? `Event "${newEvent.title}" submitted to Faculty Advisor for Level 1 review!`
          : `Event draft "${newEvent.title}" saved successfully.`,
      };
    },
    [clubs, venues, user, addAuditLog]
  );

  const updateEventDraft = useCallback(
    async (eventId: number, data: Partial<CampusEvent>, submitNow: boolean) => {
      await new Promise((r) => setTimeout(r, 500));
      let updatedEventTitle = '';
      const currentEv = events.find((ev) => ev.eventId === eventId);

      setEvents((prev) => {
        const updated = prev.map((ev) => {
          if (ev.eventId === eventId) {
            updatedEventTitle = data.title || ev.title;
            const status: EventStatus = submitNow ? 'pending_approval' : 'draft';
            return {
              ...ev,
              ...data,
              status,
              approvalStage: submitNow ? ('club_advisor' as const) : ev.approvalStage,
              submissionDate: submitNow ? new Date().toISOString() : ev.submissionDate,
            };
          }
          return ev;
        });
        saveState('events', updated);
        return updated;
      });

      if (submitNow) {
        const approvalRecord: EventApproval = {
          approvalId: Date.now(),
          eventId,
          eventTitle: updatedEventTitle,
          clubId: data.clubId || currentEv?.clubId || 1,
          clubName: data.clubName || currentEv?.clubName || 'CodeCraft Society',
          level: 1,
          stage: 'club_advisor',
          stageDisplayName: 'Club Advisor',
          status: 'pending',
          submittedAt: new Date().toISOString(),
        };
        setApprovals((prev) => {
          const updated = [approvalRecord, ...prev];
          saveState('approvals', updated);
          return updated;
        });
        addAuditLog('EVENT_SUBMITTED', 'event', eventId, updatedEventTitle, 'Draft promoted and submitted to Club Advisor.');
      }

      return {
        success: true,
        message: submitNow ? 'Event submitted to Club Advisor!' : 'Event draft updated.',
      };
    },
    [events, addAuditLog]
  );

  const resubmitEvent = useCallback(
    async (eventId: number, data: Partial<CampusEvent>) => {
      await new Promise((r) => setTimeout(r, 600));
      const targetEv = events.find((ev) => ev.eventId === eventId);

      setEvents((prev) => {
        const updated = prev.map((ev) => {
          if (ev.eventId === eventId) {
            return {
              ...ev,
              ...data,
              status: 'pending_approval' as const,
              approvalStage: 'club_advisor' as const, // restarts from Level 1 Advisor
              changesRequestedNotes: undefined,
              rejectionReason: undefined,
              submissionDate: new Date().toISOString(),
            };
          }
          return ev;
        });
        saveState('events', updated);
        return updated;
      });

      // Add a fresh Level 1 approval record
      const freshApproval: EventApproval = {
        approvalId: Date.now(),
        eventId,
        eventTitle: data.title || targetEv?.title || 'Resubmitted Event',
        clubId: targetEv?.clubId || data.clubId || 1,
        clubName: targetEv?.clubName || data.clubName || 'CodeCraft Society',
        level: 1,
        stage: 'club_advisor',
        stageDisplayName: 'Club Advisor',
        status: 'pending',
        comments: 'Resubmitted with requested modifications.',
        submittedAt: new Date().toISOString(),
      };

      setApprovals((prev) => {
        const updated = [freshApproval, ...prev];
        saveState('approvals', updated);
        return updated;
      });

      addAuditLog('EVENT_RESUBMITTED', 'event', eventId, data.title || 'Event', 'Event resubmitted following change request.');

      return { success: true, message: 'Event successfully resubmitted for Level 1 review!' };
    },
    [events, addAuditLog]
  );

  // ── 2. COORDINATOR: Club Details & Membership Management ────────────────────
  const updateClubDetails = useCallback(
    async (clubId: number, data: Partial<Club>) => {
      await new Promise((r) => setTimeout(r, 500));
      setClubs((prev) => {
        const updated = prev.map((c) => (c.clubId === clubId ? { ...c, ...data } : c));
        saveState('clubs', updated);
        return updated;
      });
      addAuditLog('CLUB_PROFILE_UPDATED', 'club', clubId, data.name || 'Club', 'Coordinator updated club profile info.');
      return { success: true, message: 'Club profile updated successfully.' };
    },
    [addAuditLog]
  );

  const updateMembershipStatus = useCallback(
    async (membershipId: number, status: 'approved' | 'rejected') => {
      await new Promise((r) => setTimeout(r, 400));
      let clubIdToUpdate: number | null = null;

      setMemberships((prev) => {
        const updated = prev.map((m) => {
          if (m.membershipId === membershipId) {
            clubIdToUpdate = m.clubId;
            return { ...m, membershipStatus: status, isActive: status === 'approved' };
          }
          return m;
        });
        saveState('memberships', updated);
        return updated;
      });

      if (status === 'approved' && clubIdToUpdate) {
        setClubs((prev) => {
          const updated = prev.map((c) => (c.clubId === clubIdToUpdate ? { ...c, memberCount: c.memberCount + 1 } : c));
          saveState('clubs', updated);
          return updated;
        });
      }

      addAuditLog(
        status === 'approved' ? 'MEMBER_REQUEST_APPROVED' : 'MEMBER_REQUEST_REJECTED',
        'member',
        membershipId,
        'Club Membership',
        `Coordinator ${status} membership request.`
      );

      return { success: true, message: `Membership request ${status}.` };
    },
    [addAuditLog]
  );

  const updateMemberRole = useCallback(
    async (membershipId: number, role: MemberRole) => {
      await new Promise((r) => setTimeout(r, 400));
      setMemberships((prev) => {
        const updated = prev.map((m) => (m.membershipId === membershipId ? { ...m, memberRole: role } : m));
        saveState('memberships', updated);
        return updated;
      });
      return { success: true, message: `Member role updated to ${role}.` };
    },
    []
  );

  // ── 3. COORDINATOR: Attendance Marking ──────────────────────────────────────
  const markAttendance = useCallback(
    async (registrationId: number, status: AttendanceMark) => {
      await new Promise((r) => setTimeout(r, 300));
      setRegistrations((prev) => {
        const updated = prev.map((r) => {
          if (r.registrationId === registrationId) {
            return {
              ...r,
              attendanceStatus: status,
              checkedInAt: status === 'present' || status === 'late' ? new Date().toISOString() : r.checkedInAt,
              certificateIssued: status === 'present' || status === 'late',
            };
          }
          return r;
        });
        saveState('registrations', updated);
        return updated;
      });
      return { success: true, message: 'Attendance marked.' };
    },
    []
  );

  // ── 3b. COORDINATOR: Issue Event Certificates ───────────────────────────────
  const issueCertificatesForEvent = useCallback(
    async (eventId: number) => {
      await new Promise((r) => setTimeout(r, 400));
      const targetEvent = events.find((e) => e.eventId === eventId);
      let count = 0;
      const newCertificates: any[] = [];
      const now = new Date();

      setRegistrations((prev) => {
        const updated = prev.map((r) => {
          if (r.eventId === eventId && (r.attendanceStatus === 'present' || r.attendanceStatus === 'late')) {
            count++;
            const certId = r.certificateId || `CERT-${eventId}-${r.registrationId}-${Date.now().toString().slice(-4)}`;
            const certHash = `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

            newCertificates.push({
              certificateId: certId,
              eventTitle: targetEvent?.title || r.eventTitle,
              clubName: targetEvent?.clubName || r.clubName,
              studentName: r.studentName || 'Student Attendee',
              rollNumber: r.rollNumber || 'CS2026-001',
              issueDate: now.toISOString(),
              issueDateFormatted: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' }),
              certificateType: 'participation',
              verificationHash: certHash,
              status: 'issued',
            });

            return {
              ...r,
              certificateIssued: true,
              certificateId: certId,
            };
          }
          return r;
        });
        saveState('registrations', updated);
        return updated;
      });

      // Synchronize to student certificates in localStorage so student sees new credentials
      try {
        const key = 'campus_event_student_state_certificates';
        const existingRaw = localStorage.getItem(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const merged = [
          ...newCertificates,
          ...existing.filter((c: any) => !newCertificates.some((nc) => nc.certificateId === c.certificateId)),
        ];
        localStorage.setItem(key, JSON.stringify(merged));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error('Failed to sync student certificates:', err);
      }

      return {
        success: true,
        message: count > 0
          ? `Successfully issued ${count} verifiable certificates for "${targetEvent?.title || 'Event'}".`
          : 'No eligible checked-in attendees found to generate certificates.',
        count,
      };
    },
    [events]
  );

  // ── 4. COORDINATOR: Expenses & Budget ───────────────────────────────────────
  const addExpense = useCallback(
    async (data: Omit<Expense, 'expenseId' | 'createdAt'>) => {
      await new Promise((r) => setTimeout(r, 500));

      const club = clubs.find((c) => c.clubId === data.clubId);
      if (!club) throw new Error('Club not found.');

      // Mock validation: cannot exceed remaining budget
      if (data.amount > club.remainingBudget) {
        throw new Error(
          `Expense of ₹${data.amount.toLocaleString()} exceeds club remaining budget of ₹${club.remainingBudget.toLocaleString()}. Request an allocation increase from Student Affairs.`
        );
      }

      const newExpenseId = Date.now();
      const newExpense: Expense = {
        ...data,
        expenseId: newExpenseId,
        createdAt: new Date().toISOString(),
      };

      setExpenses((prev) => {
        const updated = [newExpense, ...prev];
        saveState('expenses', updated);
        return updated;
      });

      // Deduct from club budget
      setClubs((prev) => {
        const updated = prev.map((c) => {
          if (c.clubId === data.clubId) {
            return {
              ...c,
              totalExpenses: c.totalExpenses + data.amount,
              remainingBudget: c.remainingBudget - data.amount,
            };
          }
          return c;
        });
        saveState('clubs', updated);
        return updated;
      });

      addAuditLog('EXPENSE_CREATED', 'expense', newExpenseId, data.title, `Logged ₹${data.amount} under ${data.category}.`);

      return { success: true, message: 'Expense recorded successfully.' };
    },
    [clubs, addAuditLog]
  );

  const deleteExpense = useCallback(
    async (expenseId: number) => {
      await new Promise((r) => setTimeout(r, 400));
      const exp = expenses.find((e) => e.expenseId === expenseId);
      if (!exp) return { success: false, message: 'Expense not found.' };

      setExpenses((prev) => {
        const updated = prev.filter((e) => e.expenseId !== expenseId);
        saveState('expenses', updated);
        return updated;
      });

      // Refund amount to club
      setClubs((prev) => {
        const updated = prev.map((c) => {
          if (c.clubId === exp.clubId) {
            return {
              ...c,
              totalExpenses: Math.max(0, c.totalExpenses - exp.amount),
              remainingBudget: c.remainingBudget + exp.amount,
            };
          }
          return c;
        });
        saveState('clubs', updated);
        return updated;
      });

      addAuditLog('EXPENSE_DELETED', 'expense', expenseId, exp.title, `Reimbursed ₹${exp.amount} back to club balance.`);

      return { success: true, message: 'Expense deleted and budget balance updated.' };
    },
    [expenses, addAuditLog]
  );

  // ── 5. COORDINATOR: Sponsors ───────────────────────────────────────────────
  const addSponsor = useCallback(
    async (data: Omit<Sponsor, 'sponsorId' | 'createdAt'>) => {
      await new Promise((r) => setTimeout(r, 500));
      const newSponsor: Sponsor = {
        ...data,
        sponsorId: Date.now(),
        createdAt: new Date().toISOString(),
      };
      setSponsors((prev) => {
        const updated = [newSponsor, ...prev];
        saveState('sponsors', updated);
        return updated;
      });
      addAuditLog('SPONSOR_ADDED', 'event', data.eventId || 0, data.name, `Added sponsor with ₹${data.amount} funding.`);
      return { success: true, message: 'Sponsor added successfully.' };
    },
    [addAuditLog]
  );

  const deleteSponsor = useCallback(
    async (sponsorId: number) => {
      await new Promise((r) => setTimeout(r, 400));
      setSponsors((prev) => {
        const updated = prev.filter((s) => s.sponsorId !== sponsorId);
        saveState('sponsors', updated);
        return updated;
      });
      return { success: true, message: 'Sponsor removed.' };
    },
    []
  );

  // ── 6. MULTI-LEVEL APPROVAL WORKFLOW ENGINE ────────────────────────────────
  // Club Coordinator submits -> Level 1: Advisor -> Level 2: Student Affairs -> Level 3: Administrator (Final Approval)
  const decideEventApproval = useCallback(
    async (
      approvalId: number,
      decision: 'approved' | 'rejected' | 'changes_requested',
      comments: string,
      rejectionReason?: string,
      requestedChanges?: string
    ) => {
      await new Promise((r) => setTimeout(r, 600));

      const approval = approvals.find((a) => a.approvalId === approvalId);
      if (!approval) throw new Error('Approval record not found.');

      const targetEventId = approval.eventId;
      const targetEvent = events.find((e) => e.eventId === targetEventId);

      // Security & RBAC Checks
      if (user?.role === 'event_coordinator' || user?.role === 'student') {
        throw new Error('Unauthorized: Coordinators and students cannot approve events.');
      }
      if (
        targetEvent?.coordinatorEmail &&
        targetEvent.coordinatorEmail === user?.email
      ) {
        throw new Error('Self-approval forbidden: Event creator cannot approve their own event.');
      }

      // 1. Update current approval record
      const updatedApprovals = approvals.map((a) => {
        if (a.approvalId === approvalId) {
          return {
            ...a,
            status: decision,
            approverName: user?.fullName || 'Approver',
            approverRole: user?.roleDisplayName || 'Staff Officer',
            comments: comments || (decision === 'approved' ? 'Approved.' : undefined),
            rejectionReason: decision === 'rejected' ? rejectionReason || comments : undefined,
            requestedChanges: decision === 'changes_requested' ? requestedChanges || comments : undefined,
            decidedAt: new Date().toISOString(),
          };
        }
        return a;
      });

      let nextLevelRecord: EventApproval | null = null;
      let newEventStatus: EventStatus = 'pending_approval';
      let newEventStage: CampusEvent['approvalStage'] = approval.stage;

      if (decision === 'rejected') {
        newEventStatus = 'rejected';
        newEventStage = 'rejected';
      } else if (decision === 'changes_requested') {
        newEventStatus = 'changes_requested';
        newEventStage = 'changes_requested';
      } else {
        // DECISION === 'approved'
        if (approval.level === 1) {
          // Level 1 (Advisor) Approved -> Advance to Level 2 (Student Affairs)
          newEventStage = 'student_affairs';
          newEventStatus = 'pending_approval';
          nextLevelRecord = {
            approvalId: Date.now() + 10,
            eventId: targetEventId,
            eventTitle: approval.eventTitle,
            clubId: approval.clubId || targetEvent?.clubId,
            clubName: approval.clubName,
            level: 2,
            stage: 'student_affairs',
            stageDisplayName: 'Student Affairs',
            status: 'pending',
            submittedAt: new Date().toISOString(),
          };
        } else if (approval.level === 2) {
          // Level 2 (Student Affairs) Approved -> Advance to Level 3 (Administrator)
          newEventStage = 'administrator';
          newEventStatus = 'pending_approval';
          nextLevelRecord = {
            approvalId: Date.now() + 11,
            eventId: targetEventId,
            eventTitle: approval.eventTitle,
            clubId: approval.clubId || targetEvent?.clubId,
            clubName: approval.clubName,
            level: 3,
            stage: 'administrator',
            stageDisplayName: 'Administrator (Final)',
            status: 'pending',
            submittedAt: new Date().toISOString(),
          };
        } else if (approval.level === 3) {
          // Level 3 (Administrator) Approved -> Event is finally approved!
          // Next step: Awaiting Venue Manager allocation / confirmation before public publishing
          newEventStage = 'final_approved';
          newEventStatus = 'approved';

          // Ensure a pending venue booking request is queued for Venue Manager
          setVenueBookings((prev) => {
            const existing = prev.find((b) => b.eventId === targetEventId);
            if (existing) {
              const updated = prev.map((b) =>
                b.eventId === targetEventId ? { ...b, status: 'pending' as const } : b
              );
              saveState('venue_bookings', updated);
              return updated;
            } else {
              const vId = targetEvent?.venueId || targetEvent?.preferredVenueId;
              const vObj = venues.find((v) => v.venueId === vId) || venues[0];
              const newBooking: VenueBooking = {
                bookingId: Date.now() + 2,
                venueId: vObj.venueId,
                venueName: vObj.name,
                eventId: targetEventId,
                eventTitle: targetEvent?.title || approval.eventTitle,
                eventName: targetEvent?.title || approval.eventTitle,
                clubName: targetEvent?.clubName || approval.clubName,
                bookedBy: user?.userId || 'usr-coordinator-001',
                bookedByName: targetEvent?.coordinatorName || 'Chris Martinez',
                date: targetEvent?.startTime ? targetEvent.startTime.split('T')[0] : new Date().toISOString().split('T')[0],
                bookingDate: targetEvent?.startTime ? targetEvent.startTime.split('T')[0] : new Date().toISOString().split('T')[0],
                startTime: targetEvent?.startTime ? (targetEvent.startTime.split('T')[1]?.slice(0, 5) || '10:00') : '10:00',
                endTime: targetEvent?.endTime ? (targetEvent.endTime.split('T')[1]?.slice(0, 5) || '14:00') : '14:00',
                expectedAttendance: targetEvent?.maxCapacity || 100,
                purpose: `Venue reservation for ${targetEvent?.title || approval.eventTitle}`,
                status: 'pending',
                createdAt: new Date().toISOString(),
              };
              const updated = [newBooking, ...prev];
              saveState('venue_bookings', updated);
              return updated;
            }
          });
        }
      }

      const finalApprovalsList = nextLevelRecord ? [nextLevelRecord, ...updatedApprovals] : updatedApprovals;
      setApprovals(finalApprovalsList);
      saveState('approvals', finalApprovalsList);

      // 2. Update CampusEvent status & stage
      setEvents((prev) => {
        const updated = prev.map((ev) => {
          if (ev.eventId === targetEventId) {
            return {
              ...ev,
              status: newEventStatus,
              approvalStage: newEventStage,
              rejectionReason: decision === 'rejected' ? rejectionReason || comments : ev.rejectionReason,
              changesRequestedNotes: decision === 'changes_requested' ? requestedChanges || comments : undefined,
            };
          }
          return ev;
        });
        saveState('events', updated);
        return updated;
      });

      // 3. Notifications & Audit Logs
      const stageName = approval.stageDisplayName;
      addAuditLog(
        decision === 'approved' ? 'APPROVAL_DECIDED_APPROVED' : decision === 'rejected' ? 'APPROVAL_DECIDED_REJECTED' : 'APPROVAL_CHANGES_REQUESTED',
        'approval',
        approvalId,
        approval.eventTitle,
        `${stageName} decided: ${decision.toUpperCase()}. Comments: ${comments}`
      );

      const notifMessage =
        decision === 'approved'
          ? approval.level === 3
            ? `Final Approval Granted! "${approval.eventTitle}" is now published to the public campus directory.`
            : `Level ${approval.level} (${stageName}) approved "${approval.eventTitle}". Transferred to next review stage.`
          : decision === 'changes_requested'
          ? `Changes requested by ${stageName} for "${approval.eventTitle}": ${requestedChanges || comments}`
          : `Proposal for "${approval.eventTitle}" rejected by ${stageName}. Reason: ${rejectionReason || comments}`;

      const notif: Notification = {
        notificationId: `notif-appr-${Date.now()}`,
        type: decision === 'approved' ? 'event_approved' : decision === 'changes_requested' ? 'event_changes_requested' : 'event_rejected',
        title: `Approval Update: ${decision.replace('_', ' ').toUpperCase()}`,
        message: notifMessage,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedEntityId: targetEventId,
        relatedEntityType: 'event',
        actionUrl: '/coordinator/events',
        targetRole: 'event_coordinator',
      };
      setNotifications((prev) => [notif, ...prev]);

      return {
        success: true,
        message: `Decision recorded: ${decision.replace('_', ' ').toUpperCase()}.`,
      };
    },
    [approvals, events, user, addAuditLog]
  );

  // ── 7. VENUE MANAGER: Venues & Conflict-Free Booking Management ────────────
  const addVenue = useCallback(
    async (data: Omit<Venue, 'venueId'>) => {
      await new Promise((r) => setTimeout(r, 500));
      const newVenue: Venue = {
        ...data,
        venueId: Date.now(),
      };
      setVenues((prev) => {
        const updated = [...prev, newVenue];
        saveState('venues', updated);
        return updated;
      });
      addAuditLog('VENUE_CREATED', 'booking', newVenue.venueId, newVenue.name, `Added venue with capacity ${newVenue.capacity}.`);
      return { success: true, message: 'Venue created successfully.' };
    },
    [addAuditLog]
  );

  const updateVenue = useCallback(
    async (venueId: number, data: Partial<Venue>) => {
      await new Promise((r) => setTimeout(r, 400));
      setVenues((prev) => {
        const updated = prev.map((v) => (v.venueId === venueId ? { ...v, ...data } : v));
        saveState('venues', updated);
        return updated;
      });
      return { success: true, message: 'Venue details updated.' };
    },
    []
  );

  const toggleVenueActive = useCallback(
    async (venueId: number) => {
      await new Promise((r) => setTimeout(r, 300));
      setVenues((prev) => {
        const updated = prev.map((v) => (v.venueId === venueId ? { ...v, isActive: !v.isActive } : v));
        saveState('venues', updated);
        return updated;
      });
      return { success: true, message: 'Venue active status toggled.' };
    },
    []
  );

  const decideVenueBooking = useCallback(
    async (bookingId: number, decision: 'approved' | 'rejected', reason?: string) => {
      await new Promise((r) => setTimeout(r, 500));

      const booking = venueBookings.find((b) => b.bookingId === bookingId);
      if (!booking) throw new Error('Booking not found.');

      if (decision === 'approved') {
        const venue = venues.find((v) => v.venueId === booking.venueId);

        // 1. Capacity Check
        if (venue && booking.expectedAttendance > venue.capacity) {
          throw new Error(
            `Expected attendance (${booking.expectedAttendance}) exceeds maximum venue capacity of ${venue.capacity} seats for ${venue.name}.`
          );
        }

        // 2. Conflict Overlap Detection Validation
        // Checks if another approved booking exists for the same venue on the same date with overlapping times
        const hasOverlap = venueBookings.some((other) => {
          if (other.bookingId === bookingId) return false;
          if (other.venueId !== booking.venueId) return false;
          if (other.status !== 'approved') return false;
          if (other.date !== booking.date) return false;

          // Time range overlap check: (StartA < EndB) && (EndA > StartB)
          return booking.startTime < other.endTime && booking.endTime > other.startTime;
        });

        if (hasOverlap) {
          throw new Error(
            `Scheduling Conflict Detected! Venue "${booking.venueName}" already has an approved booking during ${booking.startTime} - ${booking.endTime} on ${booking.date}. Simultaneous bookings for the same facility are prevented.`
          );
        }
      }

      setVenueBookings((prev) => {
        const updated = prev.map((b) => {
          if (b.bookingId === bookingId) {
            return {
              ...b,
              status: decision,
              rejectionReason: decision === 'rejected' ? reason || 'Scheduling conflict or facility limitation' : undefined,
              approvedBy: decision === 'approved' ? user?.fullName || 'Morgan Vance' : undefined,
              approvedAt: decision === 'approved' ? new Date().toISOString() : undefined,
            };
          }
          return b;
        });
        saveState('venue_bookings', updated);
        return updated;
      });

      // When venue booking is approved, update the linked event: assign venue and publish!
      if (decision === 'approved' && booking.eventId) {
        const targetVenue = venues.find((v) => v.venueId === booking.venueId);
        setEvents((prev) => {
          const updated = prev.map((ev) => {
            if (ev.eventId === booking.eventId) {
              return {
                ...ev,
                venueId: booking.venueId,
                venue: targetVenue,
                preferredVenueId: booking.venueId,
                status: 'published' as const, // Venue confirmed by Venue Manager -> event is published!
              };
            }
            return ev;
          });
          saveState('events', updated);
          try {
            localStorage.setItem('campus_event_student_state_events', JSON.stringify(updated));
          } catch {
            // fallback
          }
          return updated;
        });
      }

      addAuditLog(
        decision === 'approved' ? 'VENUE_BOOKING_APPROVED' : 'VENUE_BOOKING_REJECTED',
        'booking',
        bookingId,
        booking.venueName,
        `Venue Manager decided ${decision.toUpperCase()} for "${booking.eventTitle || booking.eventName}" on ${booking.date || booking.bookingDate}.`
      );

      return {
        success: true,
        message: decision === 'approved'
          ? `Venue booking approved! Event "${booking.eventTitle || booking.eventName}" is now published and open for student registration.`
          : `Venue booking request rejected.`,
      };
    },
    [venueBookings, venues, user, addAuditLog]
  );

  // ── 8. VENUE MANAGER: Equipment ────────────────────────────────────────────
  const addEquipment = useCallback(
    async (data: Omit<Equipment, 'equipmentId'>) => {
      await new Promise((r) => setTimeout(r, 400));
      const newEq: Equipment = {
        ...data,
        equipmentId: Date.now(),
      };
      setEquipment((prev) => {
        const updated = [...prev, newEq];
        saveState('equipment', updated);
        return updated;
      });
      return { success: true, message: 'Equipment added.' };
    },
    []
  );

  const updateEquipment = useCallback(
    async (equipmentId: number, data: Partial<Equipment>) => {
      await new Promise((r) => setTimeout(r, 400));
      setEquipment((prev) => {
        const updated = prev.map((eq) => (eq.equipmentId === equipmentId ? { ...eq, ...data } : eq));
        saveState('equipment', updated);
        return updated;
      });
      return { success: true, message: 'Equipment inventory updated.' };
    },
    []
  );

  const decideEquipmentBooking = useCallback(
    async (bookingId: number, decision: 'approved' | 'rejected') => {
      await new Promise((r) => setTimeout(r, 500));
      const booking = equipmentBookings.find((b) => b.bookingId === bookingId);
      if (!booking) throw new Error('Booking not found.');

      if (decision === 'approved') {
        const qty = booking.quantityRequested || booking.quantity || 0;
        const eq = equipment.find((e) => e.equipmentId === booking.equipmentId);
        if (eq && qty > eq.quantityAvailable) {
          throw new Error(
            `Insufficient inventory! Requested ${qty} units, but only ${eq.quantityAvailable} units are currently available.`
          );
        }
        // Deduct available, increase booked
        setEquipment((prev) => {
          const updated = prev.map((e) => {
            if (e.equipmentId === booking.equipmentId) {
              return {
                ...e,
                quantityAvailable: e.quantityAvailable - qty,
                quantityBooked: (e.quantityBooked || 0) + qty,
              };
            }
            return e;
          });
          saveState('equipment', updated);
          return updated;
        });
      }

      setEquipmentBookings((prev) => {
        const updated = prev.map((b) => (b.bookingId === bookingId ? { ...b, status: decision } : b));
        saveState('equipment_bookings', updated);
        return updated;
      });

      return { success: true, message: `Equipment booking request ${decision}.` };
    },
    [equipmentBookings, equipment]
  );

  // ── 9. ADMINISTRATOR: User Management ──────────────────────────────────────
  const updateUserStatus = useCallback(
    async (userId: string, status: 'active' | 'inactive' | 'suspended') => {
      await new Promise((r) => setTimeout(r, 400));
      if (user?.userId === userId && status !== 'active') {
        throw new Error('Self-preservation guard: You cannot suspend or deactivate your own administrative account.');
      }
      setUsers((prev) => {
        const updated = prev.map((u) => (u.userId === userId ? { ...u, status } : u));
        saveState('users', updated);
        return updated;
      });
      addAuditLog('USER_STATUS_CHANGED', 'user', userId, 'User Account', `Account status set to ${status}.`);
      return { success: true, message: `Account status updated to ${status}.` };
    },
    [user, addAuditLog]
  );

  const updateUserRole = useCallback(
    async (userId: string, newRole: UserRole) => {
      await new Promise((r) => setTimeout(r, 400));
      if (user?.userId === userId && newRole !== 'administrator') {
        throw new Error('Permission denied: You cannot revoke your own administrator privileges.');
      }
      const roleDisplayNames: Record<UserRole, string> = {
        student: 'Student',
        event_coordinator: 'Event Coordinator',
        club_president: 'Club President',
        club_advisor: 'Faculty Club Advisor',
        student_affairs: 'Student Affairs Officer',
        administrator: 'System Administrator',
        venue_manager: 'Venue & Facilities Manager',
      };
      setUsers((prev) => {
        const updated = prev.map((u) =>
          u.userId === userId
            ? { ...u, role: newRole, roleDisplayName: roleDisplayNames[newRole] || newRole }
            : u
        );
        saveState('users', updated);
        return updated;
      });
      addAuditLog('USER_ROLE_CHANGED', 'user', userId, 'User Account', `Assigned new role: ${newRole}.`);
      return { success: true, message: `Role changed to ${roleDisplayNames[newRole]}.` };
    },
    [user, addAuditLog]
  );

  // Helpers
  const getEvent = useCallback((id: number) => events.find((e) => e.eventId === id), [events]);
  const getClub = useCallback((id: number) => clubs.find((c) => c.clubId === id), [clubs]);
  const getVenue = useCallback((id: number) => venues.find((v) => v.venueId === id), [venues]);
  const getRegistrationsForEvent = useCallback(
    (eventId: number) => registrations.filter((r) => r.eventId === eventId),
    [registrations]
  );

  const value = useMemo(
    () => ({
      events,
      approvals,
      clubs,
      memberships,
      venues,
      venueBookings,
      equipment,
      equipmentBookings,
      expenses,
      sponsors,
      users,
      registrations,
      notifications,
      activities,
      auditLogs,
      createEvent,
      updateEventDraft,
      resubmitEvent,
      updateClubDetails,
      updateMembershipStatus,
      updateMemberRole,
      markAttendance,
      issueCertificatesForEvent,
      addExpense,
      deleteExpense,
      addSponsor,
      deleteSponsor,
      decideEventApproval,
      addVenue,
      updateVenue,
      toggleVenueActive,
      decideVenueBooking,
      addEquipment,
      updateEquipment,
      decideEquipmentBooking,
      updateUserStatus,
      updateUserRole,
      getEvent,
      getClub,
      getVenue,
      getRegistrationsForEvent,
    }),
    [
      events,
      approvals,
      clubs,
      memberships,
      venues,
      venueBookings,
      equipment,
      equipmentBookings,
      expenses,
      sponsors,
      users,
      registrations,
      notifications,
      activities,
      auditLogs,
      createEvent,
      updateEventDraft,
      resubmitEvent,
      updateClubDetails,
      updateMembershipStatus,
      updateMemberRole,
      markAttendance,
      issueCertificatesForEvent,
      addExpense,
      deleteExpense,
      addSponsor,
      deleteSponsor,
      decideEventApproval,
      addVenue,
      updateVenue,
      toggleVenueActive,
      decideVenueBooking,
      addEquipment,
      updateEquipment,
      decideEquipmentBooking,
      updateUserStatus,
      updateUserRole,
      getEvent,
      getClub,
      getVenue,
      getRegistrationsForEvent,
    ]
  );

  return <ManagementContext.Provider value={value}>{children}</ManagementContext.Provider>;
}

export function useManagement() {
  const context = useContext(ManagementContext);
  if (!context) {
    throw new Error('useManagement must be used within a ManagementProvider');
  }
  return context;
}
