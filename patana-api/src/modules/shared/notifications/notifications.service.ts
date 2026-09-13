import { Injectable } from '@nestjs/common';
import { EventBusService } from '../event-bus/event-bus.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly bus: EventBusService){
    this.bus.onEvent('booking.confirmed', (p)=> this.sendBookingConfirmed(p));
    this.bus.onEvent('payment.succeeded', (p)=> this.sendPaymentSucceeded(p));
  }
  async sendBookingConfirmed(payload: unknown){ return { sent: 'booking.confirmed', payload }; }
  async sendPaymentSucceeded(payload: unknown){ return { sent: 'payment.succeeded', payload }; }
}
