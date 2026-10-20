import axios from 'axios';
import { config } from '../config/environment';
import { ProductModel, toProduct } from '../models/ProductModel';
import {
  UserProductApplicationModel,
  toUserProductApplication
} from '../models/UserProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';
import { UserProductApplicationService } from './userProductApplicationService';
import { SubMerchantProductUsageEventService } from './subMerchantProductUsageEventService';
import { resolveMerchantOwner } from './merchantOwnerService';
import { sendMerchantApplicationReceivedNotification } from './merchantApplicationReceivedNotificationService';
import { validatePlatformApplicationFields } from '../utils/platformApplicationFields';
import { assertApplicantSignatureProvided } from '../utils/applicantSignature';
import { validateSubmittedRequirementsForLendingProduct } from '../utils/loanApplicationRequirements';
import { normalizeProductType } from '../utils/productType';
import { buildExternalUserRef, parsePersonName } from '../utils/parsePersonName';
import type {
  CreateExternalProductAccountInput,
  CreateExternalProductAccountResult,
  SubmitExternalProductApplicationInput,
  SubmitExternalProductApplicationResult
} from '../types/externalProductApplication';
import type { UserProductApplication } from '../types/userProductApplication';

function internalHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': config.clientAuthInternalToken
  };
}

export class ExternalProductApplicationService {
  constructor(
    private readonly applicationService = new UserProductApplicationService(),
    private readonly usageEventService = new SubMerchantProductUsageEventService()
  ) {}

  async resolveApp(appId: string): Promise<{ merchantId: string; name?: string }> {
    try {
      const response = await axios.get(
        `${config.createAppServiceUrl}/internal/api/v1/apps/${encodeURIComponent(appId)}`,
        {
          headers: internalHeaders(),
          timeout: 10000,
          validateStatus: () => true
        }
      );
      if (response.status === 404) {
        throw new ApiError(404, 'App not found');
      }
      if (response.status !== 200 || !response.data?.success || !response.data.data?.merchantId) {
        const msg =
          (response.data &&
          typeof response.data === 'object' &&
          'error' in response.data
            ? (response.data as { error?: string }).error
            : null) || 'Failed to resolve app merchant';
        throw new ApiError(response.status >= 400 ? response.status : 502, msg);
      }
      return {
        merchantId: response.data.data.merchantId,
        name: response.data.data.name
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const message = axios.isAxiosError(error) ? error.message : 'create-app-ms unavailable';
      throw new ApiError(503, message);
    }
  }

  async provisionUser(
    ownerMerchantId: string,
    user: CreateExternalProductAccountInput['user'],
    country?: string
  ): Promise<CreateExternalProductAccountResult['user']> {
    const userRef = buildExternalUserRef(user.id);
    const { first_name, last_name } = parsePersonName(user.name);
    try {
      const response = await axios.post(
        `${config.clientAuthUrl}/internal/api/v1/external-users/provision`,
        {
          merchantId: ownerMerchantId,
          user_ref: userRef,
          email: user.email.trim(),
          first_name,
          last_name,
          phone: user.phone.trim(),
          bvn: user.bvn?.trim(),
          country: country || 'NG'
        },
        {
          headers: internalHeaders(),
          timeout: 15000,
          validateStatus: () => true
        }
      );
      if (response.status >= 400 || !response.data?.success || !response.data.data?.user) {
        const msg = response.data?.error || 'Failed to provision user';
        throw new ApiError(
          response.status >= 400 && response.status < 600 ? response.status : 502,
          msg
        );
      }
      return {
        ...response.data.data.user,
        created: response.data.data.created
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const message = axios.isAxiosError(error) ? error.message : 'client-auth-ms unavailable';
      throw new ApiError(503, message);
    }
  }

  async provisionWallet(
    productCreatorMerchantId: string,
    userId: string,
    user: CreateExternalProductAccountInput['user'],
    currency?: string
  ): Promise<CreateExternalProductAccountResult['wallet']> {
    try {
      const parsed = parsePersonName(user.name);
      const response = await axios.post(
        `${config.walletServiceUrl}/internal/api/v1/wallets/user/provision`,
        {
          userId,
          merchantId: productCreatorMerchantId,
          name: `Wallet for ${user.name}`.slice(0, 120),
          currency: (currency || 'NGN').toUpperCase(),
          bvn: user.bvn?.trim(),
          email: user.email?.trim(),
          phone: user.phone?.trim(),
          firstName: user.firstName?.trim() || parsed.first_name,
          lastName: user.lastName?.trim() || parsed.last_name,
          otherNames: user.otherNames?.trim(),
          gender: user.gender?.trim(),
          dateOfBirth: user.dateOfBirth?.trim(),
          placeOfBirth: user.placeOfBirth?.trim(),
          address: user.address?.trim(),
          accountTier: user.accountTier?.trim(),
          applicantProfile: {
            fullName: user.name.trim(),
            firstName: user.firstName?.trim() || parsed.first_name,
            lastName: user.lastName?.trim() || parsed.last_name,
            otherNames: user.otherNames?.trim(),
            email: user.email?.trim(),
            phone: user.phone?.trim(),
            bvn: user.bvn?.trim(),
            gender: user.gender?.trim(),
            dateOfBirth: user.dateOfBirth?.trim(),
            placeOfBirth: user.placeOfBirth?.trim(),
            address: user.address?.trim(),
            accountTier: user.accountTier?.trim()
          }
        },
        {
          headers: internalHeaders(),
          timeout: 30000,
          validateStatus: () => true
        }
      );
      if (response.status >= 400 || !response.data?.success || !response.data.data?.wallet) {
        const msg = response.data?.error || 'Failed to provision wallet';
        throw new ApiError(
          response.status >= 400 && response.status < 600 ? response.status : 502,
          msg
        );
      }
      const w = response.data.data.wallet;
      return {
        id: w.id,
        userId: w.userId,
        merchantId: w.merchantId,
        currency: w.currency,
        virtualNuban: w.virtualNuban,
        payonusNubanProvisionStatus:
          w.virtualNuban?.provisionStatus ?? w.payonusNubanProvisionStatus,
        payonusNubanAccountNumber: w.virtualNuban?.accountNumber ?? w.payonusNubanAccountNumber,
        payonusNubanBankName: w.virtualNuban?.bankName ?? w.payonusNubanBankName,
        payonusNubanBankCode: w.virtualNuban?.bankCode ?? w.payonusNubanBankCode,
        payonusNubanProviderReference:
          w.virtualNuban?.providerReference ?? w.payonusNubanProviderReference,
        created: response.data.data.created
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const message = axios.isAxiosError(error) ? error.message : 'wallet-ms unavailable';
      throw new ApiError(503, message);
    }
  }

  async findExistingApplication(
    userId: string,
    globalProductId: string,
    offeringMerchantId: string,
    localApplicationId?: string
  ) {
    const trimmedLocalApplicationId = localApplicationId?.trim();
    if (!trimmedLocalApplicationId) {
      return null;
    }
    return UserProductApplicationModel.findOne({
      userId,
      globalProductId,
      offeringMerchantId,
      localApplicationId: trimmedLocalApplicationId,
      status: { $nin: ['cancelled', 'withdrawn'] }
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  async fetchMerchantCompanyName(merchantId: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${config.complianceServiceUrl.replace(/\/$/, '')}/api/v1/kyc/internal/business-info/${encodeURIComponent(merchantId)}`,
        {
          headers: { 'X-Internal-Token': config.internalServiceToken },
          timeout: 5000,
          validateStatus: () => true
        }
      );
      if (response.status === 200 && response.data?.success && response.data.data?.companyName) {
        return response.data.data.companyName;
      }
      return null;
    } catch {
      return null;
    }
  }

  async resolveProductCreatorCompanyName(
    product: { companyName?: string | null; merchant?: { companyName?: string | null } },
    merchantId: string,
    appName?: string
  ): Promise<string | null> {
    const fromProduct =
      product.companyName?.trim() || product.merchant?.companyName?.trim() || '';
    if (fromProduct) {
      return fromProduct;
    }
    const fromCompliance = await this.fetchMerchantCompanyName(merchantId);
    if (fromCompliance) {
      return fromCompliance;
    }
    return appName?.trim() || null;
  }

  async resolveActiveProduct(appId: string, productId: string) {
    const productDoc = await ProductModel.findById(productId.trim()).lean();
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }
    const product = toProduct(productDoc);
    if (product.appId !== appId.trim()) {
      throw new ApiError(400, 'productId does not belong to the provided appId');
    }
    if (!product.isActive) {
      throw new ApiError(400, 'Product is not active');
    }
    const app = await this.resolveApp(appId.trim());
    const productCreatorCompanyName = await this.resolveProductCreatorCompanyName(
      product,
      app.merchantId,
      app.name
    );
    return {
      product,
      productCreatorMerchantId: app.merchantId,
      productCreatorName: app.name,
      productCreatorCompanyName
    };
  }

  isGuarantorRequirementsDraft(input: SubmitExternalProductApplicationInput): boolean {
    return (
      input.application.status === 'draft' &&
      input.application.contractSnapshot?.guarantorKycStage === 'requirements'
    );
  }

  async createAccount(
    input: CreateExternalProductAccountInput
  ): Promise<CreateExternalProductAccountResult> {
    const { productCreatorMerchantId, productCreatorCompanyName } = await this.resolveActiveProduct(
      input.appId,
      input.productId
    );
    const user = await this.provisionUser(productCreatorMerchantId, input.user, input.country);
    const wallet = await this.provisionWallet(
      productCreatorMerchantId,
      user.id,
      input.user,
      input.currency
    );
    return {
      externalPlatformMerchantId: input.plataMerchantId,
      productCreatorMerchantId,
      productCreatorCompanyName,
      user,
      wallet
    };
  }

  async submit(
    input: SubmitExternalProductApplicationInput
  ): Promise<SubmitExternalProductApplicationResult> {
    const externalPlatformMerchantId = input.plataMerchantId.trim();
    const externalPlatformMerchantName =
      input.plataMerchantName?.trim() || externalPlatformMerchantId;
    const { product, productCreatorMerchantId, productCreatorCompanyName } =
      await this.resolveActiveProduct(input.appId, input.productId);
    const productType = normalizeProductType(product.type);
    const allowMissingSubmittedRequirements = this.isGuarantorRequirementsDraft(input);
    const submittedRequirements = validateSubmittedRequirementsForLendingProduct(
      productType,
      product.requirements,
      input.application.submittedRequirements,
      { allowMissingMandatory: allowMissingSubmittedRequirements }
    );
    const user = await this.provisionUser(productCreatorMerchantId, input.user, input.country);
    // Deposit products (investment/savings/commodity) must still enroll if NUBAN fails —
    // Spring / integrators fall back to their own PRODUCT wallet. Lending keeps hard fail via createAccount.
    let wallet: SubmitExternalProductApplicationResult['wallet'];
    try {
      wallet = await this.provisionWallet(
        productCreatorMerchantId,
        user.id,
        input.user,
        input.currency
      );
    } catch (walletError) {
      const message =
        walletError instanceof Error ? walletError.message : 'Failed to provision wallet';
      console.warn('external-applications wallet provision failed; continuing enrollment:', message);
      wallet = {
        id: `unprovisioned:${user.id}`,
        userId: user.id,
        merchantId: productCreatorMerchantId,
        currency: (input.currency || 'NGN').toUpperCase(),
        virtualNuban: {
          accountType: 'nuban',
          provisionStatus: 'failed',
          provisionError: message
        },
        payonusNubanProvisionStatus: 'failed',
        created: false
      };
    }
    const offeringMerchantId = input.offeringMerchantId.trim();
    const customerName = input.user.name.trim();
    const productName = input.productName?.trim() || product.name?.trim() || undefined;
    const creatorMerchantDisplayName =
      input.productCreatorMerchantName?.trim() ||
      input.merchantName?.trim() ||
      productCreatorCompanyName ||
      undefined;
    const offeringMerchantDisplayName =
      (await this.fetchMerchantCompanyName(offeringMerchantId)) ||
      input.offeringMerchantName?.trim() ||
      undefined;
    const localApplicationId =
      input.application.localApplicationId?.trim() ||
      input.application.merchantProductId?.trim() ||
      undefined;
    const existingApp = await this.findExistingApplication(
      user.id,
      input.productId.trim(),
      offeringMerchantId,
      localApplicationId
    );
    const existingApplication = existingApp
      ? toUserProductApplication(existingApp as unknown as Record<string, unknown>)
      : undefined;
    const applicationStatus =
      input.application.status ?? existingApplication?.status ?? 'submitted';
    const platformFields = validatePlatformApplicationFields({
      isPoliticallyExposedPerson:
        input.application.isPoliticallyExposedPerson ??
        existingApplication?.isPoliticallyExposedPerson ??
        undefined,
      monthlyIncome: input.application.monthlyIncome ?? existingApplication?.monthlyIncome,
      repaymentSource: input.application.repaymentSource ?? existingApplication?.repaymentSource,
      repaymentSourceOther:
        input.application.repaymentSourceOther ?? existingApplication?.repaymentSourceOther,
      maritalStatus: input.application.maritalStatus ?? existingApplication?.maritalStatus,
      maritalStatusOther:
        input.application.maritalStatusOther ?? existingApplication?.maritalStatusOther,
      loanReason: input.application.loanReason ?? existingApplication?.loanReason,
      loanReasonOther: input.application.loanReasonOther ?? existingApplication?.loanReasonOther,
      repayingWithSpouse:
        input.application.repayingWithSpouse ??
        existingApplication?.repayingWithSpouse ??
        undefined,
      spouseFullName: input.application.spouseFullName ?? existingApplication?.spouseFullName ?? undefined,
      spouseEmail: input.application.spouseEmail ?? existingApplication?.spouseEmail ?? undefined,
      spousePhone: input.application.spousePhone ?? existingApplication?.spousePhone ?? undefined,
      spouseOccupation:
        input.application.spouseOccupation ?? existingApplication?.spouseOccupation ?? undefined,
      spouseCountry: input.application.spouseCountry ?? existingApplication?.spouseCountry ?? undefined,
      occupation: input.application.occupation ?? existingApplication?.occupation,
      placeOfWork: input.application.placeOfWork ?? existingApplication?.placeOfWork,
      hrName: input.application.hrName ?? existingApplication?.hrName,
      hrEmail: input.application.hrEmail ?? existingApplication?.hrEmail,
      status: applicationStatus,
      productType
    });
    const signatureFields = assertApplicantSignatureProvided(
      product.requireApplicantSignature,
      applicationStatus,
      {
        applicantSignatureUrl:
          input.application.applicantSignatureUrl ?? existingApplication?.applicantSignatureUrl,
        applicantSignatureKey:
          input.application.applicantSignatureKey ?? existingApplication?.applicantSignatureKey,
        applicantSignatureFileName:
          input.application.applicantSignatureFileName ??
          existingApplication?.applicantSignatureFileName
      }
    );

    let application: UserProductApplication;
    let applicationCreated = false;
    if (existingApplication) {
      const callbackUrl = input.loanWorkflowCallbackUrl?.trim();
      const guarantorCallbackUrl = input.guarantorKycCallbackUrl?.trim();
      const updates: Record<string, unknown> = {};
      if (callbackUrl && existingApplication.loanWorkflowCallbackUrl !== callbackUrl) {
        updates.loanWorkflowCallbackUrl = callbackUrl;
      }
      if (
        guarantorCallbackUrl &&
        existingApplication.guarantorKycCallbackUrl !== guarantorCallbackUrl
      ) {
        updates.guarantorKycCallbackUrl = guarantorCallbackUrl;
      }
      if (existingApplication.externalPlatformMerchantId !== externalPlatformMerchantId) {
        updates.externalPlatformMerchantId = externalPlatformMerchantId;
      }
      if (existingApplication.externalPlatformMerchantName !== externalPlatformMerchantName) {
        updates.externalPlatformMerchantName = externalPlatformMerchantName;
      }
      if (localApplicationId && existingApplication.localApplicationId !== localApplicationId) {
        updates.localApplicationId = localApplicationId;
      }
      if (input.application.status && existingApplication.status !== input.application.status) {
        updates.status = input.application.status;
      }
      updates.contractSnapshot = input.application.contractSnapshot;
      updates.payoutSplit = input.application.payoutSplit ?? {};
      if (input.application.submittedAt) {
        updates.submittedAt = input.application.submittedAt;
      }
      if (input.application.signedAt) {
        updates.signedAt = input.application.signedAt;
      }
      if (input.application.snapshotVersion) {
        updates.snapshotVersion = input.application.snapshotVersion;
      }
      if (input.application.snapshotHash !== undefined) {
        updates.snapshotHash = input.application.snapshotHash;
      }
      if (input.application.submittedRequirements !== undefined) {
        updates.submittedRequirements = submittedRequirements;
      }
      Object.assign(updates, platformFields, signatureFields);
      if (customerName && existingApplication.customerName !== customerName) {
        updates.customerName = customerName;
      }
      if (productName && existingApplication.productName !== productName) {
        updates.productName = productName;
      }
      if (creatorMerchantDisplayName && existingApplication.merchantName !== creatorMerchantDisplayName) {
        updates.merchantName = creatorMerchantDisplayName;
      }
      if (
        offeringMerchantDisplayName &&
        existingApplication.offeringMerchantName !== offeringMerchantDisplayName
      ) {
        updates.offeringMerchantName = offeringMerchantDisplayName;
      }
      if (input.application.applicantProfileSnapshot !== undefined) {
        updates.applicantProfileSnapshot = input.application.applicantProfileSnapshot;
      }
      if (Object.keys(updates).length > 0) {
        const updatedApp = await UserProductApplicationModel.findByIdAndUpdate(
          existingApplication.id,
          { $set: updates },
          { new: true, lean: true }
        );
        application = updatedApp
          ? toUserProductApplication(updatedApp as unknown as Record<string, unknown>)
          : existingApplication;
      } else {
        application = existingApplication;
      }
    } else {
      application = await this.applicationService.create({
        appId: input.appId.trim(),
        externalPlatformMerchantId,
        externalPlatformMerchantName,
        merchantId: productCreatorMerchantId,
        merchantName: creatorMerchantDisplayName,
        offeringMerchantId,
        offeringMerchantName: offeringMerchantDisplayName,
        userId: user.id,
        customerName,
        productType,
        globalProductId: input.productId.trim(),
        productName,
        globalProductReferenceNumber: product.referenceNumber,
        localApplicationId,
        merchantProductId: input.application.merchantProductId,
        status: input.application.status ?? 'submitted',
        submittedAt: input.application.submittedAt,
        signedAt: input.application.signedAt,
        contractSnapshot: input.application.contractSnapshot,
        payoutSplit: input.application.payoutSplit,
        snapshotVersion: input.application.snapshotVersion,
        snapshotHash: input.application.snapshotHash,
        submittedRequirements,
        allowMissingSubmittedRequirements,
        ...platformFields,
        ...signatureFields,
        loanWorkflowCallbackUrl: input.loanWorkflowCallbackUrl?.trim(),
        guarantorKycCallbackUrl: input.guarantorKycCallbackUrl?.trim(),
        ...(input.application.applicantProfileSnapshot !== undefined
          ? { applicantProfileSnapshot: input.application.applicantProfileSnapshot }
          : {})
      });
      applicationCreated = true;
    }

    let usageEventRecorded = false;
    if (input.subMerchant) {
      await this.usageEventService.upsert({
        plataMerchantId: externalPlatformMerchantId,
        apiKeyId: input.apiKeyId,
        gatewayEnvironment: input.gatewayEnvironment,
        appId: input.appId.trim(),
        productId: input.productId.trim(),
        productName: input.productName,
        merchantId: externalPlatformMerchantId,
        merchantName: externalPlatformMerchantName,
        subMerchant: {
          id: input.subMerchant.id,
          name: input.subMerchant.name,
          email: input.subMerchant.email || '',
          phone: input.subMerchant.phone || ''
        },
        externalUser: input.user,
        startedAt: input.application.submittedAt
      });
      usageEventRecorded = true;
    }

    if (input.loanWorkflowCallbackUrl?.trim()) {
      void this.applicationService.sendLoanSubmissionWebhook(application).catch((error) => {
        console.error('Loan submission webhook failed:', error);
      });
    }

    const submittedNow =
      application.status === 'submitted' &&
      (applicationCreated ||
        (existingApplication?.status !== 'submitted' && input.application.status === 'submitted'));
    if (submittedNow) {
      void resolveMerchantOwner(application.merchantId)
        .then((merchantOwner) =>
          sendMerchantApplicationReceivedNotification({
            application,
            merchantOwner
          })
        )
        .catch((error) => {
          console.error('Merchant application received notification failed:', error);
        });
      if (!applicationCreated) {
        application = await this.applicationService.screenApplicantOnSubmit(application);
        application = await this.applicationService.maybeAutoApproveLoan(application);
      }
    }

    return {
      externalPlatformMerchantId,
      productCreatorMerchantId,
      user,
      wallet,
      application,
      applicationCreated,
      usageEventRecorded
    };
  }
}
