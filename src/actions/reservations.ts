"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { cancelReservation, createReservation } from "@/lib/reservations";
import { parseLocalInput } from "@/lib/time";
import { valuesOf, type FormState } from "@/lib/form-state";

export async function createReservationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = valuesOf(formData);

  const resourceId = String(formData.get("resourceId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startAt = parseLocalInput(`${date}T${String(formData.get("startTime") ?? "")}`);
  const endAt = parseLocalInput(`${date}T${String(formData.get("endTime") ?? "")}`);

  if (!startAt || !endAt) {
    return {
      error: "Pick a date, a start time and an end time",
      fieldErrors: {
        ...(startAt ? {} : { startTime: ["Choose a start time"] }),
        ...(endAt ? {} : { endTime: ["Choose an end time"] }),
      },
      values,
    };
  }

  const result = await createReservation(user.id, {
    resourceId,
    title: String(formData.get("title") ?? ""),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    startAt,
    endAt,
  });

  if (!result.ok) {
    const fe = result.fieldErrors ?? {};
    return {
      error: result.message,
      fieldErrors: { title: fe.title, startTime: fe.startAt, endTime: fe.endAt, notes: fe.notes },
      values,
    };
  }

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath(`/resources/${resourceId}`);
  redirect(`/resources/${resourceId}?date=${date}&booked=1`);
}

export async function cancelReservationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const resourceId = String(formData.get("resourceId") ?? "");

  await cancelReservation(id, { id: user.id, role: user.role });

  revalidatePath("/");
  revalidatePath("/reservations");
  if (resourceId) revalidatePath(`/resources/${resourceId}`);
}
