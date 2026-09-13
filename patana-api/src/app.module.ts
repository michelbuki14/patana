import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CatalogModule } from './modules/catalog/catalog.module';
import { BookingModule } from './modules/booking/booking.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { SharedModule } from './modules/shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SharedModule,
    CatalogModule,
    BookingModule,
    CheckoutModule,
  ],
})
export class AppModule {}
