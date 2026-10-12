import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { formatRange } from "./time";

const MAX_DURATION_HOURS = 12;

export const createReservationSchema = z
  .object({
    resourceId: z.string().min(1, "Choose a resource"),
    title: z.string().trim().min(1, "Add a title").max(120),
    notes: z.string().trim().max(500).optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
  })
  .refine((v) => v.endAt > v.startAt, {
    message: "End time must be after start time",
    path: ["endAt"],
  })
  .refine((v) => v.startAt > new Date(), {
    message: "Start time must be in the future",
    path: ["startAt"],
  })
  .refine(
    (v) => v.endAt.getTime() - v.startAt.getTime() <= MAX_DURATION_HOURS * 3_600_000,
    {
      message: `A reservation can be at most ${MAX_DURATION_HOURS} hours`,
      path: ["endAt"],
    },
  );

export type CreateReservationInput = z.input<typeof createReservationSchema>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: "VALIDATION" | "NOT_FOUND" | "INACTIVE" | "CONFLICT" | "FORBIDDEN" | "UNKNOWN";
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

/** True when Postgres rejected the insert via the overlap exclusion constraint (SQLSTATE 23P01). */
function isOverlapViolation(err: unknown): boolean {
  const text =
    err instanceof Error
      ? `${err.message} ${JSON.stringify((err as { meta?: unknown }).meta ?? "")}`
      : String(err);
  return text.includes("reservation_no_overlap") || text.includes("23P01");
}

/** Confirmed reservations that overlap the given window (used for friendly error messages). */
export function findConflicts(resourceId: string, startAt: Date, endAt: Date) {
  return db.reservation.findMany({
    where: {
      resourceId,
      status: "CONFIRMED",
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: { user: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });
}

export async function createReservation(
  userId: string,
  input: CreateReservationInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Please fix the highlighted fields",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { resourceId, title, notes, startAt, endAt } = parsed.data;

  const resource = await db.resource.findUnique({ where: { id: resourceId } });
  if (!resource) return { ok: false, code: "NOT_FOUND", message: "Resource not found" };
  if (!resource.isActive)
    return { ok: false, code: "INACTIVE", message: `${resource.name} is not available for booking` };

  try {
    // The DB exclusion constraint is the source of truth: it is race-free,
    // unlike a "check then insert" done in application code.
    const created = await db.reservation.create({
      data: { resourceId, userId, title, notes, startAt, endAt },
      select: { id: true },
    });
    return { ok: true, data: created };
  } catch (err) {
    if (isOverlapViolation(err)) {
      const conflicts = await findConflicts(resourceId, startAt, endAt);
      const first = conflicts[0];
      return {
        ok: false,
        code: "CONFLICT",
        message: first
          ? `${resource.name} is already booked by ${first.user.name}, ${formatRange(first.startAt, first.endAt)}. Pick another time.`
          : `${resource.name} was just booked for that time. Pick another slot.`,
      };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("createReservation prisma error", err.code, err.message);
    } else {
      console.error("createReservation error", err);
    }
    return { ok: false, code: "UNKNOWN", message: "Something went wrong. Please try again." };
  }
}

export async function cancelReservation(
  reservationId: string,
  actor: { id: string; role: "ADMIN" | "MEMBER" },
): Promise<ActionResult<{ id: string }>> {
  const existing = await db.reservation.findUnique({ where: { id: reservationId } });
  if (!existing) return { ok: false, code: "NOT_FOUND", message: "Reservation not found" };
  if (existing.userId !== actor.id && actor.role !== "ADMIN")
    return { ok: false, code: "FORBIDDEN", message: "You can only cancel your own reservations" };
  if (existing.status === "CANCELLED") return { ok: true, data: { id: existing.id } };

  const updated = await db.reservation.update({
    where: { id: reservationId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    select: { id: true },
  });
  return { ok: true, data: updated };
}

/** Confirmed reservations for a resource in [from, to) — feeds the availability timeline. */
export function getResourceSchedule(resourceId: string, from: Date, to: Date) {
  return db.reservation.findMany({
    where: { resourceId, status: "CONFIRMED", startAt: { lt: to }, endAt: { gt: from } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { startAt: "asc" },
  });
}
