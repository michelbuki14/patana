import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('payments')
  create(@Body() dto: CreatePaymentDto) {
    return this.checkout.createPayment(dto);
  }

  @Get('payments')
  list(@Query('bookingId') bookingId: string) {
    return this.checkout.listPayments(bookingId);
  }

  @Get('payments/:id')
  getOne(@Param('id') id: string) {
    return this.checkout.getPayment(id);
  }

  @Post('payments/:id/confirm')
  confirm(@Param('id') id: string, @Body() body: { status?: string; providerRef?: string }) {
    return this.checkout.confirmPayment(id, body);
  }
}
