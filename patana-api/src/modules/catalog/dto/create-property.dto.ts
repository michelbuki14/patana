export class CreatePropertyDto {
  title!: string;
  description?: string | null;
  propertyType!: 'HOTEL' | 'APARTMENT';
  address?: string | null;
  city?: string | null;
  country?: string;
  ownerId!: string;
}
export class UpdatePropertyDto { title?: string; description?: string | null; city?: string | null; }
export class CreateUnitDto {
  propertyId!: string;
  title!: string;
  description?: string | null;
  capacity!: number;
  basePrice!: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}
