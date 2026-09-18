import { Test, TestingModule } from '@nestjs/testing';
import { BookingModule } from '../src/modules/booking/booking.module';

describe('BookingModule', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [BookingModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
