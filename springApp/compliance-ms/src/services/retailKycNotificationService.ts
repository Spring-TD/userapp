import axios from 'axios';
import { logger } from '../utils/logger';

const NOTIFICATIONS_SERVICE_URL = (
  process.env.NOTIFICATIONS_SERVICE_URL ||
  process.env.NOTIFICATIONS_MS_URL ||
  ''
).replace(/\/+$/, '');

function emailFromProfile(profile: Record<string, unknown> | null | undefined): string | undefined {
  if (!profile) return undefined;
  const personal = profile.personalInfo as Record<string, unknown> | undefined;
  const candidates = [
    personal?.email,
    profile.email,
    (profile.contact as Record<string, unknown> | undefined)?.email
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.includes('@')) {
      return value.trim();
    }
  }
  return undefined;
}

function userNameFromProfile(profile: Record<string, unknown> | null | undefined, email?: string): string {
  const personal = profile?.personalInfo as Record<string, unknown> | undefined;
  const first = typeof personal?.firstName === 'string' ? personal.firstName.trim() : '';
  const last = typeof personal?.lastName === 'string' ? personal.lastName.trim() : '';
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  if (email) return email.split('@')[0];
  return 'there';
}

export async function notifyRetailKycDecision(args: {
  userId: string;
  status: 'approved' | 'rejected';
  profile?: Record<string, unknown> | null;
  reason?: string;
}): Promise<void> {
  if (!NOTIFICATIONS_SERVICE_URL) {
    logger.warn('Skipping retail KYC notification: NOTIFICATIONS_SERVICE_URL not set');
    return;
  }

  const email = emailFromProfile(args.profile);
  const userName = userNameFromProfile(args.profile, email);
  const template = args.status === 'approved' ? 'kyc-verified' : 'kyc-rejected';

  try {
    await axios.post(
      `${NOTIFICATIONS_SERVICE_URL}/api/v1/notifications/send-dual`,
      {
        userId: args.userId,
        ...(email ? { email } : {}),
        template,
        data: {
          userName,
          reason: args.reason?.trim() || ''
        },
        priority: args.status === 'rejected' ? 'high' : 'normal'
      },
      { timeout: 12_000 }
    );
  } catch (error) {
    logger.warn('Failed to send retail KYC notification', {
      userId: args.userId,
      template,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
