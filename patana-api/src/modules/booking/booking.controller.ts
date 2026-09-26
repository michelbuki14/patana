import { Controller, Get, Post, Put, Param, Query, Body, Headers } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto, UpsertAvailabilityDto } from './dto/create-booking.dto';

@Controller('booking')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Get('reservations')
  list(
    @Query('userId') userId?: string,
    @Query('unitId') unitId?: string,
    @Query('status') status?: string,
  ) {
    return this.booking.listBookings({ userId, unitId, status });
  }

  @Get('reservations/:id')
  getOne(@Param('id') id: string) {
    return this.booking.getBooking(id);
  }

  @Post('reservations')
  create(@Body() dto: CreateBookingDto, @Headers('idempotency-key') _key?: string) {
    return this.booking.createBooking(dto);
  }

  @Get('availability/:unitId')
  availability(
    @Param('unitId') unitId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.booking.getAvailability(unitId, from, to);
  }

  @Put('availability/:unitId')
  upsertAvailability(@Param('unitId') unitId: string, @Body() body: UpsertAvailabilityDto) {
    return this.booking.upsertAvailability(unitId, body);
  }
}
