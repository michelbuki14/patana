import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed — creating sample data...');

  let owner = await prisma.owner.findFirst({ where: { email: 'owner@example.com' } });
  if (!owner) {
    owner = await prisma.owner.create({
      data: { name: 'Sample Owner', email: 'owner@example.com', phone: '+24312345678' },
    });
  }

  let property = await prisma.property.findFirst({ where: { title: 'Patana Grand Hotel' } });
  if (!property) {
    property = await prisma.property.create({
      data: {
        title: 'Patana Grand Hotel',
        description: 'Luxury hotel in Kinshasa',
        propertyType: 'HOTEL',
        address: '123 Boulevard Lumumba',
        city: 'Kinshasa',
        country: 'DRC',
        ownerId: owner.id,
      },
    });
  }

  const existingUnit = await prisma.unit.findFirst({
    where: { propertyId: property.id, title: 'Deluxe Room 101' },
  });
  if (!existingUnit) {
    await prisma.unit.create({
      data: {
        propertyId: property.id,
        title: 'Deluxe Room 101',
        description: 'Spacious deluxe room',
        capacity: 2,
        basePrice: 85000,
        status: 'ACTIVE',
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
