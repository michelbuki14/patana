import { Test, TestingModule } from '@nestjs/testing';
import { BookingService, canBook, calculateTotalPrice, nightsBetween, isOverlapping } from './booking.service';
import { PrismaService } from '../shared/prisma/prisma.service';
import { EventBusService } from '../shared/event-bus/event-bus.service';

describe('booking date helpers', () => {
  it('nightsBetween counts nights', () => {
    expect(nightsBetween(new Date('2026-10-01'), new Date('2026-10-03'))).toBe(2);
  });

  it('isOverlapping detects overlap with exclusive checkout', () => {
    const a = { checkIn: new Date('2026-10-01'), checkOut: new Date('2026-10-03') };
    expect(isOverlapping(a, { checkIn: new Date('2026-10-02'), checkOut: new Date('2026-10-04') })).toBe(true);
    expect(isOverlapping(a, { checkIn: new Date('2026-10-03'), checkOut: new Date('2026-10-05') })).toBe(false);
  });

  it('calculateTotalPrice sums nightly prices with overrides', () => {
    const total = calculateTotalPrice(
      new Date('2026-10-01'),
      new Date('2026-10-03'),
      100,
      [
        { date: new Date('2026-10-01') },
        { date: new Date('2026-10-02'), priceOverride: 150 },
      ],
    );
    expect(total).toBe(250);
  });

  it('calculateTotalPrice throws on missing availability', () => {
    expect(() =>
      calculateTotalPrice(new Date('2026-10-01'), new Date('2026-10-03'), 100, []),
    ).toThrow('Missing availability');
  });
});

describe('canBook', () => {
  const base = {
    unit: { capacity: 2, status: 'ACTIVE' },
    checkIn: new Date('2026-10-01'),
    checkOut: new Date('2026-10-03'),
    guests: 1,
    availabilities: [
      { date: new Date('2026-10-01'), isAvailable: true },
      { date: new Date('2026-10-02'), isAvailable: true },
    ],
    existingBookings: [],
  };

  it('accepts a valid booking', () => {
    expect(canBook(base).ok).toBe(true);
  });

  it('rejects unavailable dates', () => {
    const check = canBook({
      ...base,
      availabilities: [
        { date: new Date('2026-10-01'), isAvailable: true },
        { date: new Date('2026-10-02'), isAvailable: false },
      ],
    });
    expect(check.ok).toBe(false);
  });

  it('rejects guests exceeding capacity', () => {
    const check = canBook({ ...base, guests: 5 });
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('guests');
  });

  it('rejects overlapping bookings', () => {
    const check = canBook({
      ...base,
      existingBookings: [
        { status: 'CONFIRMED', checkIn: new Date('2026-10-02'), checkOut: new Date('2026-10-04') },
      ],
    });
    expect(check.ok).toBe(false);
  });

  it('ignores cancelled bookings', () => {
    const check = canBook({
      ...base,
      existingBookings: [
        { status: 'CANCELLED', checkIn: new Date('2026-10-02'), checkOut: new Date('2026-10-04') },
      ],
    });
    expect(check.ok).toBe(true);
  });
});

describe('BookingService', () => {
  let service: BookingService;
  let prisma: {
    unit: Record<string, jest.Mock>;
    availability: Record<string, jest.Mock>;
    booking: Record<string, jest.Mock>;
  };
  let bus: { emitEvent: jest.Mock };

  beforeEach(async () => {
    prisma = {
      unit: { findUnique: jest.fn() },
      availability: { findMany: jest.fn(), upsert: jest.fn() },
      booking: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    };
    bus = { emitEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventBusService, useValue: bus },
      ],
    }).compile();
    service = module.get(BookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createBooking creates a PENDING booking and emits event', async () => {
    prisma.unit.findUnique.mockResolvedValue({ id: 'unit-1', capacity: 2, status: 'ACTIVE', basePrice: 100 });
    prisma.availability.findMany.mockResolvedValue([
      { date: new Date('2026-10-01'), priceOverride: null, isAvailable: true },
      { date: new Date('2026-10-02'), priceOverride: null, isAvailable: true },
    ]);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.create.mockResolvedValue({ id: 'b-1', status: 'PENDING', totalPrice: 200 });

    const result = await service.createBooking({
      unitId: 'unit-1',
      checkIn: '2026-10-01',
      checkOut: '2026-10-03',
      guests: 1,
      userId: 'u-1',
    });

    expect(result.status).toBe('PENDING');
    expect(bus.emitEvent).toHaveBeenCalledWith('booking.created', expect.anything());
  });

  it('createBooking rejects when unit missing', async () => {
    prisma.unit.findUnique.mockResolvedValue(null);
    await expect(
      service.createBooking({ unitId: 'nope', checkIn: '2026-10-01', checkOut: '2026-10-03', guests: 1 }),
    ).rejects.toThrow('not found');
  });

  it('getAvailability returns days for a unit', async () => {
    prisma.availability.findMany.mockResolvedValue([]);
    const result = await service.getAvailability('unit-1', '2026-10-01', '2026-10-05');
    expect(result.unitId).toBe('unit-1');
    expect(result.days).toEqual([]);
  });
});
