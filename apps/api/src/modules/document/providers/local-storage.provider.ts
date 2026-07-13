import { Injectable } from '@nestjs/common';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(fileBuffer: Buffer, filePath: string, mimeType: string): Promise<string> {
    const fullPath = path.join(this.uploadDir, filePath);
    const parentDir = path.dirname(fullPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, fileBuffer);
    return filePath; // Use relative path as storageUrl key
  }

  async downloadFile(storageUrl: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, storageUrl);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found at path: ${storageUrl}`);
    }
    return fs.promises.readFile(fullPath);
  }

  async generatePresignedUrl(storageUrl: string, expirySeconds: number): Promise<string> {
    // Return mock secure url with relative path and dummy signature token
    const mockHost = 'http://localhost:3000';
    return `${mockHost}/uploads/${storageUrl}?expiresIn=${expirySeconds}&signature=mock-sig-${Date.now()}`;
  }

  async deleteFile(storageUrl: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, storageUrl);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }
}
