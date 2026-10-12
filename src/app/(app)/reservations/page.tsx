import Link from "next/link";
import { CancelButton } from "@/components/cancel-button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatRange } from "@/lib/time";

type Row = Awaited<ReturnType<typeof loadRows>>[number];

function loadRows(where: { userId?: string }) {
  return db.reservation.findMany({
    where,
    include: { resource: { select: { id: true, name: true } }, user: { select: { name: true } } },
    orderBy: { startAt: "asc" },
    take: 200,
  });
}

function ReservationList({ rows, showUser, canCancel }: { rows: Row[]; showUser: boolean; canCancel: boolean }) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-semibold">
              <Link href={`/resources/${r.resource.id}`} className="hover:underline">{r.resource.name}</Link>
              {r.status === "CANCELLED" && (
                <span className="ml-2 rounded-full bg-danger-tint px-2 py-0.5 text-xs font-semibold text-danger">Cancelled</span>
              )}
            </p>
            <p className="text-sm">{r.title}</p>
            <p className="text-sm text-muted">
              {formatRange(r.startAt, r.endAt)}
              {showUser ? `, booked by ${r.user.name}` : ""}
            </p>
          </div>
          {canCancel && r.status === "CONFIRMED" && (
            <CancelButton reservationId={r.id} resourceId={r.resource.id} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const scopeAll = user.role === "ADMIN" && sp.scope === "all";

  const rows = await loadRows(scopeAll ? {} : { userId: user.id });
  const now = new Date();
  const upcoming = rows.filter((r) => r.status === "CONFIRMED" && r.endAt > now);
  const history = rows
    .filter((r) => !(r.status === "CONFIRMED" && r.endAt > now))
    .reverse()
    .slice(0, 50);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">{scopeAll ? "All reservations" : "Your reservations"}</h1>
        {user.role === "ADMIN" && (
          <Link href={scopeAll ? "/reservations" : "/reservations?scope=all"} className="btn btn-quiet btn-sm">
            {scopeAll ? "Show only mine" : "Show everyone's"}
          </Link>
        )}
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">Upcoming</h2>
      <div className="mt-3">
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-6 text-muted">
            Nothing booked yet. <Link href="/" className="font-semibold text-busy hover:underline">Find a resource</Link> to make a reservation.
          </p>
        ) : (
          <ReservationList rows={upcoming} showUser={scopeAll} canCancel />
        )}
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-semibold">Past and cancelled</h2>
          <div className="mt-3">
            <ReservationList rows={history} showUser={scopeAll} canCancel={false} />
          </div>
        </>
      )}
    </div>
  );
}
