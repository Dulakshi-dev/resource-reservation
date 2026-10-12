import { dayBounds, formatTime, todayString } from "@/lib/time";

const START_HOUR = 7;
const END_HOUR = 21;

export type StripBlock = { id: string; startAt: Date; endAt: Date; title?: string };

const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`;

/** One day of occupancy, 7 am to 9 pm. Green is free, blue is booked. */
export function DayStrip({ date, blocks, large = false }: { date: string; blocks: StripBlock[]; large?: boolean }) {
  const { from } = dayBounds(date);
  const winStart = from.getTime() + START_HOUR * 3_600_000;
  const winMs = (END_HOUR - START_HOUR) * 3_600_000;
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - winStart) / winMs) * 100));

  const now = Date.now();
  const showNow = date === todayString() && now >= winStart && now <= winStart + winMs;
  const hours = Array.from({ length: (END_HOUR - START_HOUR) / 2 + 1 }, (_, i) => START_HOUR + i * 2);

  return (
    <div>
      <div
        role="img"
        aria-label={`${blocks.length} booking${blocks.length === 1 ? "" : "s"} between 7 am and 9 pm`}
        className={`relative overflow-hidden rounded-md bg-free-tint ${large ? "h-16" : "h-3"}`}
      >
        {blocks.map((b) => {
          const left = pct(b.startAt.getTime());
          const width = pct(b.endAt.getTime()) - left;
          if (width <= 0) return null;
          return (
            <div
              key={b.id}
              title={b.title ? `${b.title}, ${formatTime(b.startAt)} to ${formatTime(b.endAt)}` : undefined}
              className="absolute inset-y-0 overflow-hidden bg-busy"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {large && b.title && (
                <div className="px-2 py-1 text-xs leading-tight text-white">
                  <div className="truncate font-semibold">{b.title}</div>
                  <div className="truncate opacity-90">
                    {formatTime(b.startAt)} to {formatTime(b.endAt)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {showNow && (
          <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${pct(now)}%` }} />
        )}
      </div>
      {large && (
        <div className="relative mt-1 h-4 text-xs text-muted" aria-hidden="true">
          {hours.map((h, i) => (
            <span
              key={h}
              className="absolute"
              style={{
                left: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%`,
                transform: i === 0 ? "none" : i === hours.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {hourLabel(h)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
