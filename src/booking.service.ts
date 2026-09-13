/**
 * Patana Booking Service — pure functions + transactional reserve pattern
 *
 * Fixes applied:
 * - Overlap prevention (application guard + DB exclusion in migration)
 * - CHECK: checkOut > checkIn, guests >0 && <= capacity, amount >=0
 * - Currency explicit (CDF default)
 * - Availability window validation (all dates must have isAvailable=true)
 * - Idempotency via Payment.idempotencyKey
 */

// ───────────────── helpers ─────────────────

export type DateRange = { checkIn: Date; checkOut: Date };

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function isOverlapping(a: DateRange, b: DateRange): boolean {
  // [checkIn, checkOut) — checkout day is exclusive
  return a.checkIn < b.checkOut && b.checkIn < a.checkOut;
}

export function datesInRange(checkIn: Date, checkOut: Date): Date[] {
  const nights = nightsBetween(checkIn, checkOut);
  const dates: Date[] = [];
  for (let i = 0; i < nights; i++) {
    const d = new Date(checkIn);
    d.setDate(checkIn.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

// ───────────────── price ─────────────────

export type AvailabilityRow = {
  date: Date;
  priceOverride: number | null; // Decimal -> number
  isAvailable: boolean;
};

/**
 * Calculate total price: sum per night of (priceOverride ?? basePrice)
 * CHECK: totalPrice >= 0, nights > 0
 */
export function calculateTotalPrice(
  checkIn: Date,
  checkOut: Date,
  basePrice: number,
  availabilities: AvailabilityRow[]
): number {
  if (checkOut <= checkIn) throw new Error('checkOut must be after checkIn');
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) throw new Error('Booking must be at least 1 night');

  const map = new Map<string, AvailabilityRow>();
  for (const a of availabilities) {
    const key = new Date(a.date).toISOString().slice(0, 10);
    map.set(key, a);
  }

  let total = 0;
  for (const d of datesInRange(checkIn, checkOut)) {
    const key = d.toISOString().slice(0, 10);
    const row = map.get(key);
    if (!row) throw new Error(`Missing availability for ${key}`);
    const price = row.priceOverride ?? basePrice;
    if (price < 0) throw new Error(`Negative price on ${key}`);
    total += price;
  }
  return Math.round(total * 100) / 100;
}

// ───────────────── canBook ─────────────────

export type UnitForBooking = {
  capacity: number;
  basePrice: number;
  status: string; // UnitStatus
};

export type ExistingBooking = DateRange & { status: string };

export type CanBookInput = {
  unit: UnitForBooking;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  availabilities: AvailabilityRow[];
  existingBookings: ExistingBooking[];
};

export type CanBookResult = { ok: true } | { ok: false; reason: string };

export function canBook(input: CanBookInput): CanBookResult {
  const { unit, checkIn, checkOut, guests, availabilities, existingBookings } = input;

  // CHECK: date order
  if (!(checkIn instanceof Date) || !(checkOut instanceof Date)) return { ok: false, reason: 'Invalid dates' };
  if (checkOut <= checkIn) return { ok: false, reason: 'checkOut must be after checkIn' };
  if (nightsBetween(checkIn, checkOut) <= 0) return { ok: false, reason: 'At least 1 night required' };
  if (nightsBetween(checkIn, checkOut) > 365) return { ok: false, reason: 'Booking too long (max 365 nights)' };

  // CHECK: capacity
  if (!Number.isInteger(guests) || guests <= 0) return { ok: false, reason: 'guests must be positive integer' };
  if (guests > unit.capacity) return { ok: false, reason: `guests (${guests}) exceeds capacity (${unit.capacity})` };

  // CHECK: unit active
  if (unit.status !== 'ACTIVE') return { ok: false, reason: `Unit not active (status=${unit.status})` };

  // CHECK: availability rows cover full range and all isAvailable=true
  const needed = datesInRange(checkIn, checkOut);
  if (availabilities.length < needed.length) return { ok: false, reason: 'Incomplete availability window' };
  const availMap = new Map<string, AvailabilityRow>();
  for (const a of availabilities) availMap.set(new Date(a.date).toISOString().slice(0, 10), a);
  for (const d of needed) {
    const key = d.toISOString().slice(0, 10);
    const row = availMap.get(key);
    if (!row) return { ok: false, reason: `Missing availability for ${key}` };
    if (!row.isAvailable) return { ok: false, reason: `Date ${key} is not available` };
  }

  // CHECK: overlapping bookings (only PENDING/CONFIRMED block)
  const blockingStatuses = new Set(['PENDING', 'CONFIRMED']);
  const reqRange: DateRange = { checkIn, checkOut };
  for (const b of existingBookings) {
    if (!blockingStatuses.has(b.status)) continue;
    if (isOverlapping(reqRange, b)) return { ok: false, reason: `Overlaps existing booking ${b.status} ${b.checkIn.toISOString().slice(0, 10)} -> ${b.checkOut.toISOString().slice(0, 10)}` };
  }

  return { ok: true };
}

// ───────────────── reserve (transaction pattern) ─────────────────

/**
 * Transactional reserve pattern — use with Prisma $transaction.
 *
 * ```ts
 * await prisma.$transaction(async (tx) => {
 *   const unit = await tx.unit.findUnique({ where: { id: unitId } });
 *   const availabilities = await tx.availability.findMany({ where: { unitId, date: { gte: checkIn, lt: checkOut } } });
 *   const existing = await tx.booking.findMany({ where: { unitId, status: { in: ['PENDING','CONFIRMED'] } } });
 *   const check = canBook({ unit, checkIn, checkOut, guests, availabilities, existingBookings: existing });
 *   if (!check.ok) throw new Error(check.reason);
 *   const total = calculateTotalPrice(checkIn, checkOut, Number(unit.basePrice), availabilities);
 *   // Optional: SELECT ... FOR UPDATE or advisory lock if exclusion constraint not available
 *   return tx.booking.create({ data: { userId, unitId, checkIn, checkOut, guests, currency: 'CDF', totalPrice: total, status: 'PENDING' } });
 * }, { isolationLevel: 'Serializable' });
 * ```
 *
 * DB-level safety: migration adds EXCLUDE USING gist (unitId WITH =, daterange(checkIn, checkOut) WITH &&)
 * WHERE (status IN ('PENDING','CONFIRMED')) when btree_gist is available. If not, this app guard is the fallback
 * and Serializable isolation reduces race window.
 */
export const RESERVE_TRANSACTION_COMMENT = 'Use Serializable isolation + canBook guard; rely on DB EXCLUDE when available';

/**
 * Minimal idempotency helper for payments
 */
export function paymentIdempotencyKey(bookingId: string, attempt: number | string): string {
  return `idem-${bookingId.slice(0, 8)}-${attempt}`;
}
