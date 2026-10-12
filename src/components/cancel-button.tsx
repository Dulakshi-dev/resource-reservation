"use client";

import { cancelReservationAction } from "@/actions/reservations";

export function CancelButton({ reservationId, resourceId }: { reservationId: string; resourceId: string }) {
  return (
    <form
      action={cancelReservationAction}
      onSubmit={(e) => {
        if (!confirm("Cancel this reservation?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={reservationId} />
      <input type="hidden" name="resourceId" value={resourceId} />
      <button type="submit" className="btn btn-danger btn-sm">
        Cancel
      </button>
    </form>
  );
}
