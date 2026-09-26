import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export type AppEvent =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'media.uploaded';

@Injectable()
export class EventBusService extends EventEmitter {
  emitEvent(event: AppEvent, payload: unknown): boolean {
    this.emit(event, payload);
    return true;
  }

  onEvent(event: AppEvent, handler: (payload: unknown) => void): void {
    this.on(event, handler);
  }
}
