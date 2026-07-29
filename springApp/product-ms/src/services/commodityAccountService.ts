import type { Request } from 'express';
import { ProductModel, toProduct } from '../models/ProductModel';
import {
  ProductApplicationModel,
  type IProductApplicationDocument
} from '../models/ProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';
import type { Product } from '../types/product';
import type { ApplyCommodityAccountRequest, CommodityAccountResponse } from '../types/commodityAccount';
import createAppService from './createAppService';
import upstreamApplicationService from './upstreamApplicationService';
import complianceBvnService from './complianceBvnService';
import clientAuthUserService from './clientAuthUserService';
import merchantDisplayNameService from './merchantDisplayNameService';
import {
  calculateCommodityFlatInterest,
  computeMaturityDate,
  resolveCommodityPurchaseAmount,
  resolveOfferYieldPercent
} from '../utils/commodityPricing';
import { validateRequirementSubmissions } from '../utils/productRequirementValidation';
import {
  extractPlatformFieldInput
} from '../utils/platformApplicationFieldInput';
import { validatePlatformApplicationFields } from '../utils/platformApplicationFields';
import {
  CommodityEnrollmentSettlementError,
  executeCommodityEnrollmentSettlement
} from './settlement/commoditySettlementService';
import {
  sendCommodityEnrollmentNotifications,
  sendCommodityOrderReceivedNotification
} from './commodityNotificationService';

function headerValue(req: Request, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function holdingStatusFromSnapshot(snapshot: Record<string, unknown> | undefined): 'LOCKED' | 'MATURED' | 'WITHDRAWN' {
  const raw = snapshot?.commodityHoldingStatus;
  if (raw === 'WITHDRAWN' || raw === 'MATURED' || raw === 'LOCKED') {
    return raw;
  }
  return 'LOCKED';
}

function toCommodityAccountResponse(application: IProductApplicationDocument): CommodityAccountResponse {
  const snapshot = (application.contractSnapshot || {}) as Record<string, unknown>;
  const holdingStatus = holdingStatusFromSnapshot(snapshot);
  const principal = Number(snapshot.commodityPrincipal ?? application.amount ?? 0);
  const expectedInterest = Number(snapshot.expectedInterest ?? 0);
  const wallet = application.productWallet;
  const upstream = wallet?.upstreamAccount;

  return {
    id: application._id.toString(),
    userId: application.userId,
    accountType: 'commodity',
    principal,
    interestRatePercent: Number(snapshot.offerYieldPercent ?? 0),
    expectedInterest,
    totalAtMaturity: Math.round((principal + expectedInterest) * 100) / 100,
    currency: application.currency,
    status: holdingStatus === 'WITHDRAWN' ? 'withdrawn' : holdingStatus === 'MATURED' ? 'matured' : 'locked',
    holdingStatus,
    productId: application.productId,
    productName: application.productName,
    applicationId: application._id.toString(),
    appId: application.appId!,
    merchantId: application.merchantId,
    upstreamApplicationId: application.upstreamApplicationId,
    fundedAt: typeof snapshot.fundedAt === 'string' ? snapshot.fundedAt : undefined,
    maturityAt: typeof snapshot.maturityAt === 'string' ? snapshot.maturityAt : undefined,
    withdrawnAt: typeof snapshot.withdrawnAt === 'string' ? snapshot.withdrawnAt : undefined,
    commoditySelection:
      snapshot.commoditySelection && typeof snapshot.commoditySelection === 'object'
        ? (snapshot.commoditySelection as Record<string, unknown>)
        : undefined,
    ...(wallet?.walletId
      ? {
          productWallet: {
            walletId: wallet.walletId,
            accountNumber: upstream?.accountNumber,
            bankName: upstream?.bankName,
            bankCode: upstream?.bankCode,
            provisionStatus: upstream?.provisionStatus
          }
        }
      : {}),
    ...(snapshot.purchaseReferenceId
      ? {
          purchase: {
            referenceId: String(snapshot.purchaseReferenceId),
            basePrice: principal,
            commissionAmount: Number(snapshot.commissionAmount ?? 0),
            totalAmount: Number(snapshot.totalPaidAmount ?? principal),
            commissionRatePercent: Number(snapshot.commissionRatePercent ?? 0)
          }
        }
      : {})
  };
}

function buildCommodityContractSnapshot(args: {
  product: Product;
  currency: string;
  applicantName?: string;
  commoditySelection: Record<string, unknown>;
  principal: number;
  fundedAt: string;
  maturityAt: string;
  offerYieldPercent: number;
  expectedInterest: number;
}): Record<string, unknown> {
  return {
    amount: args.principal,
    currency: args.currency.trim().toUpperCase(),
    commodityPrincipal: args.principal,
    commodityHoldingStatus: 'LOCKED',
    commoditySelection: args.commoditySelection,
    productId: args.product.id,
    productName: args.product.name,
    productType: args.product.type,
    structure: args.product.structure,
    about: args.product.about,
    feesAndCharges: args.product.feesAndCharges,
    offerYieldPercent: args.offerYieldPercent,
    expectedInterest: args.expectedInterest,
    fundedAt: args.fundedAt,
    maturityAt: args.maturityAt,
    inventoryAmount: args.principal,
    salesAmount: args.principal,
    ...(args.applicantName ? { applicantName: args.applicantName } : {})
  };
}

class CommodityAccountService {
  private async resolveOfferingMerchantId(
    input: ApplyCommodityAccountRequest,
    productAppId: string,
    req?: Request
  ): Promise<string> {
    const fromBody = input.merchantId?.trim();
    if (fromBody) return fromBody;

    const fromTenant = req ? headerValue(req, 'x-tenant-merchant-id') : undefined;
    if (fromTenant) return fromTenant;

    const appInfo = await createAppService.getAppInfo(input.appId?.trim() || productAppId);
    if (appInfo?.merchantId?.trim()) {
      return appInfo.merchantId.trim();
    }

    throw new ApiError(400, 'merchantId is required for commodity enrollment');
  }

  private async resolveCommodityProduct(input: ApplyCommodityAccountRequest, req?: Request) {
    const productDoc = await ProductModel.findById(input.productId.trim());
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    const product = toProduct(productDoc);
    const normalizedType = String(product.type || '').trim().toUpperCase();
    if (normalizedType !== 'COMMODITY') {
      throw new ApiError(400, 'Product is not a commodity product');
    }

    if (product.isActive !== true || !product.appId) {
      throw new ApiError(403, 'Product is not active for this app. Only active products can be applied for.');
    }

    if (!(product.upstreamProductId || '').trim()) {
      throw new ApiError(
        400,
        'Product has no upstreamProductId; activate the product from the Plata catalog before enrolling'
      );
    }

    const requestedAppId =
      input.appId?.trim() || (req ? headerValue(req, 'x-tenant-app-id') : undefined) || product.appId;
    if (requestedAppId !== product.appId) {
      throw new ApiError(400, 'Application appId does not match product appId');
    }

    return { product, appId: product.appId };
  }

  private async withApplicantName(
    input: ApplyCommodityAccountRequest,
    authorizationHeader?: string
  ): Promise<ApplyCommodityAccountRequest> {
    if (input.applicantName?.trim()) {
      return { ...input, applicantName: input.applicantName.trim() };
    }
    const applicantName = await clientAuthUserService.resolveApplicantName(
      input.userId,
      authorizationHeader,
      input.email
    );
    return applicantName ? { ...input, applicantName } : input;
  }

  private async withUserPhone(
    input: ApplyCommodityAccountRequest,
    authorizationHeader?: string
  ): Promise<ApplyCommodityAccountRequest> {
    if (input.phone?.trim()) return { ...input, phone: input.phone.trim() };
    const resolvedPhone = await clientAuthUserService.resolveUserPhone(input.userId, authorizationHeader);
    if (!resolvedPhone) {
      throw new ApiError(400, 'Phone number is required. Update your profile phone number first.');
    }
    return { ...input, phone: resolvedPhone };
  }

  private async withComplianceBvn(input: ApplyCommodityAccountRequest): Promise<ApplyCommodityAccountRequest> {
    const bvn = input.bvn?.replace(/\D/g, '') || (await complianceBvnService.resolveUserBvn(input.userId));
    if (!bvn) {
      throw new ApiError(400, 'BVN is required. Complete Fuspay KYC first.');
    }
    if (!/^\d{11}$/.test(bvn)) {
      throw new ApiError(400, 'BVN must be exactly 11 digits');
    }
    return { ...input, bvn };
  }

  private async syncSnapshotToPlata(
    application: IProductApplicationDocument,
    product: Product,
    contractSnapshot: Record<string, unknown>,
    applicantName: string,
    email: string,
    phone: string,
    bvn: string
  ): Promise<void> {
    const offeringMerchantName = await merchantDisplayNameService.resolveOfferingMerchantName({
      merchantId: application.merchantId!,
      appId: application.appId!,
      fallback: undefined
    });

    const upstream = await upstreamApplicationService.syncSavingsDepositSnapshot({
      localApplicationId: application._id.toString(),
      product,
      userId: application.userId,
      applicantName,
      email,
      phone,
      bvn,
      currency: application.currency,
      offeringMerchantId: application.merchantId!,
      offeringMerchantName,
      contractSnapshot
    });

    if (upstream.skipReason) {
      throw new ApiError(502, `Plata commodity funding sync failed: ${upstream.skipReason}`);
    }
  }

  async applyForCommodity(
    input: ApplyCommodityAccountRequest,
    req?: Request
  ): Promise<{ account: CommodityAccountResponse; applicationId: string }> {
    const authorizationHeader = req?.get('authorization');
    const { product, appId } = await this.resolveCommodityProduct(input, req);
    const offeringMerchantId = await this.resolveOfferingMerchantId({ ...input, appId }, appId, req);

    let purchase: { amount: number; selection: Record<string, unknown> };
    try {
      purchase = resolveCommodityPurchaseAmount(product, input.quantity);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : 'Invalid commodity quantity');
    }

    const requirementSubmissions = input.requirementSubmissions ?? [];
    validateRequirementSubmissions(product.requirements, requirementSubmissions);

    const inputWithApplicantName = await this.withApplicantName(input, authorizationHeader);
    const inputWithPhone = await this.withUserPhone(inputWithApplicantName, authorizationHeader);
    const resolvedInput = await this.withComplianceBvn(inputWithPhone);

    if (!resolvedInput.email?.trim()) {
      throw new ApiError(400, 'email is required for commodity enrollment');
    }
    if (!resolvedInput.applicantName?.trim()) {
      throw new ApiError(400, 'applicantName is required for commodity enrollment');
    }

    const platformFields = validatePlatformApplicationFields({
      ...extractPlatformFieldInput(resolvedInput),
      productType: product.type,
      status: 'submitted'
    });

    const offeringMerchantName = await merchantDisplayNameService.resolveOfferingMerchantName({
      merchantId: offeringMerchantId,
      appId,
      fallback: undefined
    });

    const fundedAt = new Date();
    const maturityAt = computeMaturityDate(fundedAt, product);
    const { ratePercent: offerYieldPercent } = resolveOfferYieldPercent(product);
    const expectedInterest = calculateCommodityFlatInterest(purchase.amount, product);

    const contractSnapshot = buildCommodityContractSnapshot({
      product,
      currency: resolvedInput.currency,
      applicantName: resolvedInput.applicantName,
      commoditySelection: purchase.selection,
      principal: purchase.amount,
      fundedAt: fundedAt.toISOString(),
      maturityAt: maturityAt.toISOString(),
      offerYieldPercent,
      expectedInterest
    });

    const application = await ProductApplicationModel.create({
      userId: resolvedInput.userId.trim(),
      productId: product.id,
      productName: product.name,
      productType: product.type,
      amount: purchase.amount,
      currency: resolvedInput.currency.trim().toUpperCase(),
      email: resolvedInput.email.trim(),
      status: 'APPROVED',
      appId,
      merchantId: offeringMerchantId,
      requirementsSnapshot: product.requirements,
      contractSnapshot,
      requirementSubmissions,
      ...platformFields
    });

    void sendCommodityOrderReceivedNotification({
      userId: application.userId,
      email: resolvedInput.email.trim(),
      applicantName: resolvedInput.applicantName.trim(),
      productName: product.name
    });

    try {
      const upstream = await upstreamApplicationService.submitSavingsEnrollment({
        localApplicationId: application._id.toString(),
        product,
        userId: resolvedInput.userId.trim(),
        applicantName: resolvedInput.applicantName.trim(),
        email: resolvedInput.email.trim(),
        phone: resolvedInput.phone!.trim(),
        bvn: resolvedInput.bvn!.trim(),
        country: resolvedInput.country,
        currency: application.currency,
        offeringMerchantId,
        offeringMerchantName,
        contractSnapshot,
        isPoliticallyExposedPerson: platformFields.isPoliticallyExposedPerson,
        monthlyIncome: platformFields.monthlyIncome,
        repaymentSource: platformFields.repaymentSource,
        repaymentSourceOther: platformFields.repaymentSourceOther,
        maritalStatus: platformFields.maritalStatus,
        maritalStatusOther: platformFields.maritalStatusOther
      });

      if (upstream.skipReason) {
        throw new ApiError(502, `Plata commodity enrollment failed: ${upstream.skipReason}`);
      }

      if (upstream.upstreamApplicationId) {
        application.upstreamApplicationId = upstream.upstreamApplicationId;
        application.upstreamSyncError = undefined;
      }

      if (upstream.upstreamAccount) {
        application.productWallet = {
          walletId:
            upstream.upstreamAccount.providerReference ||
            upstream.upstreamApplicationId ||
            `plata:${application._id.toString()}`,
          walletPurpose: 'PLATA_PRODUCT_APPLICATION',
          reusedUpstreamAccount: false,
          upstreamAccount: upstream.upstreamAccount
        };
        if (!upstream.upstreamAccount.accountNumber && upstream.upstreamAccount.provisionError) {
          application.upstreamSyncError = upstream.upstreamAccount.provisionError;
        }
      }

      if (!upstream.upstreamApplicationId) {
        throw new ApiError(502, 'Plata did not return a commodity application id');
      }

      const referenceId = `commodity-enrollment:${application._id.toString()}`;
      const settlement = await executeCommodityEnrollmentSettlement({
        userId: resolvedInput.userId.trim(),
        offeringMerchantId,
        offeringAppId: appId,
        productId: product.id,
        applicationId: application._id.toString(),
        upstreamApplicationId: upstream.upstreamApplicationId,
        baseAmount: purchase.amount,
        currency: application.currency,
        product,
        referenceId
      });

      const updatedSnapshot = {
        ...contractSnapshot,
        purchaseReferenceId: settlement.referenceId,
        commissionAmount: settlement.commissionAmount,
        commissionRatePercent: settlement.commissionRatePercent,
        totalPaidAmount: settlement.totalAmount,
        creatorMerchantId: settlement.creatorMerchantId,
        creatorAppId: settlement.creatorAppId
      };

      application.contractSnapshot = updatedSnapshot;
      application.amount = purchase.amount;
      await application.save();

      await this.syncSnapshotToPlata(
        application,
        product,
        updatedSnapshot,
        resolvedInput.applicantName.trim(),
        resolvedInput.email.trim(),
        resolvedInput.phone!.trim(),
        resolvedInput.bvn!.trim()
      );

      void sendCommodityEnrollmentNotifications({
        userId: application.userId,
        email: resolvedInput.email.trim(),
        applicantName: resolvedInput.applicantName.trim(),
        productName: product.name,
        applicationId: application._id.toString(),
        principal: purchase.amount,
        expectedInterest,
        maturityAt: maturityAt.toISOString(),
        currency: application.currency,
        merchantName: offeringMerchantName
      });

      return {
        account: toCommodityAccountResponse(application),
        applicationId: application._id.toString()
      };
    } catch (error) {
      await ProductApplicationModel.findByIdAndDelete(application._id).exec();
      if (error instanceof ApiError) throw error;
      if (error instanceof CommodityEnrollmentSettlementError) {
        const status = error.code === 'INSUFFICIENT_FUNDS' ? 402 : error.code === 'CONFIG_ERROR' ? 503 : 502;
        throw new ApiError(status, error.message);
      }
      const message = error instanceof Error ? error.message : 'Failed to enroll in commodity product';
      throw new ApiError(502, message);
    }
  }

  async getCommodityAccount(applicationId: string, userId: string): Promise<CommodityAccountResponse> {
    const application = await ProductApplicationModel.findById(applicationId);
    if (!application) {
      throw new ApiError(404, 'Commodity account not found');
    }
    if (application.userId !== userId.trim()) {
      throw new ApiError(403, 'Commodity account does not belong to this user');
    }
    const productType = String(application.productType || '').trim().toUpperCase();
    if (productType !== 'COMMODITY') {
      throw new ApiError(400, 'Application is not a commodity account');
    }
    return toCommodityAccountResponse(application);
  }
}

export default new CommodityAccountService();
