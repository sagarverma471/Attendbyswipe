/**
 * Unified real-time date helpers for classroom attendance
 */

/**
 * Returns today's ISO date string: YYYY-MM-DD (e.g. "2026-10-12")
 */
export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's formatted readable string: e.g. "12 Oct 2026"
 */
export function getFormattedTodayDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }); // "12 Oct 2026"
}

/**
 * Formats any ISO date or date string into readable format: "12 Oct 2026" or "Today, 12 Oct 2026"
 */
export function formatClassDate(dateStr?: string, includeTodayPrefix = false): string {
  if (!dateStr) return getFormattedTodayDate();

  const todayIso = getTodayIsoDate();
  const isToday = dateStr === todayIso || dateStr.startsWith(todayIso);

  // If dateStr is in YYYY-MM-DD
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const formatted = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    if (isToday && includeTodayPrefix) {
      return `Today, ${formatted}`;
    }
    return formatted;
  }

  return dateStr;
}

/**
 * Checks if a date string is today
 */
export function isTodayDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dateStr.startsWith(getTodayIsoDate());
}
