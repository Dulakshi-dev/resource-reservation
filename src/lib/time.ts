// All business times are shown and entered in Sri Lanka time.
// Sri Lanka has no daylight saving, so a fixed +05:30 offset is safe.
export const APP_TZ = "Asia/Colombo";
const OFFSET = "+05:30";

const dateKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TZ,
  hour: "numeric",
  minute: "2-digit",
});
const dateShortFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
});
const dateLongFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TZ,
  weekday: "long",
  month: "long",
  day: "numeric",
});

/** "2026-10-13" for the given instant, in Sri Lanka time. */
export const toDateKey = (d: Date) => dateKeyFmt.format(d);
export const todayString = () => toDateKey(new Date());

export function isValidDateString(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

/** Parses "YYYY-MM-DDTHH:mm" as Sri Lanka local time. */
export function parseLocalInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dayBounds(dateKey: string) {
  const from = new Date(`${dateKey}T00:00:00${OFFSET}`);
  return { from, to: new Date(from.getTime() + 86_400_000) };
}

export function addDays(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const formatTime = (d: Date) => timeFmt.format(d);
export const formatDate = (d: Date) => dateShortFmt.format(d);
export const formatDateLong = (dateKey: string) =>
  dateLongFmt.format(new Date(`${dateKey}T12:00:00${OFFSET}`));

export function formatRange(start: Date, end: Date) {
  if (toDateKey(start) === toDateKey(end)) {
    return `${formatDate(start)}, ${formatTime(start)} to ${formatTime(end)}`;
  }
  return `${formatDate(start)}, ${formatTime(start)} to ${formatDate(end)}, ${formatTime(end)}`;
}
