import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../shared/prisma/prisma.service';

describe('CatalogService', () => {
  let service: CatalogService;
  let prisma: { property: Record<string, jest.Mock>; unit: Record<string, jest.Mock>; owner: Record<string, jest.Mock> };

  beforeEach(async () => {
    prisma = {
      property: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
      unit: { findMany: jest.fn(), findUnique: jest.fn() },
      owner: { findMany: jest.fn(), findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('listProperties passes filters to prisma', async () => {
    prisma.property.findMany.mockResolvedValue([]);
    const result = await service.listProperties({ city: 'Kinshasa' });
    expect(Array.isArray(result)).toBe(true);
    expect(prisma.property.findMany).toHaveBeenCalledWith({
      where: { city: 'Kinshasa' },
      include: { owner: true },
    });
  });

  it('createProperty creates a property', async () => {
    const dto = {
      title: 'Test Property',
      description: 'Test desc',
      propertyType: 'HOTEL',
      address: '123 Test St',
      city: 'Test City',
      country: 'Test Country',
      ownerId: 'owner-1',
    };
    prisma.property.create.mockResolvedValue({ id: 'prop-1', ...dto });
    const result = await service.createProperty(dto);
    expect(result.title).toBe('Test Property');
  });

  it('listUnits filters by property and capacity', async () => {
    prisma.unit.findMany.mockResolvedValue([]);
    await service.listUnits('prop-1', { status: 'ACTIVE', minCapacity: 2 });
    expect(prisma.unit.findMany).toHaveBeenCalledWith({
      where: { propertyId: 'prop-1', status: 'ACTIVE', capacity: { gte: 2 } },
    });
  });

  it('getUnit returns a unit by id', async () => {
    prisma.unit.findUnique.mockResolvedValue({ id: 'unit-1' });
    const result = await service.getUnit('unit-1');
    expect(result).toEqual({ id: 'unit-1' });
  });

  it('listOwners returns owners', async () => {
    prisma.owner.findMany.mockResolvedValue([{ id: 'owner-1' }]);
    const result = await service.listOwners();
    expect(result).toEqual([{ id: 'owner-1' }]);
  });

  it('getOwner returns an owner by id', async () => {
    prisma.owner.findUnique.mockResolvedValue({ id: 'owner-1' });
    const result = await service.getOwner('owner-1');
    expect(result).toEqual({ id: 'owner-1' });
  });
});
