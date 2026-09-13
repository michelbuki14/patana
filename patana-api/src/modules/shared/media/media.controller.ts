import { Controller, Post, Body } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post('presign')
  presign(@Body() dto: { key: string }){ return this.media.presignUpload(dto.key); }
}
