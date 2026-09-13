export type UserRole = 'GUEST'|'OWNER'|'ADMIN';
export type OwnerStatus = 'PENDING'|'VERIFIED'|'REJECTED'|'SUSPENDED';
export type PropertyType = 'HOTEL'|'APARTMENT';
export type UnitStatus = 'ACTIVE'|'INACTIVE'|'MAINTENANCE';
export type BookingStatus = 'PENDING'|'CONFIRMED'|'CANCELLED'|'COMPLETED'|'NO_SHOW';
export type PaymentStatus = 'PENDING'|'SUCCEEDED'|'FAILED'|'REFUNDED';
export type PaymentMethod = 'CARD'|'MOBILE_MONEY'|'BANK_TRANSFER'|'CASH';

export type User = { id:string; email:string; name:string; phone?:string|null; role:UserRole; createdAt:string; updatedAt:string; };
export type Owner = { id:string; userId:string; status:OwnerStatus };
export type Property = { id:string; ownerId:string; title:string; description?:string|null; propertyType:PropertyType; address?:string|null; city?:string|null; country:string; };
export type Unit = { id:string; propertyId:string; title:string; capacity:number; basePrice:string; status:UnitStatus };
export type Availability = { id:string; unitId:string; date:string; priceOverride?:string|null; isAvailable:boolean };
export type Booking = { id:string; userId:string; unitId:string; checkIn:string; checkOut:string; guests:number; status:BookingStatus; currency:string; totalPrice?:string|null };
export type Payment = { id:string; bookingId:string; amount:string; currency:string; method:PaymentMethod; status:PaymentStatus; idempotencyKey?:string|null; providerRef?:string|null };
