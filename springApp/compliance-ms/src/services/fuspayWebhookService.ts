import { KYCProfileModel } from '../models/KYCProfileModel';
import { KYCStatus, UserType } from '../types/kycTypes';
import { normalizeBvnTo11Digits } from '../utils/bvnNormalize';
import { logger } from '../utils/logger';

export type FuspayWebhookApplyResult = {
  matched: number;
  modified: number;
  fuspayUserId?: string;
  verificationId?: string;
  reference?: string;
  profileStatus?: KYCStatus;
  bvnStored?: boolean;
  /** client-auth user id on the matched KYC profile */
  profileUserId?: string;
  userType?: UserType;
  /** True when retail KYC completed and PayOnUs fixed VA should be provisioned */
  shouldProvisionNuban?: boolean;
};

const approvedHints = ['approved', 'completed', 'complete', 'verified', 'success'];

export function isFuspayVerificationCompleted(event: string, rawStatusStr: string): boolean {
  const ev = event.toLowerCase();
  if (ev.includes('verification.completed') || ev.includes('verification_completed')) {
    return true;
  }
  return approvedHints.some((h) => rawStatusStr.includes(h));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringField(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
    if (c != null && typeof c !== 'object') {
      const s = String(c).trim();
      if (s) return s;
    }
  }
  return '';
}

function parseDob(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Build Mongo filter to match KYC profile from webhook identifiers. */
function buildProfileMatchFilter(ids: {
  fuspayUserId: string;
  verificationId: string;
  reference: string;
  userRef: string;
}): Record<string, unknown> | null {
  const or: Record<string, unknown>[] = [];
  if (ids.fuspayUserId) {
    or.push(
      { 'fuspay.customerId': ids.fuspayUserId },
      { 'fuspay.userRef': ids.fuspayUserId },
      { userId: ids.fuspayUserId }
    );
  }
  if (ids.userRef && ids.userRef !== ids.fuspayUserId) {
    or.push({ 'fuspay.userRef': ids.userRef }, { userId: ids.userRef });
  }
  if (ids.verificationId) {
    or.push({ 'fuspay.verification.verificationId': ids.verificationId });
  }
  if (ids.reference) {
    or.push(
      { 'fuspay.verification.reference': ids.reference },
      { 'fuspay.verification.verificationId': ids.reference }
    );
  }
  if (!or.length) return null;
  return { $or: or };
}

/**
 * Persist full Fuspay modular webhook body and map verification / BVN fields onto KYCProfile.
 */
export async function applyFuspayModularWebhook(
  payload: Record<string, unknown>
): Promise<FuspayWebhookApplyResult> {
  const nested = asRecord(payload.data);
  const details = asRecord(nested.details);

  const event = stringField(payload.event, payload.type);
  const fuspayUserId = stringField(
    nested.user_id,
    nested.customer_id,
    nested.customerId,
    payload.user_id,
    payload.customer_id
  );
  const userRef = stringField(nested.user_ref, nested.userRef, payload.user_ref);
  const reference = stringField(nested.reference, nested.ref);
  const verificationId = stringField(
    nested.verification_id,
    nested.verificationId,
    nested.id,
    payload.verification_id,
    payload.verificationId,
    reference
  );
  const verificationType = stringField(nested.verification_type, nested.verificationType);
  const rawStatusStr = stringField(
    nested.status,
    nested.overall_status,
    nested.overallStatus,
    nested.kyc_status,
    payload.status
  ).toLowerCase();

  const rejectedHints = ['rejected', 'failed', 'declined'];

  let newProfileStatus: KYCStatus | undefined;
  if (approvedHints.some((h) => rawStatusStr.includes(h))) {
    newProfileStatus = KYCStatus.APPROVED;
  } else if (rejectedHints.some((h) => rawStatusStr.includes(h))) {
    newProfileStatus = KYCStatus.REJECTED;
  }

  const receivedAt = new Date();
  const bvnRaw = details.bvn ?? nested.bvn ?? payload.bvn;
  const bvnNormalized = normalizeBvnTo11Digits(bvnRaw);

  const setDoc: Record<string, unknown> = {
    'fuspay.webhook.lastPayload': payload,
    'fuspay.webhook.lastReceivedAt': receivedAt,
    'fuspay.verification.lastSyncedAt': receivedAt
  };

  if (event) {
    setDoc['fuspay.webhook.lastEvent'] = event;
    setDoc['fuspay.verification.lastEvent'] = event;
  }
  if (verificationId) {
    setDoc['fuspay.verification.verificationId'] = verificationId;
  }
  if (reference) {
    setDoc['fuspay.verification.reference'] = reference;
  }
  if (verificationType) {
    setDoc['fuspay.verification.verificationType'] = verificationType;
  }
  if (rawStatusStr) {
    setDoc['fuspay.verification.status'] = rawStatusStr;
  }
  if (Object.keys(details).length > 0) {
    setDoc['fuspay.verification.details'] = details;
  }
  if (bvnRaw != null && String(bvnRaw).trim()) {
    setDoc['fuspay.verification.bvn'] = String(bvnRaw).trim();
  }
  if (bvnNormalized) {
    setDoc['fuspay.verification.bvnNormalized'] = bvnNormalized;
    setDoc['personalInfo.bvn'] = bvnNormalized;
  }

  const firstName = stringField(details.first_name, details.firstName);
  const lastName = stringField(details.last_name, details.lastName);
  const dob = parseDob(details.dob ?? details.date_of_birth ?? details.dateOfBirth);
  if (firstName) setDoc['personalInfo.firstName'] = firstName;
  if (lastName) setDoc['personalInfo.lastName'] = lastName;
  if (dob) setDoc['personalInfo.dateOfBirth'] = dob;

  if (newProfileStatus) {
    setDoc.status = newProfileStatus;
    if (newProfileStatus === KYCStatus.APPROVED) {
      setDoc.completedAt = receivedAt;
    }
  }

  const filter = buildProfileMatchFilter({ fuspayUserId, verificationId, reference, userRef });
  if (!filter) {
    return {
      matched: 0,
      modified: 0,
      fuspayUserId: fuspayUserId || undefined,
      verificationId: verificationId || undefined,
      reference: reference || undefined
    };
  }

  const historyEntry = {
    receivedAt,
    event: event || undefined,
    payload
  };

  const result = await KYCProfileModel.updateOne(filter, {
    $set: setDoc,
    $push: {
      'fuspay.webhook.history': {
        $each: [historyEntry],
        $slice: -30
      }
    }
  });

  let profileUserId: string | undefined;
  let userType: UserType | undefined;
  if (result.matchedCount > 0) {
    const profile = await KYCProfileModel.findOne(filter).lean();
    profileUserId = profile?.userId;
    userType = profile?.userType as UserType | undefined;
  }

  const kycCompleted = isFuspayVerificationCompleted(event, rawStatusStr);
  const shouldProvisionNuban =
    result.matchedCount > 0 &&
    kycCompleted &&
    userType === UserType.INDIVIDUAL &&
    Boolean(profileUserId);

  logger.info('Fuspay modular webhook applied to KYC profile', {
    fuspayUserId: fuspayUserId || undefined,
    userRef: userRef || undefined,
    verificationId: verificationId || undefined,
    reference: reference || undefined,
    rawStatusStr,
    profileStatus: newProfileStatus,
    bvnNormalized: Boolean(bvnNormalized),
    matched: result.matchedCount,
    modified: result.modifiedCount,
    profileUserId,
    shouldProvisionNuban
  });

  return {
    matched: result.matchedCount,
    modified: result.modifiedCount ?? 0,
    fuspayUserId: fuspayUserId || undefined,
    verificationId: verificationId || undefined,
    reference: reference || undefined,
    profileStatus: newProfileStatus,
    bvnStored: Boolean(bvnNormalized),
    profileUserId,
    userType,
    shouldProvisionNuban
  };
}
