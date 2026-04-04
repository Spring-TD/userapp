import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3';
import { config } from '../config/environment';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    const { region, endpoint, accessKeyId, secretAccessKey } = config.doSpaces;
    if (!region || !endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'DigitalOcean Spaces is not configured. Set DO_SPACES_REGION, DO_SPACES_ENDPOINT, DO_SPACES_BUCKET, DO_SPACES_ACCESS_KEY_ID, DO_SPACES_SECRET_ACCESS_KEY.'
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
 * Public URL for an object (CDN base if DO_SPACES_CDN_URL is set).
 */
export function getPublicUrl(key: string): string {
  const { bucket, region, cdnBaseUrl } = config.doSpaces;
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

export async function uploadToSpaces(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<UploadToSpacesResult> {
  const { bucket } = config.doSpaces;
  if (!bucket) {
    throw new Error('DO_SPACES_BUCKET is not set');
  }
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
  return { url, key };
}

export async function deleteFromSpaces(key: string): Promise<boolean> {
  try {
    const { bucket } = config.doSpaces;
    if (!bucket) {
      return false;
    }
    const s3 = getClient();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function isSpacesConfigured(): boolean {
  const { region, endpoint, bucket, accessKeyId, secretAccessKey } = config.doSpaces;
  return !!(region && endpoint && bucket && accessKeyId && secretAccessKey);
}
