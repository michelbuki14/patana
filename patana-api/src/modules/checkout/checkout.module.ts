import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [SharedModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
