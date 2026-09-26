import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { EventBusService } from '../shared/event-bus/event-bus.service';

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function isOverlapping(a: { checkIn: Date; checkOut: Date }, b: { checkIn: Date; checkOut: Date }): boolean {
  return a.checkIn < b.checkOut && b.checkIn < a.checkOut;
}

export function datesInRange(checkIn: Date, checkOut: Date): Date[] {
  const nights = nightsBetween(checkIn, checkOut);
  const dates: Date[] = [];
  for (let i = 0; i < nights; i++) {
    const d = new Date(checkIn);
    d.setDate(checkIn.getDate() + i);
    d.setUTCHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

export function calculateTotalPrice(checkIn: Date, checkOut: Date, basePrice: number, availabilities: Array<{ date: Date; priceOverride?: number | null }>): number {
  if (checkOut <= checkIn) throw new Error('checkOut must be after checkIn');
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) throw new Error('Booking must be at least 1 night');

  const map = new Map<string, typeof availabilities[0]>();
  for (const a of availabilities) {
    map.set(a.date.toISOString().slice(0, 10), a);
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

export interface CanBookInput {
  unit: { capacity: number; status: string };
  checkIn: Date;
  checkOut: Date;
  guests: number;
  availabilities: Array<{ date: Date; isAvailable: boolean }>;
  existingBookings: Array<{ status: string; checkIn: Date; checkOut: Date }>;
}

export function canBook(input: CanBookInput): { ok: boolean; reason?: string } {
  const { unit, checkIn, checkOut, guests, availabilities, existingBookings } = input;

  if (!(checkIn instanceof Date) || !(checkOut instanceof Date)) return { ok: false, reason: 'Invalid dates' };
  if (checkOut <= checkIn) return { ok: false, reason: 'checkOut must be after checkIn' };
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) return { ok: false, reason: 'At least 1 night required' };
  if (nights > 365) return { ok: false, reason: 'Booking too long (max 365 nights)' };
  if (!Number.isInteger(guests) || guests <= 0) return { ok: false, reason: 'guests must be positive integer' };
  if (guests > unit.capacity) return { ok: false, reason: `guests (${guests}) exceeds capacity (${unit.capacity})` };
  if (unit.status !== 'ACTIVE') return { ok: false, reason: `Unit not active (status=${unit.status})` };
  if (availabilities.length < nights) return { ok: false, reason: 'Incomplete availability window' };

  const availMap = new Map<string, typeof availabilities[0]>();
  for (const a of availabilities) availMap.set(a.date.toISOString().slice(0, 10), a);
  for (const d of datesInRange(checkIn, checkOut)) {
    const row = availMap.get(d.toISOString().slice(0, 10));
    if (!row) return { ok: false, reason: `Missing availability for ${d.toISOString().slice(0, 10)}` };
    if (!row.isAvailable) return { ok: false, reason: `Date ${d.toISOString().slice(0, 10)} is not available` };
  }

  const blockingStatuses = new Set(['PENDING', 'CONFIRMED']);
  const reqRange = { checkIn, checkOut };
  for (const b of existingBookings) {
    if (!blockingStatuses.has(b.status)) continue;
    if (isOverlapping(reqRange, b)) return { ok: false, reason: `Overlaps existing booking ${b.status}` };
  }

  return { ok: true };
}

export function paymentIdempotencyKey(bookingId: string, attempt: number): string {
  return `idem-${bookingId.slice(0, 8)}-${attempt}`;
}

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async listBookings(query: { userId?: string; unitId?: string; status?: string }) {
    const where: Record<string, unknown> = {};
    if (query.userId) where.userId = query.userId;
    if (query.unitId) where.unitId = query.unitId;
    if (query.status) where.status = query.status;
    return this.prisma.booking.findMany({ where, include: { unit: true } });
  }

  async getBooking(id: string) {
    return this.prisma.booking.findUnique({ where: { id }, include: { unit: true } });
  }

  async createBooking(dto: CreateBookingDto) {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut <= checkIn) throw new Error('checkOut must be after checkIn');

    const unit = await this.prisma.unit.findUnique({ where: { id: dto.unitId } });
    if (!unit) throw new Error(`Unit ${dto.unitId} not found`);

    const availabilities = await this.prisma.availability.findMany({
      where: { unitId: dto.unitId, date: { gte: checkIn, lt: checkOut } },
    });

    const existingBookings = await this.prisma.booking.findMany({
      where: { unitId: dto.unitId, status: { in: ['PENDING', 'CONFIRMED'] } },
    });

    const check = canBook({ unit, checkIn, checkOut, guests: dto.guests, availabilities, existingBookings });
    if (!check.ok) throw new Error(check.reason);

    const totalPrice = calculateTotalPrice(checkIn, checkOut, unit.basePrice, availabilities);

    const booking = await this.prisma.booking.create({
      data: {
        unitId: dto.unitId,
        userId: dto.userId ?? 'unknown',
        checkIn,
        checkOut,
        guests: dto.guests,
        currency: dto.currency ?? 'CDF',
        totalPrice,
        status: 'PENDING',
      },
    });

    this.eventBus.emitEvent('booking.created', booking);

    return booking;
  }

  async getAvailability(unitId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { unitId };
    if (from && to) {
      where.date = { gte: new Date(from), lt: new Date(to) };
    }
    const days = await this.prisma.availability.findMany({ where });
    return { unitId, from, to, days };
  }

  async upsertAvailability(unitId: string, body: { days: Array<{ date: string; priceOverride?: number; isAvailable?: boolean }> }) {
    const results = [];
    for (const day of body.days) {
      const result = await this.prisma.availability.upsert({
        where: { unitId_date: { unitId, date: new Date(day.date) } },
        update: { priceOverride: day.priceOverride, isAvailable: day.isAvailable },
        create: { unitId, date: new Date(day.date), priceOverride: day.priceOverride, isAvailable: day.isAvailable },
      });
      results.push(result);
    }
    return { unitId, ...body };
  }
}
