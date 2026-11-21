/**
 * recommendationService.ts
 *
 * Client & Backend AI-powered event and club recommendation engine.
 * Computes personalized affinity scores using student memberships, past
 * registration history, category preferences, and topical tag overlaps.
 */

import apiClient from './apiClient';
import type { CampusEvent } from '../types/event';
import type { EventRegistration } from '../types';
import type { ClubMembership } from '../types/club';
import type { User } from '../types/auth';

export interface RecommendedEvent extends CampusEvent {
  score: number;
  matchPercentage: number;
  matchReason: string;
  reasonTag: string;
  confidenceLevel: 'High' | 'Very High' | 'Top Pick';
}

export interface SimilarEventItem {
  event: CampusEvent;
  similarityScore: number;
  matchFactors: string[];
}

/**
 * Calculates heuristic AI recommendations client-side based on user profile and history.
 */
export function computeClientEventRecommendations(
  user: User | null,
  allEvents: CampusEvent[],
  registrations: EventRegistration[] = [],
  memberships: ClubMembership[] = []
): RecommendedEvent[] {
  const now = new Date();

  // 1. Gather User Affinity Profile
  const registeredEventIds = new Set(
    registrations
      .filter((r) => r.status !== 'cancelled')
      .map((r) => r.eventId)
  );

  // Active club memberships
  const memberClubIds = new Set(
    memberships
      .filter((m) => m.status === 'approved' || m.role)
      .map((m) => m.clubId)
  );
  const memberClubNames = new Set(memberships.map((m) => m.clubName.toLowerCase()));

  // Past attended/registered categories & tags
  const pastEvents = allEvents.filter((e) => registeredEventIds.has(e.eventId));
  const categoryCounts: Record<string, number> = {};
  const userTags = new Set<string>();

  pastEvents.forEach((ev) => {
    if (ev.category) {
      categoryCounts[ev.category] = (categoryCounts[ev.category] || 0) + 1;
    }
    if (ev.tags && Array.isArray(ev.tags)) {
      ev.tags.forEach((t) => userTags.add(t.toLowerCase()));
    }
  });

  // Most frequent category
  let topCategory = '';
  let maxCatCount = 0;
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count > maxCatCount) {
      maxCatCount = count;
      topCategory = cat;
    }
  });

  // User's academic department keywords (e.g. "Computer Science" -> ["computer", "code", "tech"])
  const userDept = (user?.department || '').toLowerCase();

  // 2. Filter Candidate Events (Upcoming, Approved/Published, Not Registered, Not Full)
  const candidateEvents = allEvents.filter((ev) => {
    const isApprovedOrPublished =
      ev.status === 'published' ||
      ev.status === 'approved' ||
      ev.approvalStage === 'final_approved';

    if (!isApprovedOrPublished) return false;
    if (registeredEventIds.has(ev.eventId)) return false; // Already registered

    const evDate = ev.endTime
      ? new Date(ev.endTime)
      : ev.startDate
      ? new Date(ev.startDate)
      : ev.startTime
      ? new Date(ev.startTime)
      : null;

    if (evDate && evDate < now) return false; // Expired

    const spotsLeft = ev.maxCapacity - ev.registeredCount;
    if (spotsLeft <= 0) return false; // Full

    return true;
  });

  // 3. Score each candidate
  const scored = candidateEvents.map((ev) => {
    let rawScore = 0;
    const reasons: string[] = [];
    let reasonTag = '🌟 AI Spotlight';

    // Affinity 1: Club Membership (+35 pts)
    const isClubMember =
      memberClubIds.has(ev.clubId) ||
      memberClubNames.has(ev.clubName.toLowerCase());

    if (isClubMember) {
      rawScore += 35;
      reasons.push(`You're a member of ${ev.clubName}`);
      reasonTag = `🎯 ${ev.clubName}`;
    }

    // Affinity 2: Category Preference (+25 pts)
    if (topCategory && ev.category === topCategory) {
      rawScore += 25;
      if (reasons.length === 0) {
        reasons.push(`Matches your passion for ${ev.category} events`);
        reasonTag = `⚡ ${ev.category} Focus`;
      }
    } else if (ev.category === 'Technical' || ev.category === 'Workshop' || ev.category === 'Hackathon') {
      rawScore += 15;
    }

    // Affinity 3: Tag Overlaps (+12 pts per tag, up to 24)
    let tagMatches: string[] = [];
    if (ev.tags && Array.isArray(ev.tags)) {
      tagMatches = ev.tags.filter((t) => userTags.has(t.toLowerCase()));
      if (tagMatches.length > 0) {
        rawScore += Math.min(24, tagMatches.length * 12);
        if (reasons.length === 0) {
          reasons.push(`Aligns with your interests in #${tagMatches.slice(0, 2).join(', #')}`);
          reasonTag = `🏷️ #${tagMatches[0]}`;
        }
      }
    }

    // Affinity 4: Department / Major alignment (+15 pts)
    if (userDept) {
      const matchDept =
        ev.title.toLowerCase().includes(userDept) ||
        ev.description.toLowerCase().includes(userDept) ||
        (ev.clubName.toLowerCase().includes('ieee') && userDept.includes('computer')) ||
        (ev.clubName.toLowerCase().includes('code') && userDept.includes('tech'));

      if (matchDept) {
        rawScore += 15;
        if (reasons.length === 0) {
          reasons.push(`Recommended for your ${user?.department ?? 'degree'} curriculum`);
          reasonTag = '🎓 Dept Pick';
        }
      }
    }

    // Affinity 5: Popularity & Momentum (+10 pts)
    const fillRatio = ev.maxCapacity > 0 ? ev.registeredCount / ev.maxCapacity : 0;
    if (fillRatio >= 0.5) {
      rawScore += Math.round(fillRatio * 15);
      if (reasons.length === 0) {
        reasons.push('Trending high campus interest and fast filling seats');
        reasonTag = '🔥 Trending';
      }
    }

    // Fallback narrative if empty
    if (reasons.length === 0) {
      reasons.push('Top campus pick curated for student development');
    }

    // Map rawScore (0 - 100) to human-friendly match percentage (75% - 98%)
    const matchPercentage = Math.min(98, Math.max(76, Math.round(72 + rawScore * 0.28)));

    let confidenceLevel: 'High' | 'Very High' | 'Top Pick' = 'High';
    if (matchPercentage >= 94) confidenceLevel = 'Top Pick';
    else if (matchPercentage >= 88) confidenceLevel = 'Very High';

    return {
      ...ev,
      score: rawScore,
      matchPercentage,
      matchReason: reasons.join(' • '),
      reasonTag,
      confidenceLevel,
    } as RecommendedEvent;
  });

  // Sort by matchPercentage DESC, then date ASC
  return scored.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
}

/**
 * Calculates similarity between a target event and all other campus events.
 */
export function computeSimilarEvents(
  targetEvent: CampusEvent,
  allEvents: CampusEvent[],
  limit = 4
): SimilarEventItem[] {
  const targetTags = new Set((targetEvent.tags || []).map((t) => t.toLowerCase()));

  const candidates = allEvents.filter((e) => e.eventId !== targetEvent.eventId);

  const scored = candidates.map((ev) => {
    let similarity = 50; // base similarity
    const matchFactors: string[] = [];

    // Category match
    if (ev.category === targetEvent.category) {
      similarity += 25;
      matchFactors.push(`Same Category (${ev.category})`);
    }

    // Club match
    if (ev.clubId === targetEvent.clubId || ev.clubName === targetEvent.clubName) {
      similarity += 15;
      matchFactors.push(`Organized by ${ev.clubName}`);
    }

    // Tag matches
    const sharedTags = (ev.tags || []).filter((t) => targetTags.has(t.toLowerCase()));
    if (sharedTags.length > 0) {
      similarity += Math.min(15, sharedTags.length * 6);
      matchFactors.push(`Shared topics: #${sharedTags.slice(0, 2).join(', #')}`);
    }

    // Format match (online vs in-person)
    if (ev.isOnline === targetEvent.isOnline) {
      similarity += 5;
    }

    const similarityScore = Math.min(98, Math.max(68, similarity));

    return {
      event: ev,
      similarityScore,
      matchFactors: matchFactors.length > 0 ? matchFactors : ['Campus Event'],
    };
  });

  return scored
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

/**
 * High-level service method to fetch recommended events with backend API fallback.
 */
export async function getPersonalizedEventRecommendations(
  user: User | null,
  allEvents: CampusEvent[],
  registrations: EventRegistration[] = [],
  memberships: ClubMembership[] = []
): Promise<RecommendedEvent[]> {
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      const response = await apiClient.get('/recommendations/events');
      if (response.data && Array.isArray(response.data.events) && response.data.events.length > 0) {
        // Map backend returned events
        const backendMap = new Map<number, number>();
        response.data.events.forEach((item: { event_id: number; score: number }) => {
          backendMap.set(item.event_id, item.score);
        });

        // Compute client recommendations to supply rich UI tags and narrative
        const clientRecs = computeClientEventRecommendations(user, allEvents, registrations, memberships);

        // Enhance with backend score if present
        return clientRecs.map((rec) => {
          if (backendMap.has(rec.eventId)) {
            const bScore = backendMap.get(rec.eventId) || 0;
            const boostedPct = Math.min(99, Math.max(rec.matchPercentage, 78 + bScore * 4));
            return {
              ...rec,
              matchPercentage: boostedPct,
              confidenceLevel: boostedPct >= 94 ? 'Top Pick' : 'Very High',
            };
          }
          return rec;
        });
      }
    }
  } catch (_err) {
    // Graceful fallback to client-side heuristics
  }

  return computeClientEventRecommendations(user, allEvents, registrations, memberships);
}
