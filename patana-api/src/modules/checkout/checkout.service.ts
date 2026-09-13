import { Injectable } from '@nestjs/common';

@Injectable()
export class CheckoutService {
  // checkout schema: Payment — idempotencyKey @unique
  async createPayment(dto: { bookingId: string; amount: string; currency?: string; method: string; idempotencyKey?: string }): Promise<unknown> {
    // Real impl: findUnique by idempotencyKey -> return existing if same payload else 409; else create PENDING and call provider
    if (dto.idempotencyKey) {
      // stub idempotency check
    }
    return { id: 'stub-payment-id', ...dto, status: 'PENDING', currency: dto.currency ?? 'CDF' };
  }
  async listPayments(bookingId?: string): Promise<unknown[]> {
    return [{ bookingId, payments: [] }];
  }
  async getPayment(id: string): Promise<unknown> { return { id, status: 'PENDING' }; }
  async confirmPayment(id: string, body: { status: string; providerRef?: string }): Promise<unknown> {
    // On SUCCEEDED -> emit booking.confirmed via EventBus, transition Booking PENDING->CONFIRMED transactionally
    return { id, ...body };
  }
}
