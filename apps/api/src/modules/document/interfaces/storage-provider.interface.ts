export interface StorageProvider {
  /**
   * Uploads raw buffer file to the target path and returns the resolved storageUrl.
   */
  uploadFile(fileBuffer: Buffer, path: string, mimeType: string): Promise<string>;

  /**
   * Downloads raw buffer content from the given storageUrl.
   */
  downloadFile(storageUrl: string): Promise<Buffer>;

  /**
   * Generates a secure, temporary pre-signed URL for direct browser access.
   */
  generatePresignedUrl(storageUrl: string, expirySeconds: number): Promise<string>;

  /**
   * Permanently deletes physical files from the storage engine.
   */
  deleteFile(storageUrl: string): Promise<void>;
}
