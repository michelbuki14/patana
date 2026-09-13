import { PrismaClient, UserRole, OwnerStatus, PropertyType, UnitStatus, BookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Patana booking DB...');

  // Clean in FK order
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.user.deleteMany();

  // 3 users (one will be owner)
  const alice = await prisma.user.create({
    data: {
      email: 'alice@patana.cd',
      name: 'Alice Owner',
      phone: '+243810000001',
      role: UserRole.OWNER,
    },
  });
  const bob = await prisma.user.create({
    data: {
      email: 'bob@patana.cd',
      name: 'Bob Guest',
      phone: '+243810000002',
      role: UserRole.GUEST,
    },
  });
  const carol = await prisma.user.create({
    data: {
      email: 'carol@patana.cd',
      name: 'Carol Guest',
      phone: '+243810000003',
      role: UserRole.GUEST,
    },
  });
  console.log(`Users: ${alice.email}, ${bob.email}, ${carol.email}`);

  const owner = await prisma.owner.create({
    data: {
      userId: alice.id,
      status: OwnerStatus.VERIFIED,
    },
  });
  console.log(`Owner: ${owner.id} -> user ${alice.id}`);

  // 2 properties: 1 hotel with 3 units, 1 apartment with 1 unit
  const hotel = await prisma.property.create({
    data: {
      ownerId: owner.id,
      title: 'Patana Grand Hotel',
      description: 'Boutique hotel in Kinshasa centre',
      propertyType: PropertyType.HOTEL,
      address: '123 Avenue Lumumba',
      city: 'Kinshasa',
      country: 'CD',
    },
  });

  const apartment = await prisma.property.create({
    data: {
      ownerId: owner.id,
      title: 'Patana Riverside Apartment',
      description: 'Modern apartment with river view',
      propertyType: PropertyType.APARTMENT,
      address: '456 Boulevard du Fleuve',
      city: 'Kinshasa',
      country: 'CD',
    },
  });
  console.log(`Properties: ${hotel.title}, ${apartment.title}`);

  const unitA1 = await prisma.unit.create({
    data: {
      propertyId: hotel.id,
      title: 'Deluxe Room 101',
      description: 'King bed, city view',
      capacity: 2,
      basePrice: 85000,
      status: UnitStatus.ACTIVE,
    },
  });
  const unitA2 = await prisma.unit.create({
    data: {
      propertyId: hotel.id,
      title: 'Deluxe Room 102',
      description: 'Twin beds, balcony',
      capacity: 2,
      basePrice: 85000,
      status: UnitStatus.ACTIVE,
    },
  });
  const unitA3 = await prisma.unit.create({
    data: {
      propertyId: hotel.id,
      title: 'Suite 201',
      description: 'Suite with living room',
      capacity: 4,
      basePrice: 150000,
      status: UnitStatus.ACTIVE,
    },
  });
  const unitB1 = await prisma.unit.create({
    data: {
      propertyId: apartment.id,
      title: 'Apartment 1 - Entire place',
      description: '2BR apartment, fully equipped',
      capacity: 4,
      basePrice: 120000,
      status: UnitStatus.ACTIVE,
    },
  });
  console.log(`Units: ${unitA1.title}, ${unitA2.title}, ${unitA3.title}, ${unitB1.title}`);

  // 14 days availability per unit starting tomorrow
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1); // tomorrow

  const units = [unitA1, unitA2, unitA3, unitB1];
  let availCount = 0;
  for (const unit of units) {
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      // Weekend override example: +10% on Sat/Sun (day 0 Sun, 6 Sat)
      const day = d.getDay();
      const isWeekend = day === 0 || day === 6;
      // Make one unit unavailable on a single date to test canBook
      const isBlocked = unit.id === unitA2.id && i === 5;
      await prisma.availability.create({
        data: {
          unitId: unit.id,
          date: d,
          priceOverride: isWeekend ? Number(unit.basePrice) * 1.1 : null,
          isAvailable: !isBlocked,
        },
      });
      availCount++;
    }
  }
  console.log(`Availabilities: ${availCount} rows (14 * 4)`);

  // 2 bookings: one CONFIRMED+paid, one PENDING
  // Booking 1: Bob books unitA1 for 2 nights (day 1 -> day 3)
  const checkIn1 = new Date(start);
  const checkOut1 = new Date(start);
  checkOut1.setDate(start.getDate() + 2);
  // calculate 2 nights * base 85000 = 170000 (start is weekday assumed, but we use overrides if weekend)
  const booking1 = await prisma.booking.create({
    data: {
      userId: bob.id,
      unitId: unitA1.id,
      checkIn: checkIn1,
      checkOut: checkOut1,
      guests: 2,
      status: BookingStatus.CONFIRMED,
      currency: 'CDF',
      totalPrice: 170000,
    },
  });

  // Booking 2: Carol books unitB1 for 3 nights (day 4 -> day 7) pending
  const checkIn2 = new Date(start);
  checkIn2.setDate(start.getDate() + 4);
  const checkOut2 = new Date(start);
  checkOut2.setDate(start.getDate() + 7);
  const booking2 = await prisma.booking.create({
    data: {
      userId: carol.id,
      unitId: unitB1.id,
      checkIn: checkIn2,
      checkOut: checkOut2,
      guests: 3,
      status: BookingStatus.PENDING,
      currency: 'CDF',
      totalPrice: 360000, // 3 * 120000
    },
  });
  console.log(`Bookings: ${booking1.id} CONFIRMED, ${booking2.id} PENDING`);

  // 2 payments
  const payment1 = await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      amount: 170000,
      currency: 'CDF',
      method: PaymentMethod.CARD,
      status: PaymentStatus.SUCCEEDED,
      idempotencyKey: 'idem-' + booking1.id.slice(0, 8) + '-pay1',
      providerRef: 'prov_ref_succeeded_001',
    },
  });
  const payment2 = await prisma.payment.create({
    data: {
      bookingId: booking2.id,
      amount: 360000,
      currency: 'CDF',
      method: PaymentMethod.MOBILE_MONEY,
      status: PaymentStatus.PENDING,
      idempotencyKey: 'idem-' + booking2.id.slice(0, 8) + '-pay2',
      providerRef: null,
    },
  });
  console.log(`Payments: ${payment1.id} SUCCEEDED, ${payment2.id} PENDING`);

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
