// src/__tests__/sanctionsValidation.test.ts
import { Request, Response, NextFunction } from 'express';
import { validateSanctionsCheck } from '../middleware/sanctionsValidation';

describe('Sanctions Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockNext = jest.fn();
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() for valid request with all fields', () => {
    // Arrange
    mockRequest = {
      body: {
        name: 'Test Company',
        companyId: 'TEST123',
        country: 'NG'
      }
    };

    // Act
    validateSanctionsCheck(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('should call next() for valid request with only required field', () => {
    // Arrange
    mockRequest = {
      body: {
        name: 'Test Individual'
      }
    };

    // Act
    validateSanctionsCheck(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('should return 400 if name is missing', () => {
    // Arrange
    mockRequest = {
      body: {
        companyId: 'TEST123',
        country: 'NG'
      }
    };

    // Act
    validateSanctionsCheck(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Assert
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: expect.arrayContaining(['Name is required'])
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 400 if name is empty', () => {
    // Arrange
    mockRequest = {
      body: {
        name: '',
        companyId: 'TEST123'
      }
    };

    // Act
    validateSanctionsCheck(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Assert
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: expect.arrayContaining(['Name is required'])
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 400 if country code is invalid', () => {
    // Arrange
    mockRequest = {
      body: {
        name: 'Test Company',
        country: 'INVALID'
      }
    };

    // Act
    validateSanctionsCheck(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Assert
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: expect.arrayContaining(['Country must be a 2-letter ISO country code'])
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});