export class CreatePropertyDto {
  title!: string;
  description?: string;
  propertyType!: string;
  address!: string;
  city!: string;
  country!: string;
  ownerId!: string;
}

export class UpdatePropertyDto {
  title?: string;
  description?: string;
  city?: string;
}

export class CreateUnitDto {
  propertyId!: string;
  title!: string;
  description?: string;
  capacity!: number;
  basePrice!: number;
  status?: string;
}
