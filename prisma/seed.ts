import { PrismaClient, ReservationStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const HOUR = 3_600_000;
// Align demo bookings to whole hours in Sri Lanka time (UTC+5:30),
// so they never overlap a booking by a few seconds.
const SL_OFFSET = 5.5 * HOUR;
const hoursFromNow = (h: number) =>
  new Date(Math.floor((Date.now() + SL_OFFSET + h * HOUR) / HOUR) * HOUR - SL_OFFSET);

// Small deterministic random generator so every seed run gives the same history.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const TITLES = ["Team sync", "Client call", "Sprint planning", "Workshop", "Interview", "Training", "Site visit", "Demo"];

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { name: "Admin User", email: "admin@example.com", passwordHash, role: Role.ADMIN },
  });
  const member = await db.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: { name: "Member User", email: "member@example.com", passwordHash, role: Role.MEMBER },
  });

  const categories = ["Meeting Room", "Lab", "Vehicle", "Equipment"];
  const categoryIds: Record<string, string> = {};
  for (const name of categories) {
    const c = await db.category.upsert({ where: { name }, update: {}, create: { name } });
    categoryIds[name] = c.id;
  }

  // busyness is how likely a resource is to be booked on a working day
  const resources = [
    { name: "Boardroom", category: "Meeting Room", capacity: 12, location: "Floor 3", busyness: 0.8 },
    { name: "Huddle Room A", category: "Meeting Room", capacity: 4, location: "Floor 2", busyness: 0.55 },
    { name: "Training Lab", category: "Lab", capacity: 20, location: "Floor 1", busyness: 0.25 },
    { name: "Company Van", category: "Vehicle", capacity: 8, location: "Basement parking", busyness: 0.4 },
    { name: "Projector Kit", category: "Equipment", capacity: null, location: "Reception", busyness: 0.15 },
  ];

  // Re-seeding resets resources and reservations so the script stays idempotent.
  await db.reservation.deleteMany();
  await db.resource.deleteMany();

  const created = [];
  for (const r of resources) {
    created.push(
      await db.resource.create({
        data: { name: r.name, capacity: r.capacity, location: r.location, categoryId: categoryIds[r.category] },
      }),
    );
  }

  // ---- 28 days of past bookings (working days only, never overlapping) ----
  const random = rng(42);
  const users = [admin.id, member.id];
  const history: {
    resourceId: string;
    userId: string;
    title: string;
    startAt: Date;
    endAt: Date;
    status: ReservationStatus;
    cancelledAt: Date | null;
  }[] = [];

  const todayUtc = new Date();
  for (let back = 28; back >= 1; back--) {
    const day = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate() - back));
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const key = day.toISOString().slice(0, 10);
    const midnight = new Date(`${key}T00:00:00+05:30`).getTime();

    resources.forEach((res, i) => {
      let cursor = 8;
      while (cursor < 18 && random() < res.busyness) {
        const start = cursor + Math.floor(random() * 3);
        const length = 1 + Math.floor(random() * 3);
        if (start + length > 19) break;
        const cancelled = random() < 0.1;
        history.push({
          resourceId: created[i].id,
          userId: users[Math.floor(random() * users.length)],
          title: TITLES[Math.floor(random() * TITLES.length)],
          startAt: new Date(midnight + start * HOUR),
          endAt: new Date(midnight + (start + length) * HOUR),
          status: cancelled ? ReservationStatus.CANCELLED : ReservationStatus.CONFIRMED,
          cancelledAt: cancelled ? new Date(midnight + (start - 1) * HOUR) : null,
        });
        cursor = start + length;
      }
    });
  }
  await db.reservation.createMany({ data: history });

  // ---- a few upcoming bookings for the demo ----
  await db.reservation.createMany({
    data: [
      { resourceId: created[0].id, userId: admin.id, title: "Weekly planning", startAt: hoursFromNow(24), endAt: hoursFromNow(25) },
      { resourceId: created[0].id, userId: member.id, title: "Client call", startAt: hoursFromNow(26), endAt: hoursFromNow(27) },
      { resourceId: created[3].id, userId: member.id, title: "Site visit", startAt: hoursFromNow(48), endAt: hoursFromNow(52) },
    ],
  });

  console.log("Seeded: 2 users, %d categories, %d resources, %d past bookings", categories.length, created.length, history.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
