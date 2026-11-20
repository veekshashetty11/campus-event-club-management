import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { CampusEvent } from '../types/event';
import type { Club, ClubMembership } from '../types/club';
import type { EventRegistration, Certificate, DashboardStats } from '../types/registration';
import type { Notification, ActivityItem } from '../types/notification';
import type { User } from '../types/auth';
import {
  MOCK_EVENTS,
  MOCK_REGISTRATIONS,
  MOCK_CLUBS,
  MOCK_MEMBERSHIPS,
  MOCK_CERTIFICATES,
  MOCK_NOTIFICATIONS,
  MOCK_ACTIVITIES,
} from '../mock-data';
import { useAuth } from './AuthContext';

interface RegisterParams {
  dietaryPreferences?: string;
  specialNotes?: string;
}

interface StudentContextType {
  events: CampusEvent[];
  registrations: EventRegistration[];
  clubs: Club[];
  memberships: ClubMembership[];
  certificates: Certificate[];
  notifications: Notification[];
  activities: ActivityItem[];
  stats: DashboardStats;
  unreadNotificationsCount: number;

  // Actions
  registerForEvent: (eventId: number, params?: RegisterParams) => Promise<{ success: boolean; message: string; ticketCode?: string }>;
  cancelRegistration: (registrationId: number, reason?: string) => Promise<{ success: boolean; message: string; promotedStudent?: boolean }>;
  joinWaitlist: (eventId: number) => Promise<{ success: boolean; message: string; position?: number }>;
  cancelWaitlist: (registrationId: number) => Promise<{ success: boolean; message: string }>;
  simulateWaitlistPromotion: (eventId: number) => Promise<{ success: boolean; message: string; promotedName?: string }>;
  requestClubMembership: (clubId: number, notes?: string) => Promise<{ success: boolean; message: string }>;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  updateStudentProfile: (data: Partial<User>) => Promise<{ success: boolean; message: string }>;
  getEvent: (eventId: number) => CampusEvent | undefined;
  getClub: (clubId: number) => Club | undefined;
  getRegistrationForEvent: (eventId: number) => EventRegistration | undefined;
}

const StudentContext = createContext<StudentContextType | null>(null);

const STORAGE_KEY_PREFIX = 'campus_event_student_state_';

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // State initialized with centralized mock fixtures
  const [events, setEvents] = useState<CampusEvent[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}events`);
      return saved ? JSON.parse(saved) : MOCK_EVENTS;
    } catch {
      return MOCK_EVENTS;
    }
  });

  const [registrations, setRegistrations] = useState<EventRegistration[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}registrations`);
      return saved ? JSON.parse(saved) : MOCK_REGISTRATIONS;
    } catch {
      return MOCK_REGISTRATIONS;
    }
  });

  const [clubs] = useState<Club[]>(MOCK_CLUBS);

  const [memberships, setMemberships] = useState<ClubMembership[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}memberships`);
      return saved ? JSON.parse(saved) : MOCK_MEMBERSHIPS;
    } catch {
      return MOCK_MEMBERSHIPS;
    }
  });

  const [certificates] = useState<Certificate[]>(MOCK_CERTIFICATES);

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}notifications`);
      return saved ? JSON.parse(saved) : MOCK_NOTIFICATIONS;
    } catch {
      return MOCK_NOTIFICATIONS;
    }
  });

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}activities`);
      return saved ? JSON.parse(saved) : MOCK_ACTIVITIES;
    } catch {
      return MOCK_ACTIVITIES;
    }
  });

  // ── Cross-context sync: listen for localStorage changes from ManagementContext ──
  // When the Venue Manager approves a booking, ManagementContext writes to
  // 'campus_event_student_state_events'. This listener picks that up so the
  // student sees newly-published events without a full page reload.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === `${STORAGE_KEY_PREFIX}events` && e.newValue) {
        try {
          setEvents(JSON.parse(e.newValue));
        } catch {
          // ignore parse errors
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Dynamically computed stats
  const stats: DashboardStats = useMemo(() => {
    const activeRegs = registrations.filter((r) => r.status === 'registered');
    const attendedRegs = registrations.filter((r) => r.status === 'attended');
    const earnedCerts = certificates.filter((c) => c.status === 'issued');
    const activeClubs = memberships.filter((m) => m.isActive && m.membershipStatus === 'approved');
    const now = new Date();
    const upcoming = activeRegs.filter((r) => new Date(r.startTime) > now);

    return {
      eventsRegistered: activeRegs.length,
      eventsAttended: attendedRegs.length,
      certificatesEarned: earnedCerts.length,
      clubMemberships: activeClubs.length,
      totalPoints: user?.points ?? 185,
      upcomingEvents: upcoming.length,
    };
  }, [registrations, certificates, memberships, user]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Lookup helpers
  const getEvent = useCallback(
    (eventId: number) => events.find((e) => e.eventId === eventId),
    [events]
  );

  const getClub = useCallback(
    (clubId: number) => clubs.find((c) => c.clubId === clubId),
    [clubs]
  );

  const getRegistrationForEvent = useCallback(
    (eventId: number) =>
      registrations.find(
        (r) => r.eventId === eventId && (r.status === 'registered' || r.status === 'waitlisted' || r.status === 'attended')
      ),
    [registrations]
  );

  // ── Action: Register for Event ─────────────────────────────────────────────
  const registerForEvent = useCallback(
    async (eventId: number, params?: RegisterParams) => {
      // Simulate realistic async roundtrip
      await new Promise((r) => setTimeout(r, 600));

      const event = events.find((e) => e.eventId === eventId);
      if (!event) {
        throw new Error('Event not found.');
      }

      // Check duplicate
      const existing = registrations.find(
        (r) => r.eventId === eventId && (r.status === 'registered' || r.status === 'waitlisted')
      );
      if (existing) {
        throw new Error('You are already registered or waitlisted for this event.');
      }

      // Check deadline
      if (new Date() > new Date(event.registrationDeadline)) {
        throw new Error('Registration deadline has passed for this event.');
      }

      // Check completed
      if (event.status === 'completed' || new Date() > new Date(event.endTime)) {
        throw new Error('This event has already concluded.');
      }

      // Check capacity
      if (event.registeredCount >= event.maxCapacity) {
        throw new Error('This event has reached maximum capacity. You can join the waitlist instead.');
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `TKT-${event.title.substring(0, 4).toUpperCase()}-8841-${randomSuffix}`;

      const newRegistration: EventRegistration = {
        registrationId: Date.now(),
        eventId: event.eventId,
        eventTitle: event.title,
        eventCategory: event.category,
        eventCategoryColor: event.categoryColor || '#1b3b57',
        startTime: event.startTime,
        endTime: event.endTime,
        venueName: event.venue?.name ?? (event.isOnline ? 'Online Event' : 'TBD'),
        clubName: event.clubName,
        registeredAt: new Date().toISOString(),
        status: 'registered',
        ticketCode,
        dietaryPreferences: params?.dietaryPreferences || 'None',
        specialNotes: params?.specialNotes,
      };

      // 1. Update event registration count & status
      const updatedEvents = events.map((e) => {
        if (e.eventId === eventId) {
          return {
            ...e,
            registeredCount: e.registeredCount + 1,
            isRegistered: true,
            registrationStatus: 'registered' as const,
          };
        }
        return e;
      });

      // 2. Add to registrations
      const updatedRegistrations = [newRegistration, ...registrations];

      // 3. Add confirmation notification
      const newNotification: Notification = {
        notificationId: `notif-${Date.now()}`,
        type: 'event_registration',
        title: 'Registration Confirmed',
        message: `Your registration for "${event.title}" is confirmed. E-ticket code: ${ticketCode}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedEntityId: event.eventId,
        relatedEntityType: 'event',
        actionUrl: `/student/registrations`,
      };

      // 4. Add to activity feed
      const newActivity: ActivityItem = {
        activityId: `act-${Date.now()}`,
        type: 'event_registration',
        title: `Registered for ${event.title}`,
        description: `You secured a seat for ${event.title} organized by ${event.clubName}.`,
        timestamp: new Date().toISOString(),
        iconColor: 'teal',
      };

      setEvents(updatedEvents);
      setRegistrations(updatedRegistrations);
      setNotifications((prev) => [newNotification, ...prev]);
      setActivities((prev) => [newActivity, ...prev]);

      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}events`, JSON.stringify(updatedEvents));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}registrations`, JSON.stringify(updatedRegistrations));
      } catch {
        // storage fallback
      }

      return { success: true, message: `Successfully registered for ${event.title}!`, ticketCode };
    },
    [events, registrations]
  );

  // ── Action: Cancel Registration (With simulated waitlist promotion!) ────────
  const cancelRegistration = useCallback(
    async (registrationId: number, reason?: string) => {
      await new Promise((r) => setTimeout(r, 600));

      const reg = registrations.find((r) => r.registrationId === registrationId);
      if (!reg) {
        throw new Error('Registration record not found.');
      }

      const event = events.find((e) => e.eventId === reg.eventId);
      let wasWaitlistPromoted = false;

      // 1. Update registration status
      let updatedRegistrations = registrations.map((r) => {
        if (r.registrationId === registrationId) {
          return {
            ...r,
            status: 'cancelled' as const,
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason ?? 'Student requested cancellation',
          };
        }
        return r;
      });

      // 2. Update event capacity
      let updatedEvents = events.map((e) => {
        if (e.eventId === reg.eventId) {
          const newRegistered = Math.max(0, e.registeredCount - 1);
          return {
            ...e,
            registeredCount: newRegistered,
            isRegistered: false,
            registrationStatus: undefined,
          };
        }
        return e;
      });

      // 3. Simulated waitlist promotion!
      // If there are waitlisted registrations for this event, promote the first one
      const waitlistedIdx = updatedRegistrations.findIndex(
        (r) => r.eventId === reg.eventId && r.status === 'waitlisted'
      );

      let promotionNotification: Notification | null = null;
      let promotionActivity: ActivityItem | null = null;

      if (waitlistedIdx !== -1 && event) {
        wasWaitlistPromoted = true;

        // Promote student
        updatedRegistrations = updatedRegistrations.map((r, idx) => {
          if (idx === waitlistedIdx) {
            return {
              ...r,
              status: 'registered' as const,
              promotedAt: new Date().toISOString(),
              waitlistPosition: undefined,
              ticketCode: `TKT-PROMO-${Date.now().toString().slice(-4)}`,
            };
          }
          // Shift other waitlist positions up
          if (r.eventId === reg.eventId && r.status === 'waitlisted' && r.waitlistPosition && r.waitlistPosition > 1) {
            return {
              ...r,
              waitlistPosition: r.waitlistPosition - 1,
            };
          }
          return r;
        });

        // Event waitlist count decrement and seat allocated
        updatedEvents = updatedEvents.map((e) => {
          if (e.eventId === reg.eventId) {
            return {
              ...e,
              registeredCount: e.registeredCount + 1, // promoted takes seat
              waitlistCount: Math.max(0, (e.waitlistCount || 0) - 1),
              isRegistered: true,
              registrationStatus: 'registered' as const,
            };
          }
          return e;
        });

        promotionNotification = {
          notificationId: `notif-promo-${Date.now()}`,
          type: 'waitlist_promoted',
          title: 'Waitlist Promoted! Seat Confirmed',
          message: `A spot opened up for "${event.title}". You have been promoted from the waitlist and your registration is now confirmed!`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedEntityId: event.eventId,
          relatedEntityType: 'event',
          actionUrl: `/student/registrations`,
        };

        promotionActivity = {
          activityId: `act-promo-${Date.now()}`,
          type: 'waitlist_promoted',
          title: `Promoted from Waitlist for ${event.title}`,
          description: `You were automatically promoted from the waitlist to confirmed registration.`,
          timestamp: new Date().toISOString(),
          iconColor: 'green',
        };
      }

      // Add cancellation notification
      const cancelNotification: Notification = {
        notificationId: `notif-cancel-${Date.now()}`,
        type: 'general',
        title: 'Registration Cancelled',
        message: `Your registration for "${reg.eventTitle}" was cancelled. Your seat has been released.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedEntityId: reg.eventId,
        relatedEntityType: 'event',
      };

      const cancelActivity: ActivityItem = {
        activityId: `act-cancel-${Date.now()}`,
        type: 'general',
        title: `Cancelled Registration for ${reg.eventTitle}`,
        description: `You cancelled your registration for ${reg.eventTitle}.`,
        timestamp: new Date().toISOString(),
        iconColor: 'red',
      };

      setEvents(updatedEvents);
      setRegistrations(updatedRegistrations);

      const newNotifs = [cancelNotification];
      if (promotionNotification) newNotifs.unshift(promotionNotification);
      setNotifications((prev) => [...newNotifs, ...prev]);

      const newActs = [cancelActivity];
      if (promotionActivity) newActs.unshift(promotionActivity);
      setActivities((prev) => [...newActs, ...prev]);

      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}events`, JSON.stringify(updatedEvents));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}registrations`, JSON.stringify(updatedRegistrations));
      } catch {
        // fallback
      }

      return {
        success: true,
        message: `Registration for ${reg.eventTitle} has been cancelled.`,
        promotedStudent: wasWaitlistPromoted,
      };
    },
    [events, registrations]
  );

  // ── Action: Join Waitlist ──────────────────────────────────────────────────
  const joinWaitlist = useCallback(
    async (eventId: number) => {
      await new Promise((r) => setTimeout(r, 600));

      const event = events.find((e) => e.eventId === eventId);
      if (!event) throw new Error('Event not found.');

      const existing = registrations.find(
        (r) => r.eventId === eventId && (r.status === 'registered' || r.status === 'waitlisted')
      );
      if (existing) {
        throw new Error('You already have an active registration or waitlist spot for this event.');
      }

      const position = (event.waitlistCount || 0) + 1;
      const waitlistReg: EventRegistration = {
        registrationId: Date.now(),
        eventId: event.eventId,
        eventTitle: event.title,
        eventCategory: event.category,
        eventCategoryColor: event.categoryColor || '#1b3b57',
        startTime: event.startTime,
        endTime: event.endTime,
        venueName: event.venue?.name ?? (event.isOnline ? 'Online Event' : 'TBD'),
        clubName: event.clubName,
        registeredAt: new Date().toISOString(),
        status: 'waitlisted',
        waitlistPosition: position,
        ticketCode: `WL-${event.title.substring(0, 4).toUpperCase()}-#${position}`,
      };

      const updatedEvents = events.map((e) => {
        if (e.eventId === eventId) {
          return {
            ...e,
            waitlistCount: (e.waitlistCount || 0) + 1,
            isRegistered: true,
            registrationStatus: 'waitlisted' as const,
            waitlistPosition: position,
          };
        }
        return e;
      });

      const updatedRegistrations = [waitlistReg, ...registrations];

      const newNotification: Notification = {
        notificationId: `notif-wl-${Date.now()}`,
        type: 'general',
        title: 'Joined Event Waitlist',
        message: `You are in waitlist position #${position} for "${event.title}". You will be automatically promoted if a seat opens up.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedEntityId: event.eventId,
        relatedEntityType: 'event',
        actionUrl: `/student/registrations`,
      };

      const newActivity: ActivityItem = {
        activityId: `act-wl-${Date.now()}`,
        type: 'general',
        title: `Joined Waitlist for ${event.title}`,
        description: `Waitlist rank #${position} for ${event.title}.`,
        timestamp: new Date().toISOString(),
        iconColor: 'amber',
      };

      setEvents(updatedEvents);
      setRegistrations(updatedRegistrations);
      setNotifications((prev) => [newNotification, ...prev]);
      setActivities((prev) => [newActivity, ...prev]);

      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}events`, JSON.stringify(updatedEvents));
        localStorage.setItem(`${STORAGE_KEY_PREFIX}registrations`, JSON.stringify(updatedRegistrations));
      } catch {
        // fallback
      }

      return {
        success: true,
        message: `You have joined the waitlist at position #${position}.`,
        position,
      };
    },
    [events, registrations]
  );

  // ── Action: Cancel Waitlist ────────────────────────────────────────────────
  const cancelWaitlist = useCallback(
    async (registrationId: number) => {
      await new Promise((r) => setTimeout(r, 500));

      const reg = registrations.find((r) => r.registrationId === registrationId);
      if (!reg) throw new Error('Waitlist record not found.');

      const updatedRegistrations = registrations.map((r) => {
        if (r.registrationId === registrationId) {
          return { ...r, status: 'cancelled' as const, cancelledAt: new Date().toISOString() };
        }
        return r;
      });

      const updatedEvents = events.map((e) => {
        if (e.eventId === reg.eventId) {
          return {
            ...e,
            waitlistCount: Math.max(0, (e.waitlistCount || 0) - 1),
            isRegistered: false,
            registrationStatus: undefined,
            waitlistPosition: undefined,
          };
        }
        return e;
      });

      setEvents(updatedEvents);
      setRegistrations(updatedRegistrations);

      return { success: true, message: `Removed from waitlist for ${reg.eventTitle}.` };
    },
    [events, registrations]
  );

  // ── Action: Simulate Waitlist Promotion Demo ───────────────────────────────
  const simulateWaitlistPromotion = useCallback(
    async (eventId: number) => {
      await new Promise((r) => setTimeout(r, 600));

      const event = events.find((e) => e.eventId === eventId);
      if (!event) throw new Error('Event not found.');

      // Find first waitlisted registration
      const wlRegIndex = registrations.findIndex(
        (r) => r.eventId === eventId && r.status === 'waitlisted'
      );

      if (wlRegIndex === -1) {
        throw new Error('No waitlisted registrations found for this event to promote.');
      }

      const newTicketCode = `TKT-PROMO-${Date.now().toString().slice(-4)}`;

      const updatedRegistrations = registrations.map((r, idx) => {
        if (idx === wlRegIndex) {
          return {
            ...r,
            status: 'registered' as const,
            promotedAt: new Date().toISOString(),
            waitlistPosition: undefined,
            ticketCode: newTicketCode,
          };
        }
        // Decrement position for others
        if (r.eventId === eventId && r.status === 'waitlisted' && r.waitlistPosition && r.waitlistPosition > 1) {
          return {
            ...r,
            waitlistPosition: r.waitlistPosition - 1,
          };
        }
        return r;
      });

      const updatedEvents = events.map((e) => {
        if (e.eventId === eventId) {
          return {
            ...e,
            registeredCount: Math.min(e.maxCapacity, e.registeredCount + 1),
            waitlistCount: Math.max(0, (e.waitlistCount || 0) - 1),
            isRegistered: true,
            registrationStatus: 'registered' as const,
            waitlistPosition: undefined,
          };
        }
        return e;
      });

      const promoNotification: Notification = {
        notificationId: `notif-sim-promo-${Date.now()}`,
        type: 'waitlist_promoted',
        title: 'Waitlist Promoted! (Simulation)',
        message: `Congratulations! A slot opened for "${event.title}". You were promoted from the waitlist to confirmed registration. E-Ticket: ${newTicketCode}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedEntityId: event.eventId,
        relatedEntityType: 'event',
        actionUrl: `/student/registrations`,
      };

      const promoActivity: ActivityItem = {
        activityId: `act-sim-promo-${Date.now()}`,
        type: 'waitlist_promoted',
        title: `Promoted from Waitlist for ${event.title}`,
        description: `Simulated waitlist promotion confirmed your seat for ${event.title}.`,
        timestamp: new Date().toISOString(),
        iconColor: 'green',
      };

      setEvents(updatedEvents);
      setRegistrations(updatedRegistrations);
      setNotifications((prev) => [promoNotification, ...prev]);
      setActivities((prev) => [promoActivity, ...prev]);

      return {
        success: true,
        message: `Simulated promotion complete! Waitlist member promoted to confirmed ticket for ${event.title}.`,
        promotedName: 'Samara Jenkins',
      };
    },
    [events, registrations]
  );

  // ── Action: Request Club Membership ────────────────────────────────────────
  const requestClubMembership = useCallback(
    async (clubId: number, notes?: string) => {
      await new Promise((r) => setTimeout(r, 600));

      const club = clubs.find((c) => c.clubId === clubId);
      if (!club) throw new Error('Club not found.');

      const existing = memberships.find((m) => m.clubId === clubId);
      if (existing) {
        if (existing.membershipStatus === 'pending') {
          throw new Error('You already have a pending membership application for this club.');
        }
        if (existing.membershipStatus === 'approved') {
          throw new Error('You are already an active member of this club.');
        }
      }

      const newMembership: ClubMembership = {
        membershipId: Date.now(),
        clubId: club.clubId,
        clubName: club.name,
        clubCategory: club.category,
        memberRole: 'member',
        membershipStatus: 'pending',
        joinedAt: new Date().toISOString().split('T')[0],
        isActive: false,
        memberCount: club.memberCount,
        notes,
      };

      const updatedMemberships = [newMembership, ...memberships];

      const newNotification: Notification = {
        notificationId: `notif-club-${Date.now()}`,
        type: 'general',
        title: 'Club Membership Application Submitted',
        message: `Your membership application for "${club.name}" has been submitted and is awaiting coordinator approval.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedEntityId: club.clubId,
        relatedEntityType: 'club',
        actionUrl: `/student/clubs`,
      };

      const newActivity: ActivityItem = {
        activityId: `act-club-${Date.now()}`,
        type: 'general',
        title: `Applied to Join ${club.name}`,
        description: `Submitted membership application for ${club.name}. Status: Pending review.`,
        timestamp: new Date().toISOString(),
        iconColor: 'blue',
      };

      setMemberships(updatedMemberships);
      setNotifications((prev) => [newNotification, ...prev]);
      setActivities((prev) => [newActivity, ...prev]);

      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}memberships`, JSON.stringify(updatedMemberships));
      } catch {
        // fallback
      }

      return {
        success: true,
        message: `Membership request submitted for ${club.name}. Status: Pending review.`,
      };
    },
    [clubs, memberships]
  );

  // ── Action: Notifications ──────────────────────────────────────────────────
  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  // ── Action: Update Student Profile ─────────────────────────────────────────
  const updateStudentProfile = useCallback(
    async (data: Partial<User>) => {
      await new Promise((r) => setTimeout(r, 500));

      // Update in localStorage
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = { ...parsed, ...data };
        localStorage.setItem('user', JSON.stringify(updated));
      }

      // Add activity
      const profileActivity: ActivityItem = {
        activityId: `act-profile-${Date.now()}`,
        type: 'general',
        title: 'Updated Profile Information',
        description: 'Successfully updated your student academic profile and contact details.',
        timestamp: new Date().toISOString(),
        iconColor: 'teal',
      };
      setActivities((prev) => [profileActivity, ...prev]);

      return { success: true, message: 'Profile updated successfully!' };
    },
    []
  );

  const value = useMemo(
    () => ({
      events,
      registrations,
      clubs,
      memberships,
      certificates,
      notifications,
      activities,
      stats,
      unreadNotificationsCount,
      registerForEvent,
      cancelRegistration,
      joinWaitlist,
      cancelWaitlist,
      simulateWaitlistPromotion,
      requestClubMembership,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      updateStudentProfile,
      getEvent,
      getClub,
      getRegistrationForEvent,
    }),
    [
      events,
      registrations,
      clubs,
      memberships,
      certificates,
      notifications,
      activities,
      stats,
      unreadNotificationsCount,
      registerForEvent,
      cancelRegistration,
      joinWaitlist,
      cancelWaitlist,
      simulateWaitlistPromotion,
      requestClubMembership,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      updateStudentProfile,
      getEvent,
      getClub,
      getRegistrationForEvent,
    ]
  );

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
}
