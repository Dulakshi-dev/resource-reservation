import Link from "next/link";
import { toggleResourceActiveAction } from "@/actions/resources";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function AdminResourcesPage() {
  await requireAdmin();
  const now = new Date();

  const resources = await db.resource.findMany({
    include: {
      category: true,
      _count: { select: { reservations: { where: { status: "CONFIRMED", endAt: { gt: now } } } } },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Manage resources</h1>
          <p className="mt-1 text-muted">
            Deactivating a resource stops new bookings. Existing reservations stay on the schedule.
          </p>
        </div>
        <Link href="/admin/resources/new" className="btn btn-primary">Add resource</Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Capacity</th>
              <th className="px-4 py-3 font-semibold">Upcoming bookings</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {resources.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-semibold">{r.name}</td>
                <td className="px-4 py-3">{r.category.name}</td>
                <td className="px-4 py-3">{r.location ?? "None"}</td>
                <td className="px-4 py-3">{r.capacity ?? "None"}</td>
                <td className="px-4 py-3">{r._count.reservations}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.isActive ? "bg-free-tint text-free" : "bg-danger-tint text-danger"}`}>
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/resources/${r.id}`} className="btn btn-quiet btn-sm">Edit</Link>
                    <form action={toggleResourceActiveAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className={`btn btn-sm ${r.isActive ? "btn-danger" : "btn-quiet"}`}>
                        {r.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
