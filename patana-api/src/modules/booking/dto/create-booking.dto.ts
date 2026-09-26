export class CreateBookingDto {
  unitId!: string;
  checkIn!: string;
  checkOut!: string;
  guests!: number;
  userId?: string;
  currency?: string;
}

export class AvailabilityQueryDto {
  from!: string;
  to!: string;
}

export class UpsertAvailabilityDto {
  days!: Array<{ date: string; priceOverride?: number; isAvailable?: boolean }>;
}
