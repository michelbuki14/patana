import { Controller, Get, Post, Param, Body, Query, Headers } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('payments')
  create(@Body() dto: { bookingId: string; amount: string; currency?: string; method: string }, @Headers('idempotency-key') idempotencyKey?: string){
    return this.checkout.createPayment({ ...dto, idempotencyKey });
  }
  @Get('payments')
  list(@Query('bookingId') bookingId?: string){ return this.checkout.listPayments(bookingId); }

  @Get('payments/:id')
  getOne(@Param('id') id: string){ return this.checkout.getPayment(id); }

  @Post('payments/:id/confirm')
  confirm(@Param('id') id: string, @Body() body: { status: string; providerRef?: string }){
    return this.checkout.confirmPayment(id, body);
  }
}
