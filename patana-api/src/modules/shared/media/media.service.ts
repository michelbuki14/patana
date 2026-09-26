import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaService {
  endpoint = process.env.GARAGE_S3_ENDPOINT ?? 'http://localhost:3900';
  cdn = process.env.CDN_URL ?? 'https://cdn.patana.cd';
  bucket = process.env.GARAGE_S3_BUCKET ?? 'patana-media';

  getUploadUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  getCdnUrl(key: string): string {
    return `${this.cdn}/${key}`;
  }

  async presignUpload(key: string) {
    return { uploadUrl: this.getUploadUrl(key), cdnUrl: this.getCdnUrl(key) };
  }
}
