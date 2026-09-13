import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogService {
  // In production these delegate to Prisma (catalog schema: Owner, Property, Unit)
  // Stubs kept buildable without DB; replace with PrismaClient injection.
  async listProperties(query: { city?: string; type?: string; ownerId?: string }): Promise<unknown[]> {
    return [{ message: 'catalog.listProperties stub', query }];
  }
  async getProperty(id: string): Promise<unknown> {
    return { id, title: 'Patana Grand Hotel (stub)', propertyType: 'HOTEL' };
  }
  async createProperty(dto: unknown): Promise<unknown> {
    return { id: 'stub-uuid', ...(dto as object) };
  }
  async listUnits(propertyId: string, query: { status?: string; minCapacity?: number }): Promise<unknown[]> {
    return [{ propertyId, query, units: [] }];
  }
  async getUnit(id: string): Promise<unknown> {
    return { id, title: 'Deluxe Room 101 (stub)', capacity: 2, basePrice: '85000' };
  }
  async searchUnits(params: { city?: string; guests?: number; from?: string; to?: string }): Promise<unknown[]> {
    // Delegates to booking availability check for date range; here just catalog filter stub
    return [{ params, note: 'searchUnits stub — filter by city/capacity then join availability' }];
  }
  async listOwners(): Promise<unknown[]> { return []; }
  async getOwner(id: string): Promise<unknown> { return { id }; }
}
