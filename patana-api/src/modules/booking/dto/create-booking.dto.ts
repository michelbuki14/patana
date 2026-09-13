export class CreateBookingDto {
  unitId!: string;
  checkIn!: string; // YYYY-MM-DD
  checkOut!: string;
  guests!: number;
  currency?: string;
}
export class AvailabilityQueryDto { from!: string; to!: string; }
export class UpsertAvailabilityDto {
  days!: { date: string; isAvailable: boolean; priceOverride?: string | null }[];
}
