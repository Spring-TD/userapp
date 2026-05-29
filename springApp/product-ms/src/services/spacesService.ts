import {
  S3Client,
  PutObjectCommand,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3';

const region = process.env.DO_SPACES_REGION ?? '';
const endpoint = process.env.DO_SPACES_ENDPOINT ?? '';
const bucket = process.env.DO_SPACES_BUCKET ?? '';
const accessKeyId = process.env.DO_SPACES_ACCESS_KEY_ID ?? '';
const secretAccessKey = process.env.DO_SPACES_SECRET_ACCESS_KEY ?? '';
const cdnBaseUrl = process.env.DO_SPACES_CDN_URL ?? '';

let client: S3Client | null = null;

export const ALLOWED_APPLICATION_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

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

export function isSpacesConfigured(): boolean {
  return !!(region && endpoint && bucket && accessKeyId && secretAccessKey);
}

export function getMaxApplicationDocumentUploadSizeBytes(): number {
  const mb = process.env.PRODUCT_APPLICATION_MAX_DOCUMENT_SIZE
    ? parseInt(process.env.PRODUCT_APPLICATION_MAX_DOCUMENT_SIZE, 10)
    : 10;
  return mb * 1024 * 1024;
}

export function getPublicUrl(key: string): string {
  if (cdnBaseUrl) {
    return `${cdnBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  if (!bucket || !region) {
    throw new Error('Spaces bucket/region not configured');
  }

  return `https://${bucket}.${region}.digitaloceanspaces.com/${key}`;
}

export function validateApplicationDocumentUpload(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_APPLICATION_DOCUMENT_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_APPLICATION_DOCUMENT_MIME_TYPES.join(', ')}`
    };
  }

  const maxBytes = getMaxApplicationDocumentUploadSizeBytes();
  if (fileSize > maxBytes) {
    return {
      valid: false,
      error: `File size must not exceed ${maxBytes / (1024 * 1024)}MB`
    };
  }

  return { valid: true };
}

export async function uploadToSpaces(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<{ url: string; key: string }> {
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read'
  };

  await getClient().send(new PutObjectCommand(params));
  return {
    url: getPublicUrl(key),
    key
  };
}
