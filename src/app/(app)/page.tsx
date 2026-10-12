import Link from "next/link";
import { DayStrip } from "@/components/day-strip";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { dayBounds, formatDateLong, formatTime, todayString } from "@/lib/time";

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm font-semibold ${
        active ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const user = await requireUser();
  const { category } = await searchParams;

  const today = todayString();
  const { from, to } = dayBounds(today);
  const now = new Date();

  const [categories, resources] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.resource.findMany({
      where: { isActive: true, ...(category ? { categoryId: category } : {}) },
      include: {
        category: true,
        reservations: {
          where: { status: "CONFIRMED", startAt: { lt: to }, endAt: { gt: from } },
          orderBy: { startAt: "asc" },
        },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Availability today</h1>
          <p className="mt-1 text-muted">{formatDateLong(today)}. Open a resource to book a time.</p>
        </div>
        {user.role === "ADMIN" && (
          <Link href="/admin/resources/new" className="btn btn-primary">Add resource</Link>
        )}
      </div>

      <nav aria-label="Filter by category" className="mt-6 flex flex-wrap gap-2">
        <FilterLink href="/" active={!category}>All</FilterLink>
        {categories.map((c) => (
          <FilterLink key={c.id} href={`/?category=${c.id}`} active={category === c.id}>
            {c.name}
          </FilterLink>
        ))}
      </nav>

      {resources.length === 0 ? (
        <p className="mt-6 rounded-lg border border-line bg-surface p-6 text-muted">
          No resources in this category yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
          {resources.map((r) => {
            const current = r.reservations.find((b) => b.startAt <= now && b.endAt > now);
            const next = r.reservations.find((b) => b.startAt > now);
            const status = current
              ? { label: `In use until ${formatTime(current.endAt)}`, busy: true }
              : next
                ? { label: `Free until ${formatTime(next.startAt)}`, busy: false }
                : { label: "Free for the rest of today", busy: false };
            const details = [r.category.name, r.location, r.capacity ? `capacity ${r.capacity}` : null]
              .filter(Boolean)
              .join(", ");

            return (
              <li key={r.id}>
                <Link
                  href={`/resources/${r.id}`}
                  className="grid gap-3 px-5 py-4 hover:bg-paper md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-center md:gap-8"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-display text-lg font-semibold">{r.name}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          status.busy ? "bg-busy-tint text-busy" : "bg-free-tint text-free"
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{details}</p>
                  </div>
                  <DayStrip
                    date={today}
                    blocks={r.reservations.map((b) => ({ id: b.id, startAt: b.startAt, endAt: b.endAt }))}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
