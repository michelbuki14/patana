import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('properties')
  listProperties(@Query('city') city?: string, @Query('type') type?: string, @Query('ownerId') ownerId?: string){
    return this.catalog.listProperties({ city, type, ownerId });
  }
  @Get('properties/:id')
  getProperty(@Param('id') id: string){ return this.catalog.getProperty(id); }

  @Post('properties')
  createProperty(@Body() dto: unknown){ return this.catalog.createProperty(dto); }

  @Get('properties/:propertyId/units')
  listUnits(@Param('propertyId') propertyId: string, @Query('status') status?: string, @Query('minCapacity') minCapacity?: string){
    return this.catalog.listUnits(propertyId, { status, minCapacity: minCapacity ? Number(minCapacity) : undefined });
  }
  @Get('units/:id')
  getUnit(@Param('id') id: string){ return this.catalog.getUnit(id); }

  @Get('units')
  searchUnits(@Query('city') city?: string, @Query('guests') guests?: string, @Query('from') from?: string, @Query('to') to?: string){
    return this.catalog.searchUnits({ city, guests: guests? Number(guests): undefined, from, to });
  }

  @Get('owners')
  listOwners(){ return this.catalog.listOwners(); }
  @Get('owners/:id')
  getOwner(@Param('id') id: string){ return this.catalog.getOwner(id); }
}
