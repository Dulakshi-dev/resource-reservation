import { db } from "./db";

const HOUR = 3_600_000;
const OFFSET_MS = 5.5 * HOUR; // Sri Lanka time, no daylight saving
export const FIRST_HOUR = 7; // bookable day: 7 am to 9 pm
export const LAST_HOUR = 21;

/** Splits [start, end) into pieces that each sit inside one local clock hour. */
function eachLocalHour(start: number, end: number, visit: (hour: number, minutes: number) => void) {
  let t = start;
  while (t < end) {
    const local = t + OFFSET_MS;
    const hour = Math.floor((local % (24 * HOUR)) / HOUR);
    const chunkEnd = Math.min(end, t + (HOUR - (local % HOUR)));
    visit(hour, (chunkEnd - t) / 60_000);
    t = chunkEnd;
  }
}

export async function getUsageStats(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * HOUR);

  const [resources, reservations, upcoming] = await Promise.all([
    db.resource.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    db.reservation.findMany({
      where: { startAt: { gte: from, lt: to } },
      select: { resourceId: true, startAt: true, endAt: true, status: true },
    }),
    db.reservation.count({ where: { status: "CONFIRMED", endAt: { gt: to } } }),
  ]);

  const perResource = new Map(
    resources.map((r) => [r.id, { bookings: 0, minutes: 0, windowMinutes: 0 }]),
  );
  const hourMinutes = new Array<number>(24).fill(0);
  let confirmed = 0;
  let cancelled = 0;
  let totalMinutes = 0;

  for (const r of reservations) {
    if (r.status === "CANCELLED") {
      cancelled += 1;
      continue;
    }
    const stats = perResource.get(r.resourceId);
    if (!stats) continue; // inactive resource

    confirmed += 1;
    stats.bookings += 1;

    // Count only time that has already happened.
    const start = r.startAt.getTime();
    const end = Math.min(r.endAt.getTime(), to.getTime());
    eachLocalHour(start, end, (hour, minutes) => {
      stats.minutes += minutes;
      totalMinutes += minutes;
      hourMinutes[hour] += minutes;
      if (hour >= FIRST_HOUR && hour < LAST_HOUR) stats.windowMinutes += minutes;
    });
  }

  const availableMinutes = days * (LAST_HOUR - FIRST_HOUR) * 60;

  const rows = resources
    .map((r) => {
      const s = perResource.get(r.id)!;
      return {
        id: r.id,
        name: r.name,
        category: r.category.name,
        bookings: s.bookings,
        hours: s.minutes / 60,
        utilisation: Math.min(100, (s.windowMinutes / availableMinutes) * 100),
      };
    })
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));

  const hourly = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => ({
    hour: FIRST_HOUR + i,
    minutes: hourMinutes[FIRST_HOUR + i],
  }));

  return {
    days,
    totals: {
      bookings: confirmed,
      hours: totalMinutes / 60,
      cancelled,
      cancelRate: confirmed + cancelled === 0 ? 0 : (cancelled / (confirmed + cancelled)) * 100,
      upcoming,
    },
    rows,
    hourly,
  };
}
