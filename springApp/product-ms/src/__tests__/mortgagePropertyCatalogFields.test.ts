import { toProduct } from '../models/ProductModel';

describe('mortgage property catalog fields', () => {
  it('toProduct preserves videoUrl, imageUrls, and related property media fields', () => {
    const product = toProduct({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      referenceNumber: 'REF-1',
      name: 'Mortgage Home',
      description: 'desc',
      type: 'MORTGAGE',
      appId: 'app-1',
      status: 'complete',
      isActive: true,
      requireApplicantSignature: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      properties: [
        {
          name: 'Lagos Villa',
          propertyType: 'detached',
          location: 'Lekki',
          propertyDescription: '4 bed',
          facilities: ['pool'],
          customFacilities: ['cinema'],
          imageUrls: ['https://cdn.example/a.jpg'],
          videoUrl: 'https://cdn.example/tour.mp4',
          previewAssetUrl: 'https://cdn.example/preview.jpg'
        }
      ],
      mortgageWorkflowStepOrder: ['offer_letter', 'inspection_booking'],
      inspectionDates: [{ scheduledFor: '2026-08-01T10:00:00.000Z', label: 'Open house' }],
      structure: {
        autoApproveLoans: false,
        repaymentStructure: 'reducing_balance'
      }
    });

    expect(product.requireApplicantSignature).toBe(true);
    expect(product.mortgageWorkflowStepOrder).toEqual(['offer_letter', 'inspection_booking']);
    expect(product.inspectionDates?.[0]?.scheduledFor).toBe('2026-08-01T10:00:00.000Z');
    expect(product.structure?.repaymentStructure).toBe('reducing_balance');
    expect(product.properties?.[0]).toMatchObject({
      name: 'Lagos Villa',
      imageUrls: ['https://cdn.example/a.jpg'],
      videoUrl: 'https://cdn.example/tour.mp4',
      propertyDescription: '4 bed',
      facilities: ['pool'],
      customFacilities: ['cinema']
    });
  });
});
