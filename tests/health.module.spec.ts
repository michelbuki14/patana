import { Test, TestingModule } from '@nestjs/testing';
import { HealthModule } from '../src/health/health.module';

describe('HealthModule', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
