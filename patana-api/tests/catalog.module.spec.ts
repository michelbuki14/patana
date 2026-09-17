import { Test, TestingModule } from '@nestjs/testing';
import { CatalogModule } from '../src/modules/catalog/catalog.module';

describe('CatalogModule', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CatalogModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
