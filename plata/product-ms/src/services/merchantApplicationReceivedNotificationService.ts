import axios from 'axios';
import { config } from '../config/environment';
import type { UserProductApplication } from '../types/userProductApplication';
import type { MerchantOwnerProfile } from './merchantOwnerService';

const TEMPLATE = 'merchant-application-received';

async function postDual(body: Record<string, unknown>): Promise<void> {
  const baseUrl = config.notificationsServiceUrl.replace(/\/+$/, '');
  await axios.post(`${baseUrl}/api/v1/notifications/send-dual`, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 12000
  });
}

export async function sendMerchantApplicationReceivedNotification(args: {
  application: UserProductApplication;
  merchantOwner?: MerchantOwnerProfile;
}): Promise<void> {
  const { application, merchantOwner } = args;
  if (!merchantOwner?.email.trim()) {
    console.warn(
      '[product-ms] Skipping merchant application received alert: merchant owner email unavailable'
    );
    return;
  }

  const merchantOwnerName = [merchantOwner.firstName, merchantOwner.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const applicantName = application.customerName?.trim() || 'Applicant';

  try {
    await postDual({
      userId: merchantOwner.userId,
      email: merchantOwner.email.trim(),
      template: TEMPLATE,
      data: {
        recipientName: merchantOwnerName || 'Merchant',
        applicantName,
        productName: application.productName || 'your product',
        productType: application.productType,
        merchantName: application.merchantName || application.offeringMerchantName || 'Your business',
        applicationId: application.id,
        submittedAt: application.submittedAt,
        detail: `${applicantName} just submitted an application for ${application.productName || 'your product'}.`
      }
    });
  } catch (error) {
    console.error('[product-ms] Failed to send merchant application received notification:', error);
  }
}
