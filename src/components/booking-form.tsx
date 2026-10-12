"use client";

import { useActionState } from "react";
import { createReservationAction } from "@/actions/reservations";
import type { FormState } from "@/lib/form-state";
import { FieldError } from "./field-error";

export function BookingForm({
  resourceId,
  defaultDate,
  minDate,
}: {
  resourceId: string;
  defaultDate: string;
  minDate: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createReservationAction, null);
  const v = state?.values ?? {};
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="resourceId" value={resourceId} />

      {state?.error && (
        <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="title" className="label">What is it for?</label>
        <input id="title" name="title" required maxLength={120} className="field" placeholder="Weekly planning" defaultValue={v.title ?? ""} />
        <FieldError messages={fe.title} />
      </div>

      <div>
        <label htmlFor="date" className="label">Date</label>
        <input id="date" name="date" type="date" required min={minDate} className="field" defaultValue={v.date ?? defaultDate} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startTime" className="label">Start</label>
          <input id="startTime" name="startTime" type="time" step={900} required className="field" defaultValue={v.startTime ?? ""} />
          <FieldError messages={fe.startTime} />
        </div>
        <div>
          <label htmlFor="endTime" className="label">End</label>
          <input id="endTime" name="endTime" type="time" step={900} required className="field" defaultValue={v.endTime ?? ""} />
          <FieldError messages={fe.endTime} />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="label">Notes (optional)</label>
        <textarea id="notes" name="notes" rows={3} maxLength={500} className="field" defaultValue={v.notes ?? ""} />
        <FieldError messages={fe.notes} />
      </div>

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Booking" : "Book this time"}
      </button>
    </form>
  );
}
