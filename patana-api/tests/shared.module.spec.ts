import { Test, TestingModule } from '@nestjs/testing';
import { SharedModule } from '../src/modules/shared/shared.module';

describe('SharedModule', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
