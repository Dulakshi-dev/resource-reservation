import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getUsageStats } from "@/lib/usage";

const RANGES = [7, 30, 90];

const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`;
const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toString();

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const requested = Number(sp.range);
  const days = RANGES.includes(requested) ? requested : 30;

  const stats = await getUsageStats(days);
  const { totals, rows, hourly } = stats;

  const maxMinutes = Math.max(...hourly.map((h) => h.minutes), 1);
  const busiest = hourly.reduce((a, b) => (b.minutes > a.minutes ? b : a));
  const mostUsed = rows[0];
  const leastUsed = rows.reduce((a, b) => (b.utilisation < a.utilisation ? b : a), rows[0]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Usage</h1>
          <p className="mt-1 text-muted">How the last {days} days of bookings were spent.</p>
        </div>
        <nav aria-label="Time range" className="flex gap-2">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/usage?range=${r}`}
              aria-current={r === days ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                r === days ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted hover:text-ink"
              }`}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      <dl className="mt-6 grid divide-y divide-line rounded-lg border border-line bg-surface sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {[
          { label: "Bookings made", value: totals.bookings.toString() },
          { label: "Hours booked", value: oneDecimal(totals.hours) },
          { label: "Cancelled", value: `${totals.cancelled} (${Math.round(totals.cancelRate)}%)` },
          { label: "Upcoming now", value: totals.upcoming.toString() },
        ].map((item) => (
          <div key={item.label} className="px-5 py-4">
            <dt className="text-sm text-muted">{item.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{item.value}</dd>
          </div>
        ))}
      </dl>

      {totals.bookings > 0 && mostUsed && leastUsed && (
        <p className="mt-4 max-w-prose">
          {mostUsed.name} is the most used resource. {leastUsed.name} is the least used, at{" "}
          {Math.round(leastUsed.utilisation)}% of bookable time. The busiest hour is {hourLabel(busiest.hour)}.
        </p>
      )}

      <h2 className="mt-10 font-display text-xl font-semibold">By resource</h2>
      <p className="mt-1 text-sm text-muted">Utilisation is booked time as a share of 7 am to 9 pm on every day in the range.</p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Resource</th>
              <th className="px-4 py-3 font-semibold">Bookings</th>
              <th className="px-4 py-3 font-semibold">Hours booked</th>
              <th className="min-w-48 px-4 py-3 font-semibold">Utilisation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <Link href={`/resources/${r.id}`} className="font-semibold hover:underline">{r.name}</Link>
                  <p className="text-muted">{r.category}</p>
                </td>
                <td className="px-4 py-3">{r.bookings}</td>
                <td className="px-4 py-3">{oneDecimal(r.hours)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-3 flex-1 overflow-hidden rounded-sm bg-busy-tint" role="img" aria-label={`${Math.round(r.utilisation)} percent utilised`}>
                      <div className="h-full bg-busy" style={{ width: `${r.utilisation}%` }} />
                    </div>
                    <span className="w-10 text-right font-semibold">{Math.round(r.utilisation)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Busiest hours</h2>
      <p className="mt-1 text-sm text-muted">Total hours booked in each clock hour, across all resources.</p>
      <div className="mt-3 rounded-lg border border-line bg-surface p-5">
        <div className="flex h-40 items-end gap-1.5">
          {hourly.map((h) => (
            <div key={h.hour} className="flex h-full flex-1 flex-col justify-end" title={`${hourLabel(h.hour)}: ${oneDecimal(h.minutes / 60)} hours booked`}>
              <div
                className={`rounded-t-sm ${h.hour === busiest.hour && h.minutes > 0 ? "bg-ink" : "bg-busy"}`}
                style={{ height: `${(h.minutes / maxMinutes) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 text-xs text-muted" aria-hidden="true">
          {hourly.map((h) => (
            <span key={h.hour} className="flex-1 text-center">{h.hour % 12 || 12}</span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Hour of day, 7 am to 8 pm (hours before noon are am).</p>
      </div>
    </div>
  );
}
