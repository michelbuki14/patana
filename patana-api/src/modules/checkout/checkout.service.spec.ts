import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../shared/prisma/prisma.service';
import { EventBusService } from '../shared/event-bus/event-bus.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prisma: { payment: Record<string, jest.Mock>; booking: Record<string, jest.Mock> };
  let bus: { emitEvent: jest.Mock };

  beforeEach(async () => {
    prisma = {
      payment: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      booking: { update: jest.fn() },
    };
    bus = { emitEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventBusService, useValue: bus },
      ],
    }).compile();
    service = module.get(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createPayment returns existing payment on idempotency replay', async () => {
    const existing = { id: 'p-1', bookingId: 'b-1', idempotencyKey: 'idem-1', status: 'PENDING' };
    prisma.payment.findUnique.mockResolvedValue(existing);

    const result = await service.createPayment({
      bookingId: 'b-1',
      amount: 85000,
      idempotencyKey: 'idem-1',
    });

    expect(result).toEqual(existing);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('createPayment creates a PENDING payment', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.payment.create.mockResolvedValue({ id: 'p-2', status: 'PENDING' });

    const result = await service.createPayment({ bookingId: 'b-1', amount: 85000 });
    expect(result.status).toBe('PENDING');
  });

  it('confirmPayment confirms booking and emits events on success', async () => {
    prisma.payment.update.mockResolvedValue({ id: 'p-1', bookingId: 'b-1', status: 'SUCCEEDED' });
    prisma.booking.update.mockResolvedValue({ id: 'b-1', status: 'CONFIRMED' });

    await service.confirmPayment('p-1', { status: 'SUCCEEDED' });

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'b-1' },
      data: { status: 'CONFIRMED' },
    });
    expect(bus.emitEvent).toHaveBeenCalledWith('payment.succeeded', expect.anything());
    expect(bus.emitEvent).toHaveBeenCalledWith('booking.confirmed', { bookingId: 'b-1' });
  });
});
