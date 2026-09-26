import { Injectable } from '@nestjs/common';
import { EventBusService } from '../event-bus/event-bus.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly bus: EventBusService) {
    this.bus.onEvent('booking.confirmed', (payload) => this.sendBookingConfirmed(payload));
    this.bus.onEvent('payment.succeeded', (payload) => this.sendPaymentSucceeded(payload));
  }

  async sendBookingConfirmed(payload: unknown) {
    return { sent: 'booking.confirmed', payload };
  }

  async sendPaymentSucceeded(payload: unknown) {
    return { sent: 'payment.succeeded', payload };
  }
}
