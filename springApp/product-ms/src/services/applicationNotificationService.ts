import axios from 'axios';
import { config } from '../config/environment';
import type { MerchantOwnerProfile } from './clientAuthUserService';
import {
  postProductFlowNotification,
  resolvePropertyAddressFromSnapshot,
  submissionTemplateForProductType,
  workflowTemplateForProductType
} from './productFlowNotificationService';

const TEMPLATE_PRODUCT_APPLICATION_SUBMITTED = 'product-application-submitted';
const TEMPLATE_PRODUCT_APPLICATION_WORKFLOW_UPDATED = 'product-application-workflow-updated';
const TEMPLATE_GUARANTOR_KYC_APPROVED = 'guarantor-kyc-approved';
const TEMPLATE_GUARANTOR_APPLICANT_REPORTED = 'guarantor-applicant-reported';

const workflowStageLabels: Record<string, string> = {
  under_review: 'Under review',
  approved: 'Approved',
  declined: 'Declined',
  blacklisted: 'Blacklisted',
  requirements_submitted: 'Requirements submitted',
  guarantor_kyc_requested: 'Guarantor KYC requested',
  account_created: 'Account created',
  upstream_synced: 'Synced for review'
};

function notificationsBaseUrl(): string {
  return config.notificationsServiceUrl.replace(/\/+$/, '');
}

async function postStorefrontNotify(
  body: {
    userId: string;
    email?: string;
    template: string;
    data: Record<string, unknown>;
    priority?: string;
  },
  label: string
): Promise<void> {
  try {
    await axios.post(`${notificationsBaseUrl()}/api/v1/notifications/send-dual`, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 12000
    });
  } catch (error) {
    console.error(`[product-ms] Failed to send ${label} notification:`, error);
  }
}

export async function sendProductApplicationSubmittedNotification(args: {
  userId: string;
  email?: string;
  applicantName: string;
  productName: string;
  productType: string;
  applicationId: string;
  amount?: number;
  currency?: string;
  merchantName?: string;
  poweredBy?: string;
  contractSnapshot?: Record<string, unknown>;
}): Promise<void> {
  const amountLabel =
    typeof args.amount === 'number' && Number.isFinite(args.amount)
      ? `${args.currency || ''} ${args.amount.toLocaleString('en-US')}`.trim()
      : '';

  const template = submissionTemplateForProductType(args.productType);
  const propertyAddress = resolvePropertyAddressFromSnapshot(args.contractSnapshot, args.productName);
  const baseData = {
    userName: args.applicantName,
    applicantName: args.applicantName,
    productName: args.productName,
    productType: args.productType,
    applicationId: args.applicationId,
    amount: amountLabel,
    merchantName: args.merchantName || 'the merchant',
    poweredBy: args.poweredBy || '',
    propertyAddress,
    planName: args.productName,
    commodityName: args.productName
  };

  await postProductFlowNotification(
    {
      userId: args.userId,
      email: args.email,
      template,
      data: baseData,
      priority: 'normal'
    },
    template
  );
}

export async function sendProductApplicationWorkflowStageNotification(args: {
  userId: string;
  email?: string;
  applicantName: string;
  productName: string;
  productType: string;
  applicationId: string;
  workflowStage: string;
  previousWorkflowStage?: string;
  amount?: number;
  currency?: string;
  merchantName?: string;
  poweredBy?: string;
  merchantOwner?: MerchantOwnerProfile;
  detail?: string;
  contractSnapshot?: Record<string, unknown>;
}): Promise<void> {
  const workflowStageLabel = workflowStageLabels[args.workflowStage] || args.workflowStage;
  const previousWorkflowStageLabel = args.previousWorkflowStage
    ? workflowStageLabels[args.previousWorkflowStage] || args.previousWorkflowStage
    : '';
  const amountLabel =
    typeof args.amount === 'number' && Number.isFinite(args.amount)
      ? `${args.currency || ''} ${args.amount.toLocaleString('en-US')}`.trim()
      : '';
  const propertyAddress = resolvePropertyAddressFromSnapshot(args.contractSnapshot, args.productName);
  const specializedTemplate = workflowTemplateForProductType(args.productType, args.workflowStage);
  const applicantTemplate = specializedTemplate ?? TEMPLATE_PRODUCT_APPLICATION_WORKFLOW_UPDATED;
  const baseData = {
    userName: args.applicantName,
    applicantName: args.applicantName,
    productName: args.productName,
    productType: args.productType,
    applicationId: args.applicationId,
    workflowStage: args.workflowStage,
    workflowStageLabel,
    previousWorkflowStage: args.previousWorkflowStage || '',
    previousWorkflowStageLabel,
    amount: amountLabel,
    merchantName: args.merchantName || 'the merchant',
    poweredBy: args.poweredBy || '',
    detail: args.detail || '',
    propertyAddress
  };
  const sends: Promise<void>[] = [];

  sends.push(
    postProductFlowNotification(
      {
        userId: args.userId,
        email: args.email,
        template: applicantTemplate,
        data: {
          ...baseData,
          recipientName: args.applicantName,
          recipientRole: 'applicant'
        },
        priority: 'normal'
      },
      `${applicantTemplate}:applicant`
    )
  );

  if (args.merchantOwner?.email.trim()) {
    const merchantOwnerName = [args.merchantOwner.firstName, args.merchantOwner.lastName].filter(Boolean).join(' ').trim();
    sends.push(
      postStorefrontNotify(
        {
          userId: args.merchantOwner.userId,
          email: args.merchantOwner.email.trim(),
          template: TEMPLATE_PRODUCT_APPLICATION_WORKFLOW_UPDATED,
          data: {
            ...baseData,
            recipientName: merchantOwnerName || 'Merchant',
            recipientRole: 'merchant'
          },
          priority: 'normal'
        },
        `${TEMPLATE_PRODUCT_APPLICATION_WORKFLOW_UPDATED}:merchant`
      )
    );
  } else {
    console.warn(`[product-ms] Skipping ${TEMPLATE_PRODUCT_APPLICATION_WORKFLOW_UPDATED} merchant notification: merchant owner email is unavailable`);
  }

  await Promise.all(sends);
}

export async function sendGuarantorKycApprovedNotification(args: {
  userId: string;
  email?: string;
  applicantName: string;
  guarantorName: string;
  productName: string;
  productType: string;
  applicationId: string;
  merchantName?: string;
  merchantOwner?: MerchantOwnerProfile;
}): Promise<void> {
  const baseData = {
    applicantName: args.applicantName,
    guarantorName: args.guarantorName,
    productName: args.productName,
    productType: args.productType,
    applicationId: args.applicationId,
    merchantName: args.merchantName || 'the merchant'
  };
  const sends: Promise<void>[] = [];

  sends.push(
    postStorefrontNotify(
      {
        userId: args.userId,
        ...(args.email?.trim() ? { email: args.email.trim() } : {}),
        template: TEMPLATE_GUARANTOR_KYC_APPROVED,
        data: {
          ...baseData,
          recipientName: args.applicantName,
          recipientRole: 'applicant'
        },
        priority: 'normal'
      },
      `${TEMPLATE_GUARANTOR_KYC_APPROVED}:applicant`
    )
  );

  if (args.merchantOwner?.email.trim()) {
    const merchantOwnerName = [args.merchantOwner.firstName, args.merchantOwner.lastName].filter(Boolean).join(' ').trim();
    sends.push(
      postStorefrontNotify(
        {
          userId: args.merchantOwner.userId,
          email: args.merchantOwner.email.trim(),
          template: TEMPLATE_GUARANTOR_KYC_APPROVED,
          data: {
            ...baseData,
            recipientName: merchantOwnerName || 'Merchant',
            recipientRole: 'merchant'
          },
          priority: 'normal'
        },
        `${TEMPLATE_GUARANTOR_KYC_APPROVED}:merchant`
      )
    );
  }

  await Promise.all(sends);
}

export async function sendGuarantorApplicantReportedNotification(args: {
  merchantOwner?: MerchantOwnerProfile;
  applicantName: string;
  guarantorName: string;
  productName: string;
  productType: string;
  applicationId: string;
  merchantName?: string;
}): Promise<void> {
  if (!args.merchantOwner?.email.trim()) {
    console.warn(
      `[product-ms] Skipping ${TEMPLATE_GUARANTOR_APPLICANT_REPORTED} merchant notification: merchant owner email is unavailable`
    );
    return;
  }

  const merchantOwnerName = [args.merchantOwner.firstName, args.merchantOwner.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const baseData = {
    applicantName: args.applicantName,
    guarantorName: args.guarantorName,
    productName: args.productName,
    productType: args.productType,
    applicationId: args.applicationId,
    merchantName: args.merchantName || 'the merchant',
    detail: 'A guarantor reported they do not know this applicant. Please review the application.'
  };

  await postStorefrontNotify(
    {
      userId: args.merchantOwner.userId,
      email: args.merchantOwner.email.trim(),
      template: TEMPLATE_GUARANTOR_APPLICANT_REPORTED,
      data: {
        ...baseData,
        recipientName: merchantOwnerName || 'Merchant',
        recipientRole: 'merchant'
      },
      priority: 'high'
    },
    `${TEMPLATE_GUARANTOR_APPLICANT_REPORTED}:merchant`
  );
}
