import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const region = process.env.DO_SPACES_REGION ?? '';
const endpoint = process.env.DO_SPACES_ENDPOINT ?? '';
const bucket = process.env.DO_SPACES_BUCKET ?? '';
const accessKeyId = process.env.DO_SPACES_ACCESS_KEY_ID ?? '';
const secretAccessKey = process.env.DO_SPACES_SECRET_ACCESS_KEY ?? '';
const cdnBaseUrl = process.env.DO_SPACES_CDN_URL ?? '';
const profilePicturePrefix = (process.env.CLIENT_AUTH_PROFILE_PICTURE_PREFIX || 'profile-pictures')
  .replace(/^\/+|\/+$/g, '');

let client: S3Client | null = null;

export interface ProfilePictureUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export const ALLOWED_PROFILE_PICTURE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

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

export function getMaxProfilePictureUploadSizeBytes(): number {
  const mb = process.env.CLIENT_AUTH_PROFILE_PICTURE_MAX_SIZE
    ? parseInt(process.env.CLIENT_AUTH_PROFILE_PICTURE_MAX_SIZE, 10)
    : 5;
  return mb * 1024 * 1024;
}

export function validateProfilePictureUpload(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_PROFILE_PICTURE_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid profile picture type. Allowed: ${ALLOWED_PROFILE_PICTURE_MIME_TYPES.join(', ')}`
    };
  }

  const maxBytes = getMaxProfilePictureUploadSizeBytes();
  if (fileSize > maxBytes) {
    return {
      valid: false,
      error: `Profile picture size must not exceed ${maxBytes / (1024 * 1024)}MB`
    };
  }

  return { valid: true };
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

function buildProfilePictureKey(userId: string, mimeType: string): string {
  const extension = MIME_EXTENSION_MAP[mimeType] || 'bin';
  return `${profilePicturePrefix}/${userId}/${uuidv4()}.${extension}`;
}

export async function uploadProfilePictureToSpaces(
  userId: string,
  file: ProfilePictureUpload
): Promise<{ url: string; key: string }> {
  const validation = validateProfilePictureUpload(file.mimetype, file.size);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const key = buildProfilePictureKey(userId, file.mimetype);
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  };

  await getClient().send(new PutObjectCommand(params));
  return {
    url: getPublicUrl(key),
    key
  };
}
