import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { CancelButton } from "@/components/cancel-button";
import { DayStrip } from "@/components/day-strip";
import { db } from "@/lib/db";
import { getResourceSchedule } from "@/lib/reservations";
import { requireUser } from "@/lib/session";
import { addDays, dayBounds, formatDateLong, formatTime, isValidDateString, todayString } from "@/lib/time";

export default async function ResourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; booked?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  const today = todayString();
  const date = isValidDateString(sp.date) ? sp.date : today;

  const resource = await db.resource.findUnique({ where: { id }, include: { category: true } });
  if (!resource) notFound();

  const { from, to } = dayBounds(date);
  const schedule = await getResourceSchedule(id, from, to);
  const now = new Date();
  const base = `/resources/${id}`;
  const details = [resource.category.name, resource.location, resource.capacity ? `capacity ${resource.capacity}` : null]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">Back to all resources</Link>
        <h1 className="mt-2 font-display text-3xl font-bold">{resource.name}</h1>
        <p className="mt-1 text-muted">{details}</p>
        {resource.description && <p className="mt-3 max-w-prose">{resource.description}</p>}

        {sp.booked === "1" && (
          <p role="status" className="mt-4 rounded-md bg-free-tint px-3 py-2 text-sm font-semibold text-free">
            Reservation confirmed.
          </p>
        )}
        {!resource.isActive && (
          <p role="status" className="mt-4 rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
            This resource is not available for new bookings.
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{formatDateLong(date)}</h2>
          <div className="flex gap-2">
            <Link href={`${base}?date=${addDays(date, -1)}`} className="btn btn-quiet btn-sm">Previous day</Link>
            <Link href={base} className="btn btn-quiet btn-sm">Today</Link>
            <Link href={`${base}?date=${addDays(date, 1)}`} className="btn btn-quiet btn-sm">Next day</Link>
          </div>
        </div>

        <div className="mt-4">
          <DayStrip
            date={date}
            large
            blocks={schedule.map((b) => ({ id: b.id, startAt: b.startAt, endAt: b.endAt, title: b.title }))}
          />
        </div>

        <h3 className="mt-8 font-display text-lg font-semibold">Bookings on this day</h3>
        {schedule.length === 0 ? (
          <p className="mt-2 text-muted">Nothing booked. The whole day is free.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
            {schedule.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold">
                    {formatTime(b.startAt)} to {formatTime(b.endAt)}
                  </p>
                  <p className="text-sm">{b.title}</p>
                  <p className="text-sm text-muted">
                    Booked by {b.user.id === user.id ? "you" : b.user.name}
                  </p>
                </div>
                {(b.user.id === user.id || user.role === "ADMIN") && b.endAt > now && (
                  <CancelButton reservationId={b.id} resourceId={id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {resource.isActive && (
        <aside className="h-fit rounded-lg border border-line bg-surface p-5">
          <h2 className="font-display text-xl font-semibold">Book {resource.name}</h2>
          <div className="mt-4">
            <BookingForm key={date} resourceId={id} defaultDate={date < today ? today : date} minDate={today} />
          </div>
        </aside>
      )}
    </div>
  );
}
