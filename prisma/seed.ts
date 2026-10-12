import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000);

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

  const resources = [
    { name: "Boardroom", category: "Meeting Room", capacity: 12, location: "Floor 3" },
    { name: "Huddle Room A", category: "Meeting Room", capacity: 4, location: "Floor 2" },
    { name: "Training Lab", category: "Lab", capacity: 20, location: "Floor 1" },
    { name: "Company Van", category: "Vehicle", capacity: 8, location: "Basement parking" },
    { name: "Projector Kit", category: "Equipment", capacity: null, location: "Reception" },
  ];

  // Re-seeding resets resources and reservations so the script stays idempotent.
  await db.reservation.deleteMany();
  await db.resource.deleteMany();

  const created = [];
  for (const r of resources) {
    created.push(
      await db.resource.create({
        data: {
          name: r.name,
          capacity: r.capacity,
          location: r.location,
          categoryId: categoryIds[r.category],
        },
      }),
    );
  }

  await db.reservation.createMany({
    data: [
      { resourceId: created[0].id, userId: admin.id, title: "Weekly planning", startAt: hoursFromNow(24), endAt: hoursFromNow(25) },
      { resourceId: created[0].id, userId: member.id, title: "Client call", startAt: hoursFromNow(26), endAt: hoursFromNow(27) },
      { resourceId: created[3].id, userId: member.id, title: "Site visit", startAt: hoursFromNow(48), endAt: hoursFromNow(52) },
    ],
  });

  console.log("Seeded: 2 users, %d categories, %d resources", categories.length, created.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
