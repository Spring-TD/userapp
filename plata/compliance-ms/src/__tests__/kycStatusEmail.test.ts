import axios from 'axios';
import { BusinessDocumentType, KYCStatus, UserType } from '../types/kycTypes';

const mockKycProfileModel = {
  findOne: jest.fn(),
  save: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn()
};

jest.mock('axios');
jest.mock('../utils/kycProfileMongo', () => ({
  KYCProfileModelMongo: mockKycProfileModel,
  KYCDocumentModelMongo: {}
}));
jest.mock('../services/cacService', () => ({
  cacService: {}
}));
jest.mock('../services/premblyService', () => ({
  premblyService: {}
}));

const mockBusinessInfoModel = {
  findOneAndUpdate: jest.fn()
};

const mockBusinessSurveyModel = {
  findOneAndUpdate: jest.fn()
};

const mockBusinessDocumentModel = {
  findOneAndUpdate: jest.fn(),
  find: jest.fn()
};

const mockShareholderModel = {
  create: jest.fn()
};

jest.mock('../utils/validation', () => ({
  validateKYCSubmission: jest.fn(() => ({ error: null })),
  validateIndividualKYCSubmission: jest.fn(() => ({ error: null })),
  validateBusinessKYCSubmission: jest.fn(() => ({ error: null }))
}));

jest.mock('../models/BusinessInfoModel', () => ({
  BusinessInfoModel: mockBusinessInfoModel
}));

jest.mock('../models/BusinessSurveyModel', () => ({
  BusinessSurveyModel: mockBusinessSurveyModel
}));

jest.mock('../models/BusinessDocumentModel', () => ({
  BusinessDocumentModel: mockBusinessDocumentModel
}));

jest.mock('../models/ShareholderModel', () => ({
  ShareholderModel: mockShareholderModel
}));

describe('KYC status email notifications', () => {
  let kycService: any;

  beforeAll(() => {
    process.env.KYC_NOTIFICATIONS_ENABLED = 'true';
    process.env.KYC_NOTIFICATIONS_CHANNELS = 'email';
    ({ kycService } = require('../services/kycService'));
  });

  beforeEach(() => {
    (axios as jest.Mocked<any>).get.mockReset();
    (axios as jest.Mocked<any>).post.mockReset();

    mockKycProfileModel.findOne.mockReset();
    mockKycProfileModel.save.mockReset();
    mockKycProfileModel.findByIdAndUpdate.mockReset();
    mockKycProfileModel.findById.mockReset();

    mockBusinessInfoModel.findOneAndUpdate.mockReset();
    mockBusinessSurveyModel.findOneAndUpdate.mockReset();
    mockBusinessDocumentModel.findOneAndUpdate.mockReset();
    mockBusinessDocumentModel.find.mockReset();
    mockShareholderModel.create.mockReset();
  });

  it('sends email when minimal KYC profile is created (pending)', async () => {
    mockKycProfileModel.findOne.mockResolvedValue(null);
    const submittedAt = new Date('2024-01-01T00:00:00.000Z');
    mockKycProfileModel.save.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.PENDING,
      submittedAt
    });

    (axios as jest.Mocked<any>).get.mockResolvedValue({
      data: { success: true, data: { email: 'm@example.com', userName: 'Merchant One' } }
    });
    (axios as jest.Mocked<any>).post.mockResolvedValue({ data: { success: true } });

    await kycService.createMinimalKYCProfile('merchant-1', UserType.MERCHANT);

    expect((axios as jest.Mocked<any>).get).toHaveBeenCalled();
    expect((axios as jest.Mocked<any>).post).toHaveBeenCalled();

    const postArgs = (axios as jest.Mocked<any>).post.mock.calls[0][1];
    expect(postArgs.template).toBe('kyc-status-updated');
    expect(postArgs.data.status).toBe(KYCStatus.PENDING);
  });

  it('does not resend email when approve keeps same status', async () => {
    mockKycProfileModel.findOne.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.APPROVED,
      _id: 'kyc-1'
    });
    mockKycProfileModel.findByIdAndUpdate.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.APPROVED,
      reviewDate: new Date('2024-01-02T00:00:00.000Z'),
      rejectionReason: undefined
    });

    await kycService.approveDisapproveUser('merchant-1', 'approved', 'no-op', 'admin-1');

    expect((axios as jest.Mocked<any>).get).not.toHaveBeenCalled();
    expect((axios as jest.Mocked<any>).post).not.toHaveBeenCalled();
  });

  it('sends email on approve status transition (pending -> approved)', async () => {
    mockKycProfileModel.findOne.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.PENDING,
      _id: 'kyc-1'
    });
    mockKycProfileModel.findByIdAndUpdate.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.APPROVED,
      reviewDate: new Date('2024-01-02T00:00:00.000Z'),
      rejectionReason: undefined
    });

    (axios as jest.Mocked<any>).get.mockResolvedValue({
      data: { success: true, data: { email: 'm@example.com', userName: 'Merchant One' } }
    });
    (axios as jest.Mocked<any>).post.mockResolvedValue({ data: { success: true } });

    await kycService.approveDisapproveUser('merchant-1', 'approved', 'approved', 'admin-1');

    expect((axios as jest.Mocked<any>).post).toHaveBeenCalled();
    const postArgs = (axios as jest.Mocked<any>).post.mock.calls[0][1];
    expect(postArgs.data.status).toBe(KYCStatus.APPROVED);
  });

  it('sends email on review status transition (approved -> rejected)', async () => {
    mockKycProfileModel.findById.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.APPROVED
    });
    mockKycProfileModel.findByIdAndUpdate.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.REJECTED,
      reviewDate: new Date('2024-01-03T00:00:00.000Z'),
      rejectionReason: 'bad documents'
    });

    (axios as jest.Mocked<any>).get.mockResolvedValue({
      data: { success: true, data: { email: 'm@example.com', userName: 'Merchant One' } }
    });
    (axios as jest.Mocked<any>).post.mockResolvedValue({ data: { success: true } });

    await kycService.reviewKYC('kyc-obj-1', KYCStatus.REJECTED, 'bad documents', 'admin-1');

    expect((axios as jest.Mocked<any>).post).toHaveBeenCalled();
    const postArgs = (axios as jest.Mocked<any>).post.mock.calls[0][1];
    expect(postArgs.data.status).toBe(KYCStatus.REJECTED);
    expect(postArgs.data.reviewReason).toBe('bad documents');
  });

  it('sends email on review status transition (review -> completed)', async () => {
    mockKycProfileModel.findById.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.REVIEW
    });
    mockKycProfileModel.findByIdAndUpdate.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.COMPLETED,
      reviewDate: new Date('2024-01-03T00:00:00.000Z'),
      rejectionReason: undefined
    });

    (axios as jest.Mocked<any>).get.mockResolvedValue({
      data: { success: true, data: { email: 'm@example.com', userName: 'Merchant One' } }
    });
    (axios as jest.Mocked<any>).post.mockResolvedValue({ data: { success: true } });

    await kycService.reviewKYC('kyc-obj-1', KYCStatus.COMPLETED, undefined, 'admin-1');

    expect((axios as jest.Mocked<any>).post).toHaveBeenCalled();
    const postArgs = (axios as jest.Mocked<any>).post.mock.calls[0][1];
    expect(postArgs.data.status).toBe(KYCStatus.COMPLETED);
    expect(postArgs.data.reviewReason).toBe('');
  });

  it('sends email when business KYC is submitted (initial pending)', async () => {
    mockKycProfileModel.findOne.mockResolvedValue(null);
    mockKycProfileModel.save.mockResolvedValue({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      status: KYCStatus.PENDING,
      submittedAt: new Date('2024-01-01T00:00:00.000Z')
    });

    mockBusinessInfoModel.findOneAndUpdate.mockResolvedValue({});
    mockBusinessSurveyModel.findOneAndUpdate.mockResolvedValue({});
    mockBusinessDocumentModel.findOneAndUpdate.mockResolvedValue({});
    mockShareholderModel.create.mockResolvedValue({});
    mockBusinessDocumentModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    });

    (axios as jest.Mocked<any>).get.mockResolvedValue({
      data: { success: true, data: { email: 'm@example.com', userName: 'Merchant One' } }
    });
    (axios as jest.Mocked<any>).post.mockResolvedValue({ data: { success: true } });

    await kycService.submitBusinessKYC({
      userId: 'merchant-1',
      userType: UserType.MERCHANT,
      businessInfo: {
        companyName: 'Acme',
        industry: 'Technology',
        countryOfIncorporation: 'US',
        website: 'https://example.com',
        companyRegId: 'REG-1',
        companyLogoUrl: 'https://example.com/logo.png'
      },
      businessSurvey: {
        businessType: 'E-commerce',
        country: 'US',
        businessModel: 'B2B',
        monthlyProcessedVolume: 1000
      },
      shareholders: [
        {
          fullName: 'John Doe',
          ownershipPercentage: 100,
          email: 'john@example.com',
          phoneNumber: '555',
          bvn: 'bvn1',
          bankAccount: 'acc1',
          submittedAt: new Date('2024-01-01T00:00:00.000Z'),
          uboDocument: {
            fileName: 'ubo.pdf',
            fileType: 'application/pdf',
            fileSize: 1,
            fileUrl: 'https://example.com/ubo.pdf',
            uploadDate: new Date('2024-01-01T00:00:00.000Z')
          },
          bankStatement: {
            fileName: 'bank.pdf',
            fileType: 'application/pdf',
            fileSize: 1,
            fileUrl: 'https://example.com/bank.pdf',
            uploadDate: new Date('2024-01-01T00:00:00.000Z')
          },
          status: KYCStatus.PENDING,
          kyc: {
            url: 'https://example.com/link',
            expiresAt: new Date('2024-02-01T00:00:00.000Z'),
            status: 'pending'
          }
        }
      ],
      businessDocuments: [
        {
          type: BusinessDocumentType.CERTIFICATE_OF_INCORPORATION,
          fileName: 'coi.pdf',
          fileType: 'application/pdf',
          fileSize: 1,
          fileUrl: 'https://example.com/coi.pdf',
          uploadedAt: new Date('2024-01-01T00:00:00.000Z'),
          status: KYCStatus.PENDING
        },
        {
          type: BusinessDocumentType.ARTICLES_OF_ASSOCIATION,
          fileName: 'articles.pdf',
          fileType: 'application/pdf',
          fileSize: 1,
          fileUrl: 'https://example.com/articles.pdf',
          uploadedAt: new Date('2024-01-01T00:00:00.000Z'),
          status: KYCStatus.PENDING
        },
        {
          type: BusinessDocumentType.LIST_OF_SHAREHOLDERS,
          fileName: 'shareholders.pdf',
          fileType: 'application/pdf',
          fileSize: 1,
          fileUrl: 'https://example.com/shareholders.pdf',
          uploadedAt: new Date('2024-01-01T00:00:00.000Z'),
          status: KYCStatus.PENDING
        },
        {
          type: BusinessDocumentType.PROOF_OF_ADDRESS,
          fileName: 'address.pdf',
          fileType: 'application/pdf',
          fileSize: 1,
          fileUrl: 'https://example.com/address.pdf',
          uploadedAt: new Date('2024-01-01T00:00:00.000Z'),
          status: KYCStatus.PENDING
        },
        {
          type: BusinessDocumentType.BANK_STATEMENT,
          fileName: 'bank-statement.pdf',
          fileType: 'application/pdf',
          fileSize: 1,
          fileUrl: 'https://example.com/bank-statement.pdf',
          uploadedAt: new Date('2024-01-01T00:00:00.000Z'),
          status: KYCStatus.PENDING
        },
        {
          type: BusinessDocumentType.AML_POLICIES,
          fileName: 'aml.pdf',
          fileType: 'application/pdf',
          fileSize: 1,
          fileUrl: 'https://example.com/aml.pdf',
          uploadedAt: new Date('2024-01-01T00:00:00.000Z'),
          status: KYCStatus.PENDING
        },
        {
          type: BusinessDocumentType.DATA_PRIVACY_POLICY,
          fileName: 'privacy.pdf',
          fileType: 'application/pdf',
          fileSize: 1,
          fileUrl: 'https://example.com/privacy.pdf',
          uploadedAt: new Date('2024-01-01T00:00:00.000Z'),
          status: KYCStatus.PENDING
        }
      ],
      riskAssessment: {
        annualTurnover: 100000,
        expectedTransactionVolume: 50000,
        highRiskJurisdiction: false,
        sanctionListCheck: false,
        adverseMediaCheck: false
      }
    });

    expect((axios as jest.Mocked<any>).get).toHaveBeenCalled();
    expect((axios as jest.Mocked<any>).post).toHaveBeenCalled();

    const postArgs = (axios as jest.Mocked<any>).post.mock.calls[0][1];
    expect(postArgs.template).toBe('kyc-status-updated');
    expect(postArgs.data.status).toBe(KYCStatus.PENDING);
  });
});

