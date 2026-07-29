import type { Request } from 'express';
import { ProductModel, toProduct } from '../models/ProductModel';
import {
  ProductApplicationModel,
  type IProductApplicationDocument
} from '../models/ProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';
import type { Product } from '../types/product';
import createAppService from './createAppService';
import upstreamApplicationService from './upstreamApplicationService';
import complianceBvnService from './complianceBvnService';
import clientAuthUserService from './clientAuthUserService';
import merchantDisplayNameService from './merchantDisplayNameService';
import walletService from './walletService';
import type {
  CreateInvestmentAccountRequest,
  InvestmentAccountResponse
} from '../types/investmentAccount';

function headerValue(req: Request, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function investmentBalanceFrom(application: IProductApplicationDocument): number {
  const snapshot = application.contractSnapshot as Record<string, unknown> | undefined;
  const balance =
    snapshot?.investmentBalance ?? snapshot?.currentBalance ?? snapshot?.balance ?? snapshot?.savingsBalance;
  return typeof balance === 'number' && Number.isFinite(balance) && balance >= 0 ? balance : 0;
}

function buildInvestmentContractSnapshot(
  product: Product,
  currency: string,
  applicantName?: string
): Record<string, unknown> {
  return {
    amount: 0,
    currency: currency.trim().toUpperCase(),
    investmentBalance: 0,
    currentBalance: 0,
    productId: product.id,
    productName: product.name,
    productType: product.type,
    structure: product.structure,
    about: product.about,
    feesAndCharges: product.feesAndCharges,
    ...(applicantName ? { applicantName } : {})
  };
}

function toInvestmentAccountResponse(application: IProductApplicationDocument): InvestmentAccountResponse {
  const wallet = application.productWallet;
  const upstream = wallet?.upstreamAccount;

  return {
    id: application._id.toString(),
    userId: application.userId,
    accountType: 'investment',
    balance: investmentBalanceFrom(application),
    currency: application.currency,
    status: application.status === 'APPROVED' ? 'active' : 'pending_kyc',
    productId: application.productId,
    productName: application.productName,
    applicationId: application._id.toString(),
    appId: application.appId,
    merchantId: application.merchantId,
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
      : {})
  };
}

class InvestmentAccountService {
  private async resolveOfferingMerchantId(
    input: CreateInvestmentAccountRequest,
    productAppId: string,
    req?: Request
  ): Promise<string> {
    const fromBody = input.merchantId?.trim();
    if (fromBody) {
      return fromBody;
    }

    const fromTenant = req ? headerValue(req, 'x-tenant-merchant-id') : undefined;
    if (fromTenant) {
      return fromTenant;
    }

    const appInfo = await createAppService.getAppInfo(input.appId?.trim() || productAppId);
    if (appInfo?.merchantId?.trim()) {
      return appInfo.merchantId.trim();
    }

    throw new ApiError(400, 'merchantId is required for investment account creation');
  }

  private async resolveInvestmentProduct(input: CreateInvestmentAccountRequest, req?: Request) {
    const productDoc = await ProductModel.findById(input.productId.trim());
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    const product = toProduct(productDoc);
    const normalizedType = String(product.type || '').trim().toUpperCase();
    if (normalizedType !== 'INVESTMENT') {
      throw new ApiError(400, 'Product is not an investment product');
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
    input: CreateInvestmentAccountRequest,
    authorizationHeader?: string
  ): Promise<CreateInvestmentAccountRequest> {
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
    input: CreateInvestmentAccountRequest,
    authorizationHeader?: string
  ): Promise<CreateInvestmentAccountRequest> {
    const phone = input.phone?.trim();
    if (phone) {
      return { ...input, phone };
    }

    const resolvedPhone = await clientAuthUserService.resolveUserPhone(input.userId, authorizationHeader);
    if (!resolvedPhone) {
      throw new ApiError(400, 'Phone number is required. Update your profile phone number first.');
    }

    return { ...input, phone: resolvedPhone };
  }

  private async withComplianceBvn(
    input: CreateInvestmentAccountRequest
  ): Promise<CreateInvestmentAccountRequest> {
    const bvn = input.bvn?.replace(/\D/g, '') || (await complianceBvnService.resolveUserBvn(input.userId));
    if (!bvn) {
      throw new ApiError(400, 'BVN is required. Complete Fuspay KYC first.');
    }
    if (!/^\d{11}$/.test(bvn)) {
      throw new ApiError(400, 'BVN must be exactly 11 digits');
    }
    return { ...input, bvn };
  }

  private async findExistingInvestmentEnrollment(
    input: CreateInvestmentAccountRequest,
    productId: string,
    appId: string,
    offeringMerchantId: string
  ): Promise<IProductApplicationDocument | null> {
    return ProductApplicationModel.findOne({
      userId: input.userId.trim(),
      productId,
      appId,
      merchantId: offeringMerchantId,
      productType: { $in: ['INVESTMENT', 'Investment'] },
      status: 'APPROVED'
    })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async createInvestmentAccount(
    input: CreateInvestmentAccountRequest,
    req?: Request
  ): Promise<{ account: InvestmentAccountResponse; created: boolean; applicationId: string }> {
    const authorizationHeader = req?.get('authorization');
    const { product, appId } = await this.resolveInvestmentProduct(input, req);
    const offeringMerchantId = await this.resolveOfferingMerchantId({ ...input, appId }, appId, req);

    const existing = await this.findExistingInvestmentEnrollment(
      input,
      product.id,
      appId,
      offeringMerchantId
    );
    if (existing) {
      return {
        account: toInvestmentAccountResponse(existing),
        created: false,
        applicationId: existing._id.toString()
      };
    }

    const inputWithApplicantName = await this.withApplicantName(input, authorizationHeader);
    const inputWithPhone = await this.withUserPhone(inputWithApplicantName, authorizationHeader);
    const resolvedInput = await this.withComplianceBvn(inputWithPhone);

    if (!resolvedInput.email?.trim()) {
      throw new ApiError(400, 'email is required for investment enrollment');
    }
    if (!resolvedInput.applicantName?.trim()) {
      throw new ApiError(400, 'applicantName is required for investment enrollment');
    }
    if (typeof resolvedInput.isPoliticallyExposedPerson !== 'boolean') {
      throw new ApiError(400, 'isPoliticallyExposedPerson is required (true or false)');
    }
    if (resolvedInput.monthlyIncome === undefined || resolvedInput.monthlyIncome === null) {
      throw new ApiError(400, 'monthlyIncome is required');
    }
    if (!resolvedInput.repaymentSource?.trim()) {
      throw new ApiError(400, 'repaymentSource is required');
    }
    if (!resolvedInput.maritalStatus?.trim()) {
      throw new ApiError(400, 'maritalStatus is required');
    }

    const offeringMerchantName = await merchantDisplayNameService.resolveOfferingMerchantName({
      merchantId: offeringMerchantId,
      appId,
      fallback: undefined
    });

    const contractSnapshot = buildInvestmentContractSnapshot(
      product,
      resolvedInput.currency,
      resolvedInput.applicantName
    );

    const application = await ProductApplicationModel.create({
      userId: resolvedInput.userId.trim(),
      productId: product.id,
      productName: product.name,
      productType: product.type,
      amount: 0,
      currency: resolvedInput.currency.trim().toUpperCase(),
      email: resolvedInput.email.trim(),
      status: 'APPROVED',
      appId,
      merchantId: offeringMerchantId,
      requirementsSnapshot: product.requirements,
      contractSnapshot,
      requirementSubmissions: [],
      loanWorkflowStatus: 'account_created',
      isPoliticallyExposedPerson: resolvedInput.isPoliticallyExposedPerson,
      monthlyIncome: Number(resolvedInput.monthlyIncome),
      repaymentSource: resolvedInput.repaymentSource.trim(),
      ...(resolvedInput.repaymentSourceOther
        ? { repaymentSourceOther: resolvedInput.repaymentSourceOther.trim() }
        : {}),
      maritalStatus: resolvedInput.maritalStatus.trim(),
      ...(resolvedInput.maritalStatusOther
        ? { maritalStatusOther: resolvedInput.maritalStatusOther.trim() }
        : {})
    });

    try {
      // Same Plata external-applications enrollment path as savings (creator app + global product).
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
        isPoliticallyExposedPerson: resolvedInput.isPoliticallyExposedPerson,
        monthlyIncome: Number(resolvedInput.monthlyIncome),
        repaymentSource: resolvedInput.repaymentSource.trim(),
        repaymentSourceOther: resolvedInput.repaymentSourceOther?.trim(),
        maritalStatus: resolvedInput.maritalStatus.trim(),
        maritalStatusOther: resolvedInput.maritalStatusOther?.trim()
      });

      if (upstream.skipReason) {
        throw new ApiError(502, `Plata investment enrollment failed: ${upstream.skipReason}`);
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
        throw new ApiError(502, 'Plata did not return an investment application id');
      }

      // Spring PRODUCT wallet powers storefront Total Investment (product-type-summary).
      // Prefer linking the user's existing primary NUBAN when Plata fixed-account provision failed.
      try {
        const springWallet = await walletService.ensureProductWallet({
          userId: resolvedInput.userId.trim(),
          merchantId: offeringMerchantId,
          applicationId: application._id.toString(),
          productId: product.id,
          productName: product.name,
          productType: product.type,
          appId,
          currency: application.currency
        });
        const nuban = springWallet.wallet.virtualNuban;
        if (nuban?.accountNumber || !application.productWallet?.upstreamAccount?.accountNumber) {
          application.productWallet = {
            walletId: springWallet.wallet.id,
            walletPurpose: springWallet.wallet.walletPurpose || 'PRODUCT',
            reusedUpstreamAccount: springWallet.reusedUpstreamAccount === true,
            upstreamAccount: {
              accountNumber: nuban?.accountNumber,
              bankName: nuban?.bankName,
              bankCode: nuban?.bankCode,
              providerReference: nuban?.providerReference,
              provisionStatus: (nuban?.provisionStatus as 'active' | 'failed' | undefined) ||
                (nuban?.accountNumber ? 'active' : 'failed'),
              provisionError: nuban?.provisionError
            }
          };
          if (nuban?.accountNumber) {
            application.upstreamSyncError = undefined;
          }
        }
      } catch (walletError) {
        const message =
          walletError instanceof Error ? walletError.message : 'Failed to ensure Spring product wallet';
        console.warn('Investment Spring PRODUCT wallet ensure failed (enrollment continues):', message);
        if (!application.upstreamSyncError) {
          application.upstreamSyncError = message;
        }
      }

      await application.save();
    } catch (error) {
      await ProductApplicationModel.findByIdAndDelete(application._id).exec();
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Failed to sync investment enrollment to Plata';
      throw new ApiError(502, message);
    }

    return {
      account: toInvestmentAccountResponse(application),
      created: true,
      applicationId: application._id.toString()
    };
  }
}

export default new InvestmentAccountService();
