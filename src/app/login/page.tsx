import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/login-form";

const sample = [
  { name: "Boardroom", blocks: [[12, 28], [40, 18], [72, 20]] },
  { name: "Company Van", blocks: [[5, 30], [55, 35]] },
  { name: "Training Lab", blocks: [[25, 22], [60, 12]] },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <p className="font-display text-xl font-bold">Resource Desk</p>
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight">See what is free before you book it.</h1>
          <p className="mt-4 max-w-md text-white/75">
            Every room, vehicle and piece of equipment on one schedule. Two people can never hold the same slot.
          </p>
          <div className="mt-10 max-w-md space-y-4" aria-hidden="true">
            {sample.map((row) => (
              <div key={row.name}>
                <p className="mb-1 text-sm text-white/75">{row.name}</p>
                <div className="relative h-3 rounded-md bg-white/15">
                  {row.blocks.map(([left, width]) => (
                    <div key={left} className="absolute inset-y-0 bg-[#7FB0E6]" style={{ left: `${left}%`, width: `${width}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div />
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-bold">Sign in</h2>
          <LoginForm />
          <div className="mt-8 rounded-md border border-line bg-surface p-4 text-sm">
            <p className="font-semibold">Demo accounts</p>
            <p className="mt-1 text-muted">
              Admin: admin@example.com
              <br />
              Member: member@example.com
              <br />
              Password for both: password123
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
