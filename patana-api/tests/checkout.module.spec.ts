import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutModule } from '../src/modules/checkout/checkout.module';

describe('CheckoutModule', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CheckoutModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
