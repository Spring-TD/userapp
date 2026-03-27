// src/services/spacesService.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

const region = process.env.DO_SPACES_REGION ?? '';
const endpoint = process.env.DO_SPACES_ENDPOINT ?? '';
const bucket = process.env.DO_SPACES_BUCKET ?? '';
const accessKeyId = process.env.DO_SPACES_ACCESS_KEY_ID ?? '';
const secretAccessKey = process.env.DO_SPACES_SECRET_ACCESS_KEY ?? '';
const cdnBaseUrl = process.env.DO_SPACES_CDN_URL ?? '';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    if (!region || !endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Spaces is not configured. Set DO_SPACES_REGION, DO_SPACES_ENDPOINT, DO_SPACES_BUCKET, DO_SPACES_ACCESS_KEY_ID, DO_SPACES_SECRET_ACCESS_KEY.'
      );
    }
    client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      forcePathStyle: false
    });
  }
  return client;
}

/**
 * Build the public URL for an object.
 * Uses DO_SPACES_CDN_URL if set (e.g. https://bucket.nyc3.cdn.digitaloceanspaces.com),
 * otherwise https://<bucket>.<region>.digitaloceanspaces.com/<key>
 */
export function getPublicUrl(key: string): string {
  if (cdnBaseUrl) {
    const base = cdnBaseUrl.replace(/\/$/, '');
    return `${base}/${key}`;
  }
  if (!bucket || !region) {
    throw new Error('Spaces bucket/region not configured');
  }
  return `https://${bucket}.${region}.digitaloceanspaces.com/${key}`;
}

export interface UploadToSpacesResult {
  url: string;
  key: string;
}

/**
 * Upload a file to DigitalOcean Spaces.
 * @param buffer - File contents
 * @param key - Object key (path) in the bucket
 * @param mimeType - Content-Type (e.g. application/pdf, image/jpeg)
 */
export async function uploadToSpaces(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<UploadToSpacesResult> {
  const s3 = getClient();
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read'
  };
  await s3.send(new PutObjectCommand(params));
  const url = getPublicUrl(key);
  logger.info('Spaces upload succeeded', { key, url });
  return { url, key };
}

/**
 * Delete an object from Spaces by key.
 */
export async function deleteFromSpaces(key: string): Promise<boolean> {
  try {
    const s3 = getClient();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    logger.info('Spaces delete succeeded', { key });
    return true;
  } catch (err) {
    logger.error('Spaces delete error', {
      key,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    return false;
  }
}

/** Allowed MIME types for KYC document uploads (PDF + images). */
export const ALLOWED_KYC_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

/** Default max file size for KYC uploads (bytes). Override with KYC_MAX_DOCUMENT_SIZE (MB). */
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function getMaxUploadSizeBytes(): number {
  const mb = process.env.KYC_MAX_DOCUMENT_SIZE
    ? parseInt(process.env.KYC_MAX_DOCUMENT_SIZE, 10)
    : 10;
  return mb * 1024 * 1024;
}

/**
 * Validate file for KYC upload: type and size.
 */
export function validateKycUpload(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_KYC_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_KYC_MIME_TYPES.join(', ')}`
    };
  }
  const maxBytes = getMaxUploadSizeBytes();
  if (fileSize > maxBytes) {
    return {
      valid: false,
      error: `File size must not exceed ${maxBytes / (1024 * 1024)}MB`
    };
  }
  return { valid: true };
}

export function isSpacesConfigured(): boolean {
  return !!(region && endpoint && bucket && accessKeyId && secretAccessKey);
}

export default {
  uploadToSpaces,
  deleteFromSpaces,
  getPublicUrl,
  validateKycUpload,
  isSpacesConfigured,
  ALLOWED_KYC_MIME_TYPES,
  getMaxUploadSizeBytes
};
