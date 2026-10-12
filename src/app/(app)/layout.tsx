import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { NavLinks } from "@/components/nav-links";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const items = [
    { href: "/", label: "Resources" },
    { href: "/reservations", label: "Reservations" },
    ...(user.role === "ADMIN"
      ? [
          { href: "/admin/usage", label: "Usage" },
          { href: "/admin/resources", label: "Manage resources" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-display text-lg font-bold">
            Resource Desk
          </Link>
          <NavLinks items={items} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted">{user.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-quiet btn-sm">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
