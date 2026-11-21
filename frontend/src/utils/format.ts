/**
 * Safely parses any date input into a valid Date object or returns null.
 */
function parseDateSafe(input: string | undefined | null): Date | null {
  if (!input) return null;
  const str = String(input).trim();
  if (!str) return null;

  // Check if timestamp number
  if (/^\d{10,13}$/.test(str)) {
    const num = Number(str);
    const d = new Date(num < 1e11 ? num * 1000 : num);
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Try parsing YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.slice(0, 10).split('-');
    const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/**
 * Formats an ISO date string to a human-readable date.
 * e.g. "2026-12-05T09:00:00Z" → "Fri, 5 Dec 2026"
 */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return 'Date TBD';
  const d = parseDateSafe(iso);
  if (!d) {
    if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
      const parts = iso.slice(0, 10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return String(iso);
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(iso);
  }
}

/**
 * Formats an ISO date string to a time.
 * e.g. "2026-12-05T09:00:00Z" → "2:30 PM"
 */
export function formatTime(iso: string | undefined | null): string {
  if (!iso) return 'Time TBD';
  if (typeof iso === 'string' && (iso.includes('AM') || iso.includes('PM') || /^\d{1,2}:\d{2}$/.test(iso.trim()))) {
    return iso;
  }
  const d = parseDateSafe(iso);
  if (!d) return String(iso);
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(iso);
  }
}

/**
 * Formats both date and time.
 * e.g. "5 Dec 2026, 2:30 PM"
 */
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return 'TBD';
  const d = parseDateSafe(iso);
  if (!d) return String(iso);
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(iso);
  }
}

/**
 * Returns a relative time string.
 * e.g. "3 days ago", "in 5 hours"
 */
export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return 'recently';
  const d = parseDateSafe(iso);
  if (!d) return 'recently';
  const diff = Date.now() - d.getTime();
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
  const days = Math.floor(abs / 86_400_000);
  if (days < 30) return `${prefix}${days} ${days === 1 ? 'day' : 'days'}${suffix}`;
  const mo = Math.floor(days / 30);
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
