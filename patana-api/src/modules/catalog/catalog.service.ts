import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProperties(query: { city?: string; type?: string; ownerId?: string }) {
    const where: Record<string, unknown> = {};
    if (query.city) where.city = query.city;
    if (query.type) where.propertyType = query.type;
    if (query.ownerId) where.ownerId = query.ownerId;

    return this.prisma.property.findMany({ where, include: { owner: true } });
  }

  async getProperty(id: string) {
    return this.prisma.property.findUnique({ where: { id }, include: { owner: true } });
  }

  async createProperty(dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        title: dto.title,
        description: dto.description,
        propertyType: dto.propertyType,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        ownerId: dto.ownerId,
      },
    });
  }

  async listUnits(propertyId: string, query?: { status?: string; minCapacity?: number }) {
    const where: Record<string, unknown> = { propertyId };
    if (query?.status) where.status = query.status;
    if (query?.minCapacity) where.capacity = { gte: query.minCapacity };

    return this.prisma.unit.findMany({ where });
  }

  async getUnit(id: string) {
    return this.prisma.unit.findUnique({ where: { id } });
  }

  async searchUnits(params: { city?: string; guests?: number; from?: string; to?: string }) {
    const where: Record<string, unknown> = {};
    if (params.city) where.property = { city: params.city };
    if (params.guests) where.capacity = { gte: params.guests };

    const units = await this.prisma.unit.findMany({
      where,
      include: { property: true, availabilities: true },
    });

    if (params.from && params.to) {
      const fromDate = new Date(params.from);
      const toDate = new Date(params.to);
      return units.filter(
        (unit: { availabilities: Array<{ date: Date; isAvailable: boolean }> }) =>
          unit.availabilities.every(
            (a: { date: Date; isAvailable: boolean }) => a.date >= fromDate && a.date <= toDate && a.isAvailable,
          ),
      );
    }

    return units;
  }

  async listOwners() {
    return this.prisma.owner.findMany();
  }

  async getOwner(id: string) {
    return this.prisma.owner.findUnique({ where: { id } });
  }
}
