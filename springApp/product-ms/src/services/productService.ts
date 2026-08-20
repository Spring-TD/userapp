import { Product, ProductStructure } from '../types/product';
import {
  ProductConfiguration,
  MerchantProductConfiguration,
  CreateProductConfigurationRequest,
  UpdateProductConfigurationRequest
} from '../types/productConfiguration';
import axios from 'axios';
import { config } from '../config/environment';
import { ProductModel, toProduct } from '../models/ProductModel';
import { normalizeProductType } from '../utils/productType';
import { deepMerge } from '../utils/deepMerge';
import { ApiError } from '../middleware/errorHandler';
import { sanitizeSpringMerchantFeeAdditions } from '../utils/managementFee';
import { refreshInProgressApplicationsFromProduct } from './pendingApplicationProductSync';

function asPlainObjectRecord(value: unknown): Record<string, unknown> | undefined {
  if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export class ProductService {
  private toNumeric(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/,/g, '').trim();
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  private mergeFeeItems(
    baseItems: Array<{ name: string; feeType?: string; value?: string }> = [],
    merchantItems: Array<{ name: string; feeType?: string; value?: string }> = []
  ): Array<{ name: string; feeType?: string; value?: string }> {
    const additionsByKey = new Map<string, { item: { name: string; feeType?: string; value?: string }; delta: number }>();
    for (const item of merchantItems) {
      const name = item.name.trim();
      const feeType = (item.feeType ?? '').trim();
      if (!name) continue;
      const delta = this.toNumeric(item.value);
      if (delta < 0) {
        throw new Error(`Merchant addition cannot be negative for fee "${name}"`);
      }
      additionsByKey.set(`${name.toLowerCase()}|${feeType.toLowerCase()}`, { item, delta });
    }

    const matchedBaseKeys = new Set<string>();
    const mergedBaseItems = baseItems.map((baseItem) => {
      const name = baseItem.name.trim();
      const feeType = (baseItem.feeType ?? '').trim();
      const key = `${name.toLowerCase()}|${feeType.toLowerCase()}`;
      const baseValue = this.toNumeric(baseItem.value);
      const merchantDelta = additionsByKey.get(key)?.delta ?? 0;
      matchedBaseKeys.add(key);
      return {
        ...baseItem,
        value: String(baseValue + merchantDelta)
      };
    });

    const merchantOnlyItems = Array.from(additionsByKey.entries())
      .filter(([key]) => !matchedBaseKeys.has(key))
      .map(([, addition]) => ({
        ...addition.item,
        value: String(addition.delta)
      }));

    return [...mergedBaseItems, ...merchantOnlyItems];
  }

  private mergePenaltyItems(
    baseItems: Array<{ name?: string; penaltyType?: string; value?: string; triggerDurationDays?: number }> = [],
    merchantItems: Array<{ name?: string; penaltyType?: string; value?: string; triggerDurationDays?: number }> = []
  ): Array<{ name?: string; penaltyType?: string; value?: string; triggerDurationDays?: number }> {
    const additionsByKey = new Map<
      string,
      { item: { name?: string; penaltyType?: string; value?: string; triggerDurationDays?: number }; delta: number }
    >();
    for (const item of merchantItems) {
      const name = (item.name ?? '').trim();
      const penaltyType = (item.penaltyType ?? '').trim();
      const trigger = item.triggerDurationDays ?? 0;
      if (!name) continue;
      const delta = this.toNumeric(item.value);
      if (delta < 0) {
        throw new Error(`Merchant addition cannot be negative for penalty "${name}"`);
      }
      additionsByKey.set(`${name.toLowerCase()}|${penaltyType.toLowerCase()}|${trigger}`, { item, delta });
    }

    const matchedBaseKeys = new Set<string>();
    const mergedBaseItems = baseItems.map((baseItem) => {
      const name = (baseItem.name ?? '').trim();
      const penaltyType = (baseItem.penaltyType ?? '').trim();
      const trigger = baseItem.triggerDurationDays ?? 0;
      const key = `${name.toLowerCase()}|${penaltyType.toLowerCase()}|${trigger}`;
      const baseValue = this.toNumeric(baseItem.value);
      const merchantDelta = additionsByKey.get(key)?.delta ?? 0;
      matchedBaseKeys.add(key);
      return {
        ...baseItem,
        value: String(baseValue + merchantDelta)
      };
    });

    const merchantOnlyItems = Array.from(additionsByKey.entries())
      .filter(([key]) => !matchedBaseKeys.has(key))
      .map(([, addition]) => ({
        ...addition.item,
        value: String(addition.delta)
      }));

    return [...mergedBaseItems, ...merchantOnlyItems];
  }

  private computeTotalFeesAndCharges(
    baseFees?: Product['feesAndCharges'],
    merchantAdditions?: Product['merchantFeeAdditions']
  ): Product['feesAndCharges'] | undefined {
    if (!baseFees) {
      return undefined;
    }

    // Spring merchants may only mark up Management Fee — never late/forceful penalties or other fees.
    return {
      ...baseFees,
      fees: this.mergeFeeItems(baseFees.fees, merchantAdditions?.fees),
      lateRepayment: baseFees.lateRepayment,
      forcefulWithdrawalPenalties: baseFees.forcefulWithdrawalPenalties
    };
  }

  private sanitizeMerchantFeeAdditions(additions?: Product['merchantFeeAdditions']): Product['merchantFeeAdditions'] | undefined {
    return sanitizeSpringMerchantFeeAdditions(additions);
  }

  private structureInterestValue(structure?: ProductStructure): number {
    const raw = structure?.interestRate;
    return this.toNumeric(raw);
  }

  private computeTotalInterestRate(
    baseStructure?: ProductStructure,
    merchantAdditions?: Partial<ProductStructure>
  ): number | undefined {
    const base = this.structureInterestValue(baseStructure);
    const addition = this.structureInterestValue(merchantAdditions);
    if (base <= 0 && addition <= 0) {
      return undefined;
    }
    return base + addition;
  }

  private computeTotalEquity(base?: number, addition?: number): number | undefined {
    const baseValue = this.toNumeric(base);
    const additionValue = this.toNumeric(addition);
    if (baseValue <= 0 && additionValue <= 0) {
      return undefined;
    }
    return baseValue + additionValue;
  }

  private applyPricingTotals(product: Product): Product {
    const baseStructure = product.baseStructure ?? product.structure;
    const totalInterest = this.computeTotalInterestRate(baseStructure, product.merchantStructureAdditions);
    const totalEquity = this.computeTotalEquity(product.baseEquityContribution, product.merchantEquityAddition);

    const next: Product = {
      ...product,
      structure:
        totalInterest !== undefined
          ? {
              ...(product.structure ?? baseStructure ?? {}),
              interestRate: totalInterest
            }
          : product.structure,
      equityContribution: totalEquity ?? product.equityContribution
    };

    if (next.type === 'MORTGAGE' && totalEquity !== undefined && next.propertyValue !== undefined) {
      const propertyValue = this.toNumeric(next.propertyValue);
      const downPayment = (propertyValue * totalEquity) / 100;
      (next as Product & { calculatedConfig?: Record<string, unknown> }).calculatedConfig = {
        mortgage: {
          equityContributionPercent: totalEquity,
          baseEquityContributionPercent: this.toNumeric(next.baseEquityContribution),
          merchantEquityAdditionPercent: this.toNumeric(next.merchantEquityAddition),
          propertyValue,
          estimatedDownPayment: downPayment,
          estimatedFinancedAmount: propertyValue - downPayment,
          baseInterestRatePercent: this.structureInterestValue(baseStructure),
          merchantInterestAdditionPercent: this.structureInterestValue(product.merchantStructureAdditions),
          totalInterestRatePercent: totalInterest
        }
      };
    }

    return next;
  }

  private async hydratePricingLayers(product: Product): Promise<Product> {
    let next = { ...product };

    if ((!next.baseStructure || next.baseEquityContribution === undefined) && next.upstreamProductId) {
      const upstream = await this.fetchUpstreamProductById(next.upstreamProductId);
      if (upstream) {
        if (!next.baseStructure) {
          next.baseStructure = upstream.structure;
        }
        if (next.baseEquityContribution === undefined) {
          next.baseEquityContribution = upstream.equityContribution;
        }
      }
    }

    if (
      next.merchantStructureAdditions?.interestRate === undefined &&
      next.structure?.interestRate !== undefined &&
      next.baseStructure
    ) {
      const storedInterest = this.structureInterestValue(next.structure);
      const baseInterest = this.structureInterestValue(next.baseStructure);
      if (storedInterest !== baseInterest) {
        next.merchantStructureAdditions = {
          ...(next.merchantStructureAdditions ?? {}),
          interestRate: storedInterest <= baseInterest ? storedInterest : storedInterest - baseInterest
        };
      }
    }

    if (
      next.merchantEquityAddition === undefined &&
      next.equityContribution !== undefined &&
      next.baseEquityContribution !== undefined &&
      next.equityContribution !== next.baseEquityContribution
    ) {
      next.merchantEquityAddition = this.toNumeric(next.equityContribution);
    }

    return this.applyPricingTotals(next);
  }

  private normalizeMerchantPricingUpdate(
    localProduct: Product,
    updateData: Partial<Product>
  ): Partial<Product> {
    const body: Partial<Product> = { ...updateData };

    if (body.structure?.interestRate !== undefined) {
      body.merchantStructureAdditions = {
        ...(localProduct.merchantStructureAdditions ?? {}),
        ...(body.merchantStructureAdditions ?? {}),
        interestRate: body.structure.interestRate
      };
      const { interestRate: _ignored, ...restStructure } = body.structure;
      body.structure = Object.keys(restStructure).length > 0 ? restStructure : undefined;
    }

    if (body.equityContribution !== undefined) {
      body.merchantEquityAddition = body.equityContribution;
      delete body.equityContribution;
    }

    if (body.merchantStructureAdditions || body.merchantEquityAddition !== undefined) {
      const baseStructure = localProduct.baseStructure ?? localProduct.structure;
      const totalInterest = this.computeTotalInterestRate(baseStructure, body.merchantStructureAdditions ?? localProduct.merchantStructureAdditions);
      const totalEquity = this.computeTotalEquity(
        localProduct.baseEquityContribution,
        body.merchantEquityAddition ?? localProduct.merchantEquityAddition
      );
      body.structure = {
        ...(localProduct.structure ?? {}),
        ...(body.structure ?? {}),
        ...(totalInterest !== undefined ? { interestRate: totalInterest } : {})
      };
      if (totalEquity !== undefined) {
        body.equityContribution = totalEquity;
      }
    }

    return body;
  }

  private toCustomerProduct(product: Product): Product {
    const priced = this.applyPricingTotals(product);
    const next = { ...priced };
    delete next.baseFeesAndCharges;
    delete next.merchantFeeAdditions;
    delete next.baseStructure;
    delete next.merchantStructureAdditions;
    delete next.baseEquityContribution;
    delete next.merchantEquityAddition;
    // #region agent log
    fetch('http://127.0.0.1:7802/ingest/814893a7-2133-4c94-a7cf-f8a536fa7238',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f5129'},body:JSON.stringify({sessionId:'7f5129',location:'productService.ts:toCustomerProduct',message:'customer product pricing',data:{productId:next.id,name:next.name,interestRate:next.structure?.interestRate,equityContribution:next.equityContribution,calculatedMortgage:(next as Product & {calculatedConfig?: {mortgage?: unknown}}).calculatedConfig?.mortgage},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return next;
  }
  /**
   * Plata gateway reads these headers only (no Authorization / Bearer).
   * Values come from PLATA_PUBLIC_KEY / PLATA_SECRET_KEY in env → forwarded to service-auth as public_key / secret_key.
   */
  private getUpstreamAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (config.plataPublicKey) headers['PLATA_PUBLIC_KEY'] = config.plataPublicKey;
    if (config.plataSecretKey) headers['PLATA_SECRET_KEY'] = config.plataSecretKey;
    return headers;
  }

  private logUpstreamError(context: string, error: unknown): void {
    if (axios.isAxiosError(error)) {
      console.error(context, error.response?.data ?? error.message);
    } else {
      console.error(context, error);
    }
  }

  private async fetchUpstreamProductById(id: string): Promise<Product | null> {
    try {
      const response = await axios.get(`${config.plataAccountServiceUrl}/api/v1/products/${id}`, {
        headers: this.getUpstreamAuthHeaders()
      });
      const product = response.data.data || null;
      if (!product || product.merchant) {
        return product;
      }
      const catalogProduct = await this.fetchUpstreamCatalogProductById(id);
      return catalogProduct ? { ...product, merchant: catalogProduct.merchant } : product;
    } catch (error) {
      this.logUpstreamError('Error fetching upstream product by ID from server:', error);
      return null;
    }
  }

  private async fetchUpstreamCatalogProductById(id: string): Promise<Product | null> {
    try {
      const response = await axios.get(`${config.plataAccountServiceUrl}/api/v1/products`, {
        headers: this.getUpstreamAuthHeaders()
      });
      const products = Array.isArray(response.data?.data) ? (response.data.data as Product[]) : [];
      return products.find((product) => product.id === id || product.referenceNumber === id) ?? null;
    } catch (error) {
      this.logUpstreamError('Error fetching upstream catalog product from server:', error);
      return null;
    }
  }

  private async getLocalProductById(id: string): Promise<Product | null> {
    try {
      const doc = await ProductModel.findById(id);
      return doc ? toProduct(doc) : null;
    } catch {
      return null;
    }
  }

  private buildLocalProductPayload(product: Product, appId: string, isActive: boolean): Omit<Product, 'id'> {
    const now = new Date().toISOString();
    return {
      upstreamProductId: product.id,
      upstreamAppId: product.appId,
      referenceNumber: product.referenceNumber,
      name: product.name,
      description: product.description ?? '',
      type: normalizeProductType(product.type),
      subType: product.subType,
      appId,
      status: product.status ?? 'incomplete',
      isActive,
      isFeatured: false,
      requireApplicantSignature: product.requireApplicantSignature === true,
      createdAt: product.createdAt || now,
      updatedAt: now,
      metadata: product.metadata,
      structure: product.structure,
      about: product.about,
      requirements: product.requirements,
      feesAndCharges: product.feesAndCharges,
      baseFeesAndCharges: product.feesAndCharges,
      merchantFeeAdditions: undefined,
      baseStructure: product.structure,
      merchantStructureAdditions: undefined,
      baseEquityContribution: product.equityContribution,
      merchantEquityAddition: undefined,
      properties: product.properties,
      mortgageWorkflowStepOrder: product.mortgageWorkflowStepOrder,
      inspectionDates: product.inspectionDates,
      config: product.config,
      equityContribution: product.equityContribution,
      propertyValue: product.propertyValue,
      price: product.price,
      minimumQuantity: product.minimumQuantity,
      unitOfMeasure: product.unitOfMeasure,
      commodityPrices: product.commodityPrices,
      merchant: product.merchant
    };
  }

  private getModelForType(type: string) {
    const normalized = normalizeProductType(type);
    const discriminators = ProductModel.discriminators ?? {};
    return (discriminators[normalized] as typeof ProductModel | undefined) ?? ProductModel;
  }

  private buildMergedSetPayload(
    existing: Product,
    update: Partial<Omit<Product, 'id'>>
  ): Record<string, unknown> {
    const setPayload: Record<string, unknown> = {
      ...update,
      updatedAt: new Date().toISOString()
    };

    for (const key of ['structure', 'about', 'requirements', 'metadata', 'config'] as const) {
      const incoming = update[key];
      if (incoming !== undefined && typeof incoming === 'object' && !Array.isArray(incoming)) {
        setPayload[key] = deepMerge(
          asPlainObjectRecord(existing[key]) ?? {},
          incoming as Record<string, unknown>
        );
      }
    }

    return setPayload;
  }

  private sanitizeProductUpdate(updateData: Partial<Product>): Partial<Omit<Product, 'id'>> {
    const next: Partial<Omit<Product, 'id'>> = {};
    const keys: Array<keyof Omit<Product, 'id'>> = [
      'name',
      'description',
      'type',
      'subType',
      'status',
      'isActive',
      'isFeatured',
      'requireApplicantSignature',
      'metadata',
      'structure',
      'about',
      'requirements',
      'feesAndCharges',
      'baseFeesAndCharges',
      'merchantFeeAdditions',
      'baseStructure',
      'merchantStructureAdditions',
      'baseEquityContribution',
      'merchantEquityAddition',
      'properties',
      'mortgageWorkflowStepOrder',
      'inspectionDates',
      'config',
      'equityContribution',
      'propertyValue',
      'price',
      'minimumQuantity',
      'unitOfMeasure',
      'commodityPrices',
      'merchant'
    ];

    for (const key of keys) {
      if (updateData[key] !== undefined) {
        (next as Record<string, unknown>)[key] =
          key === 'type' && typeof updateData[key] === 'string'
            ? normalizeProductType(updateData[key] as string)
            : updateData[key];
      }
    }

    next.updatedAt = new Date().toISOString();
    return next;
  }

  private toLegacyConfigurationShape(product: Product): MerchantProductConfiguration {
    return {
      id: product.id,
      productId: product.id,
      appId: product.appId,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  // Fetch all products from upstream: GET ${PLATA_ACCOUNT_SERVICE_URL}/api/v1/products
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await axios.get(`${config.plataAccountServiceUrl}/api/v1/products`, {
        headers: this.getUpstreamAuthHeaders()
      });
      return (response.data.data || []).map((product: Product) => this.toCustomerProduct(product));
    } catch (error) {
      this.logUpstreamError('Error fetching products from server:', error);
      return [];
    }
  }

  // Resolve local app-scoped products first, then fall back to upstream catalog.
  async getProductById(id: string): Promise<Product | null> {
    const localProduct = await this.getLocalProductById(id);
    if (localProduct) {
      const hydrated = await this.hydratePricingLayers(localProduct);
      // #region agent log
      fetch('http://127.0.0.1:7802/ingest/814893a7-2133-4c94-a7cf-f8a536fa7238',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f5129'},body:JSON.stringify({sessionId:'7f5129',location:'productService.ts:getProductById',message:'hydrated local product pricing',data:{productId:hydrated.id,baseInterest:hydrated.baseStructure?.interestRate,merchantInterestAddition:hydrated.merchantStructureAdditions?.interestRate,totalInterest:hydrated.structure?.interestRate,baseEquity:hydrated.baseEquityContribution,merchantEquityAddition:hydrated.merchantEquityAddition,totalEquity:hydrated.equityContribution},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      return this.toCustomerProduct(hydrated);
    }
    const upstreamProduct = await this.fetchUpstreamProductById(id);
    return upstreamProduct ? this.toCustomerProduct(upstreamProduct) : null;
  }

  // Fetch products that have been persisted for a specific app in the local products collection.
  async getProductsByMerchant(appId: string): Promise<Product[]> {
    try {
      const docs = await ProductModel.find({ appId }).sort({ updatedAt: -1 });
      const products = await Promise.all(docs.map((doc) => this.hydratePricingLayers(toProduct(doc))));
      return products.map((product) => this.toCustomerProduct(product));
    } catch (error) {
      console.error('Error fetching products by app ID from local database:', error);
      return [];
    }
  }

  async checkProductAction(id: string): Promise<any> {
    try {
      const response = await axios.get(`${config.plataAccountServiceUrl}/api/v1/products/${id}/action`, {
        headers: this.getUpstreamAuthHeaders()
      });
      return response.data.data || null;
    } catch (error) {
      this.logUpstreamError('Error checking product action from server:', error);
      return null;
    }
  }

  async createProductConfiguration(configData: CreateProductConfigurationRequest, appId: string): Promise<MerchantProductConfiguration> {
    const upstreamProduct = await this.fetchUpstreamProductById(configData.productId);
    if (!upstreamProduct) {
      throw new Error('Product not found');
    }

    const existing = await ProductModel.findOne({
      appId,
      referenceNumber: upstreamProduct.referenceNumber
    });

    if (existing) {
      return this.toLegacyConfigurationShape(toProduct(existing));
    }

    const created = await ProductModel.create(this.buildLocalProductPayload(upstreamProduct, appId, false));
    return this.toLegacyConfigurationShape(toProduct(created));
  }

  async getProductConfiguration(productId: string): Promise<ProductConfiguration | null> {
    const product = await this.getLocalProductById(productId);
    return product ? this.toLegacyConfigurationShape(product) : null;
  }

  async updateProductConfiguration(productId: string, updateData: UpdateProductConfigurationRequest): Promise<ProductConfiguration | null> {
    const existing = await this.getLocalProductById(productId);
    if (!existing) {
      return null;
    }

    const sanitizedUpdate = this.sanitizeProductUpdate(updateData.configuration as Partial<Product>);
    const setPayload = this.buildMergedSetPayload(existing, sanitizedUpdate);
    const modelForType = this.getModelForType(existing.type);
    const doc = await modelForType.findByIdAndUpdate(productId, { $set: setPayload }, { new: true });
    return doc ? this.toLegacyConfigurationShape(toProduct(doc)) : null;
  }

  async deleteProductConfiguration(productId: string): Promise<boolean> {
    const result = await ProductModel.deleteOne({ _id: productId });
    return result.deletedCount > 0;
  }

  // Returns the locally persisted app product document.
  async getMerchantProductConfiguration(appId: string, productId: string): Promise<Product | null> {
    const localProduct = await this.getLocalProductById(productId);
    if (localProduct && localProduct.appId === appId) {
      return localProduct;
    }

    const upstreamProduct = await this.fetchUpstreamProductById(productId);
    if (!upstreamProduct) {
      return null;
    }

    const doc = await ProductModel.findOne({
      appId,
      referenceNumber: upstreamProduct.referenceNumber
    });
    return doc ? toProduct(doc) : null;
  }

  // Activating clones the upstream product into the local products collection for that app.
  // When a local clone already exists, activating (from off → on) refreshes catalog snapshot fields from Plata.
  // While already on, use syncLocalClonesFromUpstreamProductId (webhook / manual) to refresh without toggling.
  async toggleProductActivation(appId: string, productId: string, activate: boolean): Promise<Product | null> {
    const localProduct = await this.getMerchantProductConfiguration(appId, productId);

    if (localProduct) {
      if (activate && localProduct.isActive === true) {
        throw new ApiError(400, 'this product is already turned on for this app');
      }

      if (!activate) {
        const updated = await ProductModel.findByIdAndUpdate(
          localProduct.id,
          {
            $set: {
              isActive: false,
              isFeatured: false,
              updatedAt: new Date().toISOString()
            }
          },
          { new: true }
        );
        return updated ? toProduct(updated) : null;
      }

      const upstreamProduct =
        (await this.fetchUpstreamProductById(localProduct.upstreamProductId || productId)) ||
        (await this.fetchUpstreamProductById(productId));
      if (!upstreamProduct) {
        throw new ApiError(404, 'Upstream Plata product not found');
      }

      const refreshed = await this.applyUpstreamSnapshotToLocalClone(localProduct, upstreamProduct, {
        isActive: true,
        preserveFeatured: true
      });
      return refreshed?.product ?? null;
    }

    if (!activate) {
      return null;
    }

    const upstreamProduct = await this.fetchUpstreamProductById(productId);
    if (!upstreamProduct) {
      return null;
    }

    const created = await ProductModel.create(this.buildLocalProductPayload(upstreamProduct, appId, true));
    return toProduct(created);
  }

  /**
   * Refresh all local clones of a Plata catalog product (typically after Plata `product.updated`).
   * Preserves per-app merchant pricing overlays, isActive, and isFeatured.
   */
  async syncLocalClonesFromUpstreamProductId(
    upstreamProductId: string
  ): Promise<{
    synced: number;
    productIds: string[];
    applicationsRefreshed: number;
    applicationIds: string[];
  }> {
    const id = upstreamProductId.trim();
    if (!id) {
      throw new ApiError(400, 'productId is required');
    }

    const upstreamProduct = await this.fetchUpstreamProductById(id);
    if (!upstreamProduct) {
      throw new ApiError(404, 'Upstream Plata product not found');
    }

    const docs = await ProductModel.find({ upstreamProductId: id });
    const productIds: string[] = [];
    const applicationIds: string[] = [];

    for (const doc of docs) {
      const local = toProduct(doc);
      const updated = await this.applyUpstreamSnapshotToLocalClone(local, upstreamProduct, {
        isActive: local.isActive !== false,
        preserveFeatured: true
      });
      if (updated) {
        productIds.push(updated.product.id);
        applicationIds.push(...updated.applicationIds);
      }
    }

    return {
      synced: productIds.length,
      productIds,
      applicationsRefreshed: applicationIds.length,
      applicationIds
    };
  }

  /**
   * Safety-net reconcile: for each distinct upstreamProductId on local clones,
   * re-fetch Plata and sync when the catalog `updatedAt` differs from the last synced stamp.
   */
  async reconcileLocalCatalogClones(options?: {
    force?: boolean;
  }): Promise<{
    checked: number;
    syncedUpstreamIds: string[];
    skipped: number;
    failed: Array<{ upstreamProductId: string; error: string }>;
  }> {
    const force = options?.force === true;
    const rows = await ProductModel.aggregate<{ _id: string }>([
      { $match: { upstreamProductId: { $type: 'string', $ne: '' } } },
      { $group: { _id: '$upstreamProductId' } }
    ]);
    const upstreamIds = rows.map((r) => String(r._id || '').trim()).filter(Boolean);

    const syncedUpstreamIds: string[] = [];
    let skipped = 0;
    const failed: Array<{ upstreamProductId: string; error: string }> = [];

    for (const upstreamProductId of upstreamIds) {
      try {
        const upstreamProduct = await this.fetchUpstreamProductById(upstreamProductId);
        if (!upstreamProduct) {
          failed.push({ upstreamProductId, error: 'Upstream Plata product not found' });
          continue;
        }

        if (!force) {
          const locals = await ProductModel.find({ upstreamProductId }).select({ metadata: 1 }).lean();
          const upstreamUpdatedAt = String(upstreamProduct.updatedAt || '').trim();
          const allFresh =
            locals.length > 0 &&
            locals.every((doc) => {
              const meta = asPlainObjectRecord((doc as { metadata?: unknown }).metadata);
              const stamped = String(meta?.upstreamCatalogUpdatedAt ?? '').trim();
              return Boolean(upstreamUpdatedAt) && stamped === upstreamUpdatedAt;
            });
          if (allFresh) {
            skipped += 1;
            continue;
          }
        }

        const result = await this.syncLocalClonesFromUpstreamProductId(upstreamProductId);
        if (result.synced > 0) {
          syncedUpstreamIds.push(upstreamProductId);
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed.push({
          upstreamProductId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      checked: upstreamIds.length,
      syncedUpstreamIds,
      skipped,
      failed
    };
  }

  /**
   * Apply a Plata catalog snapshot onto an existing Spring local clone,
   * then refresh in-progress storefront applications that still snapshot this product.
   */
  private async applyUpstreamSnapshotToLocalClone(
    localProduct: Product,
    upstreamProduct: Product,
    options: { isActive: boolean; preserveFeatured: boolean }
  ): Promise<{ product: Product; applicationIds: string[] } | null> {
    const refreshed = this.buildLocalProductPayload(
      upstreamProduct,
      localProduct.appId,
      options.isActive
    );

    const merged: Product = {
      ...localProduct,
      ...refreshed,
      id: localProduct.id,
      isFeatured: options.preserveFeatured ? localProduct.isFeatured === true : false,
      merchantFeeAdditions: localProduct.merchantFeeAdditions,
      merchantStructureAdditions: localProduct.merchantStructureAdditions,
      merchantEquityAddition: localProduct.merchantEquityAddition,
      createdAt: localProduct.createdAt,
      metadata: {
        ...(asPlainObjectRecord(localProduct.metadata) ?? {}),
        ...(asPlainObjectRecord(refreshed.metadata) ?? {}),
        upstreamCatalogUpdatedAt: upstreamProduct.updatedAt,
        lastCatalogSyncedAt: new Date().toISOString()
      }
    };

    const withOverlays = this.applyPricingTotals(merged);
    const { id: _id, ...setDoc } = withOverlays;

    const updated = await ProductModel.findByIdAndUpdate(
      localProduct.id,
      { $set: { ...setDoc, updatedAt: new Date().toISOString() } },
      { new: true }
    );
    const product = updated ? toProduct(updated) : null;
    if (!product) {
      return null;
    }

    let applicationIds: string[] = [];
    try {
      const applications = await refreshInProgressApplicationsFromProduct(product);
      applicationIds = applications.applicationIds;
    } catch (error) {
      console.error('Failed to refresh in-progress applications after catalog sync:', {
        productId: product.id,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return { product, applicationIds };
  }

  /**
   * Replace featured flags for an app: only **active** (`isActive`) local products may be featured.
   * Pass an empty array to clear all. Unknown ids or inactive products return 400.
   */
  async setFeaturedProductsForApp(appId: string, productIds: unknown): Promise<Product[]> {
    if (!Array.isArray(productIds)) {
      throw new ApiError(400, 'Request body must include a productIds array');
    }
    const ids = [...new Set(productIds.map((id) => String(id).trim()).filter(Boolean))];
    const allAppDocs = await ProductModel.find({ appId });
    if (allAppDocs.length === 0) {
      if (ids.length > 0) {
        throw new ApiError(400, 'No products configured for this app');
      }
      return [];
    }
    const byId = new Map(allAppDocs.map((d) => [d._id.toString(), d]));
    for (const pid of ids) {
      const doc = byId.get(pid);
      if (!doc) {
        throw new ApiError(400, `Unknown product id for this app: ${pid}`);
      }
      if (doc.isActive === false) {
        throw new ApiError(400, `Cannot feature a product that is not turned on: ${pid}`);
      }
    }

    const now = new Date().toISOString();
    const featuredSet = new Set(ids);
    await ProductModel.bulkWrite(
      allAppDocs.map((doc) => {
        const idStr = doc._id.toString();
        const nextFeatured = featuredSet.has(idStr) && doc.isActive !== false;
        return {
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { isFeatured: nextFeatured, updatedAt: now } }
          }
        };
      })
    );

    return this.getProductsByMerchant(appId);
  }

  // Updates the locally persisted app product document with Plata-shaped fields.
  async updateMerchantProductConfiguration(
    appId: string,
    productId: string,
    updateData: Partial<Product>
  ): Promise<Product | null> {
    const localProduct = await this.getMerchantProductConfiguration(appId, productId);
    if (!localProduct) {
      return null;
    }

    const willBeActive =
      updateData.isActive !== undefined ? updateData.isActive !== false : localProduct.isActive;
    if (updateData.isFeatured === true && !willBeActive) {
      throw new ApiError(400, 'Cannot mark an inactive product as featured');
    }

    const body = this.normalizeMerchantPricingUpdate(localProduct, { ...updateData });
    if (updateData.isActive === false) {
      body.isFeatured = false;
    }

    const baseFeesAndCharges = localProduct.baseFeesAndCharges ?? localProduct.feesAndCharges;
    // Only re-validate when the merchant is changing mark-ups. Re-sanitizing stored
    // legacy additions (e.g. Processing Fee) blocks unrelated catalog refreshes like properties.
    const merchantFeeAdditions =
      updateData.merchantFeeAdditions !== undefined
        ? this.sanitizeMerchantFeeAdditions(updateData.merchantFeeAdditions)
        : localProduct.merchantFeeAdditions;
    const totalFeesAndCharges = this.computeTotalFeesAndCharges(baseFeesAndCharges, merchantFeeAdditions);

    const sanitizedUpdate = this.sanitizeProductUpdate(body);
    delete sanitizedUpdate.feesAndCharges;
    delete sanitizedUpdate.baseFeesAndCharges;

    const merged = this.buildMergedSetPayload(localProduct, {
      ...sanitizedUpdate,
      baseFeesAndCharges,
      merchantFeeAdditions,
      feesAndCharges: totalFeesAndCharges
    });
    const pricedPayload = this.applyPricingTotals({
      ...localProduct,
      ...merged
    } as Product);
    const {
      id: _productId,
      calculatedConfig: _calculatedConfig,
      ...persistable
    } = pricedPayload as Product & { calculatedConfig?: Record<string, unknown> };
    const setPayload: Record<string, unknown> = { ...persistable, updatedAt: new Date().toISOString() };
    // #region agent log
    fetch('http://127.0.0.1:7802/ingest/814893a7-2133-4c94-a7cf-f8a536fa7238',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f5129'},body:JSON.stringify({sessionId:'7f5129',location:'productService.ts:updateMerchantProductConfiguration',message:'persisting merchant pricing layers',data:{productId:localProduct.id,baseInterest:pricedPayload.baseStructure?.interestRate,merchantInterestAddition:pricedPayload.merchantStructureAdditions?.interestRate,totalInterest:pricedPayload.structure?.interestRate,baseEquity:pricedPayload.baseEquityContribution,merchantEquityAddition:pricedPayload.merchantEquityAddition,totalEquity:pricedPayload.equityContribution},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    const modelForType = this.getModelForType(localProduct.type);
    const updated = await modelForType.findByIdAndUpdate(
      localProduct.id,
      { $set: setPayload },
      { new: true }
    );
    return updated ? toProduct(updated) : null;
  }
}