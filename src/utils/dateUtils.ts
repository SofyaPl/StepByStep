// Helper to format Date to YYYY-MM-DD in local time
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to normalize any date representation into YYYY-MM-DD
export function normalizeDateKey(rawDate: unknown): string {
  if (!rawDate) return getTodayKey();
  const str = String(rawDate).trim();

  // 1. Strict YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. Starts with YYYY-MM-DD (e.g. ISO string 2026-09-04T...)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  // 3. DD.MM.YYYY (e.g. 04.09.2026 or 4.9.2026)
  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    const day = dotMatch[1].padStart(2, '0');
    const month = dotMatch[2].padStart(2, '0');
    const year = dotMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 4. Try parsing as Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatDateKey(parsed);
  }

  return getTodayKey();
}

// Parse YYYY-MM-DD into a local Date
export function parseDateKey(dateKey: string): Date {
  const normalized = normalizeDateKey(dateKey);
  const [y, m, d] = normalized.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Get today as YYYY-MM-DD
export function getTodayKey(): string {
  return formatDateKey(new Date());
}

// Add days to dateKey
export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

// Check relative to today
export function isToday(dateKey: string): boolean {
  return dateKey === getTodayKey();
}

export function isPast(dateKey: string): boolean {
  return dateKey < getTodayKey();
}

export function isFuture(dateKey: string): boolean {
  return dateKey > getTodayKey();
}

// Human readable localized date title
export function getFriendlyDateTitle(dateKey: string): { title: string; subtitle: string } {
  const today = getTodayKey();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);

  const date = parseDateKey(dateKey);
  const dayOfWeek = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(date);
  const formattedDayMonth = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long'
  }).format(date);

  const capitalizedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

  if (dateKey === today) {
    return {
      title: 'Сегодня',
      subtitle: `${capitalizedDayOfWeek}, ${formattedDayMonth}`
    };
  }

  if (dateKey === tomorrow) {
    return {
      title: 'Завтра',
      subtitle: `${capitalizedDayOfWeek}, ${formattedDayMonth}`
    };
  }

  if (dateKey === yesterday) {
    return {
      title: 'Вчера',
      subtitle: `${capitalizedDayOfWeek}, ${formattedDayMonth}`
    };
  }

  return {
    title: `${formattedDayMonth}`,
    subtitle: capitalizedDayOfWeek
  };
}

// Generate an array of dates around a base date for the horizontal day strip
export function getSurroundingDays(centerDateKey: string, rangeBefore: number = 7, rangeAfter: number = 14) {
  const days: { key: string; dayNumber: number; weekdayShort: string; isToday: boolean }[] = [];
  const todayKey = getTodayKey();

  for (let i = -rangeBefore; i <= rangeAfter; i++) {
    const key = addDays(centerDateKey, i);
    const date = parseDateKey(key);
    const dayNumber = date.getDate();
    const weekdayShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date);

    days.push({
      key,
      dayNumber,
      weekdayShort: weekdayShort.slice(0, 2).toUpperCase(),
      isToday: key === todayKey
    });
  }

  return days;
}
