-- Patana init migration — generated from prisma/schema.prisma
-- This file also adds production hardening: btree_gist + EXCLUDE constraint for booking overlap
-- If btree_gist unavailable, the application-level guard in src/booking.service.ts:canBook is the fallback.

-- Enable btree_gist for EXCLUDE USING gist on uuid + daterange
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ---------------------------------------------------------------------------
-- Prisma schema push will create tables; the SQL below is idempotent hardening
-- Run `prisma migrate` or `prisma db push` to create base tables first, then
-- apply the EXCLUDE constraint below. If you run this migration via
-- `prisma migrate dev`, Prisma will handle table creation before these DO blocks.
-- ---------------------------------------------------------------------------

-- Attempt to add overlap exclusion constraint on Booking.
-- Only PENDING/CONFIRMED block; CANCELLED/COMPLETED/NO_SHOW do not.
-- Uses daterange(checkIn, checkOut) with && (overlaps).
DO $$
BEGIN
  -- only add if table exists and constraint not already present
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Booking') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_no_overlap') THEN
      BEGIN
        ALTER TABLE "Booking"
        ADD CONSTRAINT booking_no_overlap
        EXCLUDE USING gist (
          "unitId" WITH =,
          daterange("checkIn", "checkOut", '[)') WITH &&
        )
        WHERE (status IN ('PENDING', 'CONFIRMED'));
        RAISE NOTICE 'EXCLUDE constraint booking_no_overlap added';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add EXCLUDE constraint (missing btree_gist or type mismatch): %', SQLERRM;
        RAISE NOTICE 'Fallback: application-level guard in src/booking.service.ts:canBook enforces overlap prevention with Serializable isolation';
      END;
    END IF;
  ELSE
    RAISE NOTICE 'Booking table not yet created — EXCLUDE constraint will be added on next migration after db push';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- CHECK-like comments enforced at app + optional DB checks
-- Uncomment to enforce at DB level (Postgres CHECK):
-- ---------------------------------------------------------------------------
-- ALTER TABLE "Unit" ADD CONSTRAINT unit_capacity_positive CHECK (capacity > 0);
-- ALTER TABLE "Unit" ADD CONSTRAINT unit_baseprice_nonnegative CHECK ("basePrice" >= 0);
-- ALTER TABLE "Booking" ADD CONSTRAINT booking_dates_check CHECK ("checkOut" > "checkIn");
-- ALTER TABLE "Booking" ADD CONSTRAINT booking_guests_positive CHECK (guests > 0);
-- ALTER TABLE "Booking" ADD CONSTRAINT booking_total_nonnegative CHECK ("totalPrice" IS NULL OR "totalPrice" >= 0);
-- ALTER TABLE "Payment" ADD CONSTRAINT payment_amount_nonnegative CHECK (amount >= 0);

-- Seed guidance:
-- Run: npx prisma db seed
