// src/services/cloudinaryService.ts
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { logger } from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a file to Cloudinary
 * @param buffer - File buffer
 * @param fileName - Original file name
 * @param folder - Cloudinary folder to upload to
 * @returns Promise with upload result
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  fileName: string,
  folder: string = 'business_documents'
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: fileName,
        resource_type: 'auto',
        overwrite: false,
        invalidate: true
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error', { error: error.message });
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id
          });
        } else {
          reject(new Error('Unknown error during Cloudinary upload'));
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Deletes a file from Cloudinary
 * @param publicId - Public ID of the file to delete
 * @returns Promise with deletion result
 */
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    logger.error('Cloudinary delete error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
};

/**
 * Validates if a file meets business document requirements
 * @param buffer - File buffer
 * @param mimeType - MIME type of the file
 * @param fileSize - Size of the file in bytes
 * @returns Validation result
 */
export const validateBusinessDocument = (
  buffer: Buffer,
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } => {
  // Check file type (must be PDF)
  if (mimeType !== 'application/pdf') {
    return {
      valid: false,
      error: 'Only PDF files are allowed for business documents'
    };
  }

  // Check file size (must not exceed 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (fileSize > maxSize) {
    return {
      valid: false,
      error: 'File size must not exceed 5MB'
    };
  }

  return { valid: true };
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  validateBusinessDocument
};