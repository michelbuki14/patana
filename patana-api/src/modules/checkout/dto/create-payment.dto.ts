export class CreatePaymentDto {
  bookingId!: string;
  amount!: number;
  currency?: string;
  method?: string;
  idempotencyKey?: string;
}

export class ConfirmPaymentDto {
  status?: string;
  providerRef?: string;
}
