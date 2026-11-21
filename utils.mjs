const DAY = 86_400_000;
const JAKARTA_OFFSET = 7 * 60 * 60 * 1000;

export function calendarDaysSince(start, now = new Date()) {
  const startDay = Math.floor(Date.parse(`${start}T00:00:00Z`) / DAY);
  const currentDay = Math.floor((now.getTime() + JAKARTA_OFFSET) / DAY);
  return Math.max(0, currentDay - startDay);
}

export function filterMemories(memories, period) {
  if (period === 'all') return [...memories];
  if (/^\d{4}$/.test(period)) return memories.filter(m => m.date.startsWith(period));
  const quarter = /^(\d{4})-q([1-4])$/.exec(period);
  if (!quarter) return [];
  return memories.filter(m => m.date.startsWith(quarter[1]) && Math.ceil(Number(m.date.slice(5, 7)) / 3) === Number(quarter[2]));
}
