import { z } from 'zod';

export const createPropertySchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional().nullable(),
  propertyType: z.enum(['HOTEL','APARTMENT']),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().length(2).default('CD'),
  ownerId: z.string().uuid(),
});
export type CreatePropertyInput = any;

export const createUnitSchema = z.object({
  propertyId: z.string().uuid(),
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  capacity: z.number().int().positive().max(20),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  status: z.enum(['ACTIVE','INACTIVE','MAINTENANCE']).default('ACTIVE'),
});
export type CreateUnitInput = any;

export const searchQuerySchema = z.object({
  city: z.string().optional(),
  guests: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  propertyType: z.enum(['HOTEL','APARTMENT']).optional(),
});

export const createBookingSchema = z.object({
  unitId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().positive().max(20),
  currency: z.string().length(3).default('CDF'),
}).refine((v: any)=> v.checkOut > v.checkIn, { message:'checkOut must be after checkIn', path:['checkOut'] });
export type CreateBookingInput = any;

export const createPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default('CDF'),
  method: z.enum(['CARD','MOBILE_MONEY','BANK_TRANSFER','CASH']),
  idempotencyKey: z.string().uuid().optional(),
});
export type CreatePaymentInput = any;

export const availabilityUpsertSchema = z.object({
  days: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isAvailable: z.boolean(),
    priceOverride: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  })).min(1).max(365),
});
