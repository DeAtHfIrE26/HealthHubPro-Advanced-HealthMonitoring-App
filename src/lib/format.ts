const numberFormat = new Intl.NumberFormat('en-US');

export const formatNumber = (value: number): string => numberFormat.format(Math.round(value));

export const formatDecimal = (value: number, dp = 1): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

/** 1h 05m / 45m / 30s — never "0h 0m". */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Parses YYYY-MM-DD as a local date, avoiding the UTC-shift off-by-one. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export const formatWeekday = (iso: string): string => WEEKDAYS[parseIsoDate(iso).getDay()] ?? '';

export function formatShortDate(iso: string): string {
  const d = parseIsoDate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatRelativeDay(iso: string, today: string): string {
  if (iso === today) return 'Today';
  const diff = Math.round(
    (parseIsoDate(today).getTime() - parseIsoDate(iso).getTime()) / 86_400_000,
  );
  if (diff === 1) return 'Yesterday';
  if (diff < 7 && diff > 0) return `${diff} days ago`;
  return formatShortDate(iso);
}

export const todayIso = (): string => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

/** "3 days left" / "Ends today" / "Ended". */
export function formatDaysLeft(days: number, ended: boolean): string {
  if (ended) return 'Ended';
  if (days === 0) return 'Ends today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export const initials = (first: string, last: string): string =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
