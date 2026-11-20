/**
 * Formats an ISO date string to a human-readable date.
 * e.g. "2026-12-05T09:00:00Z" → "Fri, 5 Dec 2026"
 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/**
 * Formats an ISO date string to a time.
 * e.g. "2026-12-05T09:00:00Z" → "2:30 PM"
 */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

/**
 * Formats both date and time.
 * e.g. "5 Dec 2026, 2:30 PM"
 */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

/**
 * Returns a relative time string.
 * e.g. "3 days ago", "in 5 hours"
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const prefix = future ? 'in ' : '';
  const suffix = future ? '' : ' ago';

  if (abs < 60_000) return 'just now';
  if (abs < 3_600_000) {
    const m = Math.floor(abs / 60_000);
    return `${prefix}${m} ${m === 1 ? 'minute' : 'minutes'}${suffix}`;
  }
  if (abs < 86_400_000) {
    const h = Math.floor(abs / 3_600_000);
    return `${prefix}${h} ${h === 1 ? 'hour' : 'hours'}${suffix}`;
  }
  const d = Math.floor(abs / 86_400_000);
  if (d < 30) return `${prefix}${d} ${d === 1 ? 'day' : 'days'}${suffix}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${prefix}${mo} ${mo === 1 ? 'month' : 'months'}${suffix}`;
  const y = Math.floor(mo / 12);
  return `${prefix}${y} ${y === 1 ? 'year' : 'years'}${suffix}`;
}

/**
 * Returns today's date in a friendly format.
 * e.g. "Friday, 20 November 2026"
 */
export function todayFriendly(): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

/**
 * Returns the first name of a full name string.
 */
export function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

/**
 * Clamps a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Returns the fill percentage for capacity bars.
 */
export function capacityPercent(registered: number, max: number): number {
  if (max <= 0) return 0;
  return clamp(Math.round((registered / max) * 100), 0, 100);
}
