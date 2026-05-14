import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

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
        'Spaces is not configured. Set DO_SPACES_REGION, DO_SPACES_ENDPOINT, DO_SPACES_BUCKET, DO_SPACES_ACCESS_KEY_ID, DO_SPACES_SECRET_ACCESS_KEY.',
      );
    }
    client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
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
 * @param mimeType - Content-Type (e.g. image/jpeg)
 */
export async function uploadToSpaces(
  buffer: Buffer,
  key: string,
  mimeType: string,
): Promise<UploadToSpacesResult> {
  const s3 = getClient();
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read',
  };
  await s3.send(new PutObjectCommand(params));
  const url = getPublicUrl(key);
  // eslint-disable-next-line no-console
  console.info('Spaces upload succeeded', { key, url });
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
        Key: key,
      }),
    );
    // eslint-disable-next-line no-console
    console.info('Spaces delete succeeded', { key });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Spaces delete error', {
      key,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Allowed MIME types for product preview uploads (LOAN/MORTGAGE `about.previewAssetUrl`, etc.).
 * Matches: PNG, JPEG/JPG, SVG, WebP.
 */
export const ALLOWED_PRODUCT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
] as const;

const ALLOWED_PRODUCT_IMAGE_MIME_SET = new Set<string>(ALLOWED_PRODUCT_IMAGE_MIME_TYPES);

/** Human-readable list for API error messages */
export const ALLOWED_PRODUCT_IMAGE_FORMATS_LABEL = 'PNG, JPEG, JPG, SVG, WebP';

/** Default max file size for product image uploads (bytes). Override with PRODUCT_IMAGE_MAX_SIZE_MB (MB). */
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function getMaxUploadSizeBytes(): number {
  const mb = process.env.PRODUCT_IMAGE_MAX_SIZE_MB
    ? parseInt(process.env.PRODUCT_IMAGE_MAX_SIZE_MB, 10)
    : 5;
  return (Number.isFinite(mb) && mb > 0 ? mb : 5) * 1024 * 1024;
}

/**
 * Validate file for product image upload: type and size.
 */
export function validateProductImageUpload(
  mimeType: string,
  fileSize: number,
): { valid: boolean; error?: string } {
  if (!ALLOWED_PRODUCT_IMAGE_MIME_SET.has(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed formats: ${ALLOWED_PRODUCT_IMAGE_FORMATS_LABEL}`,
    };
  }
  const maxBytes = getMaxUploadSizeBytes() || DEFAULT_MAX_SIZE_BYTES;
  if (fileSize > maxBytes) {
    return {
      valid: false,
      error: `File size must not exceed ${maxBytes / (1024 * 1024)}MB`,
    };
  }
  return { valid: true };
}

/**
 * Allowed MIME types for document template uploads (loan/mortgage requirement templates).
 * Matches: PDF, DOC, DOCX.
 */
export const ALLOWED_DOCUMENT_TEMPLATE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const ALLOWED_DOCUMENT_TEMPLATE_MIME_SET = new Set<string>(ALLOWED_DOCUMENT_TEMPLATE_MIME_TYPES);

/** Human-readable list for API error messages */
export const ALLOWED_DOCUMENT_TEMPLATE_FORMATS_LABEL = 'PDF, DOC, DOCX';

const DEFAULT_TEMPLATE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function getMaxTemplateUploadSizeBytes(): number {
  const mb = process.env.PRODUCT_TEMPLATE_MAX_SIZE_MB
    ? parseInt(process.env.PRODUCT_TEMPLATE_MAX_SIZE_MB, 10)
    : 10;
  return (Number.isFinite(mb) && mb > 0 ? mb : 10) * 1024 * 1024;
}

export function validateDocumentTemplateUpload(
  mimeType: string,
  fileSize: number,
): { valid: boolean; error?: string } {
  if (!ALLOWED_DOCUMENT_TEMPLATE_MIME_SET.has(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed formats: ${ALLOWED_DOCUMENT_TEMPLATE_FORMATS_LABEL}`,
    };
  }
  const maxBytes = getMaxTemplateUploadSizeBytes() || DEFAULT_TEMPLATE_MAX_SIZE_BYTES;
  if (fileSize > maxBytes) {
    return {
      valid: false,
      error: `File size must not exceed ${maxBytes / (1024 * 1024)}MB`,
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
  validateProductImageUpload,
  validateDocumentTemplateUpload,
  isSpacesConfigured,
  ALLOWED_PRODUCT_IMAGE_MIME_TYPES,
  getMaxUploadSizeBytes,
  ALLOWED_DOCUMENT_TEMPLATE_MIME_TYPES,
  getMaxTemplateUploadSizeBytes,
};

