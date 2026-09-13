export class CreatePaymentDto {
  bookingId!: string;
  amount!: string;
  currency?: string;
  method!: 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CASH';
  idempotencyKey?: string;
}
export class ConfirmPaymentDto { status!: 'SUCCEEDED' | 'FAILED' | 'REFUNDED'; providerRef?: string; }
