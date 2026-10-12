-- Paste this at the bottom of the generated init migration.sql
-- (Prisma cannot express these constraints in schema.prisma).

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A reservation must end after it starts.
ALTER TABLE "Reservation"
  ADD CONSTRAINT reservation_end_after_start CHECK ("endAt" > "startAt");

-- No two CONFIRMED reservations of the same resource may overlap.
-- '[)' means back-to-back bookings (10:00-11:00 then 11:00-12:00) are allowed.
-- Cancelled reservations are ignored, so a freed slot can be re-booked.
ALTER TABLE "Reservation"
  ADD CONSTRAINT reservation_no_overlap
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED');
