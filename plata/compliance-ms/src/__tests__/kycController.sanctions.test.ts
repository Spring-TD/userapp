// src/__tests__/kycController.sanctions.test.ts
import { Request, Response } from 'express';
import { KYCController } from '../controllers/kycController';

// Mock the sanctions service
jest.mock('../services/sanctionsService', () => ({
  sanctionsService: {
    checkSanctions: jest.fn()
  }
}));

describe('KYCController - Sanctions Check', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if name is missing', async () => {
    // Arrange
    mockRequest = {
      body: {
        companyId: 'TEST123',
        country: 'NG'
      }
    };

    // Act
    await KYCController.checkSanctions(
      mockRequest as Request,
      mockResponse as Response,
      jest.fn()
    );

    // Assert
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Name is required for sanctions check'
    });
  });

  it('should return 200 with sanctions check results', async () => {
    // Arrange
    mockRequest = {
      body: {
        name: 'Test Company',
        companyId: 'TEST123',
        country: 'NG'
      }
    };

    const mockResult = {
      flagged: false,
      matches: [],
      message: 'No matches found'
    };

    const { sanctionsService } = require('../services/sanctionsService');
    sanctionsService.checkSanctions.mockResolvedValue(mockResult);

    // Act
    await KYCController.checkSanctions(
      mockRequest as Request,
      mockResponse as Response,
      jest.fn()
    );

    // Assert
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      data: mockResult
    });
  });

  it('should return 500 if sanctions service throws an error', async () => {
    // Arrange
    mockRequest = {
      body: {
        name: 'Test Company'
      }
    };

    const { sanctionsService } = require('../services/sanctionsService');
    sanctionsService.checkSanctions.mockRejectedValue(new Error('API Error'));

    // Act
    await KYCController.checkSanctions(
      mockRequest as Request,
      mockResponse as Response,
      jest.fn()
    );

    // Assert
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error during sanctions check'
    });
  });
});