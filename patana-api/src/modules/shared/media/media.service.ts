import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaService {
  // Garage S3 + CDN — no DB table; keys stored as URLs on Property/Unit if needed
  private endpoint = process.env.GARAGE_S3_ENDPOINT ?? 'http://localhost:3900';
  private cdn = process.env.CDN_URL ?? 'https://cdn.patana.cd';
  getUploadUrl(key: string): string { return `${this.endpoint}/${process.env.GARAGE_S3_BUCKET ?? 'patana-media'}/${key}`; }
  getCdnUrl(key: string): string { return `${this.cdn}/${key}`; }
  async presignUpload(key: string): Promise<{ uploadUrl: string; cdnUrl: string }> {
    return { uploadUrl: this.getUploadUrl(key), cdnUrl: this.getCdnUrl(key) };
  }
}
