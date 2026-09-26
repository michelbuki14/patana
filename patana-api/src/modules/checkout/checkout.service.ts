import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EventBusService } from '../shared/event-bus/event-bus.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async createPayment(dto: CreatePaymentDto) {
    const idempotencyKey = dto.idempotencyKey ?? `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing && existing.bookingId === dto.bookingId) return existing;

    return this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        amount: dto.amount,
        currency: dto.currency ?? 'CDF',
        method: dto.method,
        idempotencyKey,
        status: 'PENDING',
      },
    });
  }

  async listPayments(bookingId: string) {
    return this.prisma.payment.findMany({ where: { bookingId } });
  }

  async getPayment(id: string) {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  async confirmPayment(id: string, body: { status?: string; providerRef?: string }) {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: { status: body.status ?? 'SUCCEEDED', providerRef: body.providerRef },
    });

    if (payment.status === 'SUCCEEDED') {
      this.eventBus.emitEvent('payment.succeeded', payment);

      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });

      this.eventBus.emitEvent('booking.confirmed', { bookingId: payment.bookingId });
    }

    return payment;
  }
}
