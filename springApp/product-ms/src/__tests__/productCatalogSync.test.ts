import { describe, expect, it, jest, beforeEach } from '@jest/globals';

jest.mock('../config/environment', () => ({
  config: {
    plataAccountServiceUrl: 'https://account-ms-plata.example',
    plataPublicKey: 'pk',
    plataSecretKey: 'sk',
    plataLoanWorkflowWebhookSecret: '',
    productCatalogSyncEnabled: true,
    productCatalogSyncIntervalMs: 900000
  }
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    isAxiosError: () => false
  }
}));

jest.mock('../models/ProductModel', () => ({
  ProductModel: {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn()
  },
  toProduct: jest.fn((doc: Record<string, unknown>) => ({
    id: String((doc as { _id?: { toString(): string } })._id?.toString?.() ?? doc.id ?? ''),
    upstreamProductId: doc.upstreamProductId,
    upstreamAppId: doc.upstreamAppId,
    referenceNumber: doc.referenceNumber,
    name: doc.name,
    description: doc.description ?? '',
    type: doc.type,
    appId: doc.appId,
    status: doc.status ?? 'complete',
    isActive: doc.isActive !== false,
    isFeatured: doc.isFeatured === true,
    requireApplicantSignature: doc.requireApplicantSignature === true,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    structure: doc.structure,
    about: doc.about,
    requirements: doc.requirements,
    feesAndCharges: doc.feesAndCharges,
    baseStructure: doc.baseStructure,
    baseFeesAndCharges: doc.baseFeesAndCharges,
    baseEquityContribution: doc.baseEquityContribution,
    merchantStructureAdditions: doc.merchantStructureAdditions,
    merchantFeeAdditions: doc.merchantFeeAdditions,
    merchantEquityAddition: doc.merchantEquityAddition,
    equityContribution: doc.equityContribution,
    merchant: doc.merchant,
    metadata: doc.metadata
  }))
}));

import axios from 'axios';
import { ProductService } from '../services/productService';
import { ProductModel } from '../models/ProductModel';

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;
const mockedFind = ProductModel.find as jest.MockedFunction<typeof ProductModel.find>;
const mockedUpdate = ProductModel.findByIdAndUpdate as jest.MockedFunction<
  typeof ProductModel.findByIdAndUpdate
>;
const mockedAggregate = ProductModel.aggregate as jest.MockedFunction<typeof ProductModel.aggregate>;

describe('ProductService catalog sync', () => {
  const service = new ProductService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes local clones from Plata while preserving merchant overlays', async () => {
    mockedAxiosGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'plata-prod-1',
          appId: 'plata-app-1',
          referenceNumber: 'PRD-1',
          name: 'Updated Loan Name',
          description: 'New description',
          type: 'LOAN',
          status: 'complete',
          updatedAt: '2026-07-27T00:00:00.000Z',
          structure: { interestRate: 15 },
          about: { duration: { value: 12, unit: 'month' } },
          feesAndCharges: { fees: [] },
          merchant: { id: 'merchant_creator' }
        }
      }
    } as never);

    mockedFind.mockResolvedValue([
      {
        _id: { toString: () => 'local-1' },
        upstreamProductId: 'plata-prod-1',
        referenceNumber: 'PRD-1',
        name: 'Old Name',
        description: 'Old',
        type: 'LOAN',
        appId: 'spring-app-1',
        status: 'complete',
        isActive: true,
        isFeatured: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        structure: { interestRate: 17.5 },
        baseStructure: { interestRate: 15 },
        merchantStructureAdditions: { interestRate: 2.5 },
        feesAndCharges: { fees: [] },
        baseFeesAndCharges: { fees: [] }
      }
    ] as never);

    mockedUpdate.mockResolvedValue({
      _id: { toString: () => 'local-1' },
      upstreamProductId: 'plata-prod-1',
      name: 'Updated Loan Name',
      description: 'New description',
      type: 'LOAN',
      appId: 'spring-app-1',
      status: 'complete',
      isActive: true,
      isFeatured: true,
      referenceNumber: 'PRD-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
      structure: { interestRate: 17.5 },
      baseStructure: { interestRate: 15 },
      merchantStructureAdditions: { interestRate: 2.5 },
      feesAndCharges: { fees: [] },
      baseFeesAndCharges: { fees: [] }
    } as never);

    const result = await service.syncLocalClonesFromUpstreamProductId('plata-prod-1');

    expect(result.synced).toBe(1);
    expect(result.productIds).toEqual(['local-1']);
    expect(mockedUpdate).toHaveBeenCalledWith(
      'local-1',
      expect.objectContaining({
        $set: expect.objectContaining({
          name: 'Updated Loan Name',
          description: 'New description',
          isFeatured: true,
          merchantStructureAdditions: { interestRate: 2.5 },
          structure: expect.objectContaining({ interestRate: 17.5 })
        })
      }),
      { new: true }
    );
  });

  it('skips reconcile when local clones already match Plata updatedAt', async () => {
    mockedAggregate.mockResolvedValue([{ _id: 'plata-prod-1' }] as never);
    mockedAxiosGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'plata-prod-1',
          updatedAt: '2026-07-27T00:00:00.000Z',
          name: 'Same',
          description: '',
          type: 'LOAN',
          referenceNumber: 'PRD-1',
          appId: 'plata-app-1',
          status: 'complete',
          structure: { interestRate: 10 },
          feesAndCharges: { fees: [] }
        }
      }
    } as never);
    mockedFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { metadata: { upstreamCatalogUpdatedAt: '2026-07-27T00:00:00.000Z' } }
        ] as never)
      })
    } as never);

    const result = await service.reconcileLocalCatalogClones();

    expect(result.checked).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.syncedUpstreamIds).toEqual([]);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
