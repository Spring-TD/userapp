// src/models/kycModels.ts
import { KYCDocument, KYCProfile, KYCStatus, UserType, DocumentType } from '../types/kycTypes';

// Mock document interface (extending with _id for mock database)
export interface MockKYCDocument extends KYCDocument {
  _id?: string;
}

// Mock profile interface (extending with _id for mock database)
export interface MockKYCProfile extends KYCProfile {
  _id?: string;
  documents: MockKYCDocument[];
}

// For backwards compatibility with existing code that might import these
export const KYCDocumentModel = {
  // Mock implementation methods would go here if needed
};

export const KYCProfileModel = {
  // Mock implementation methods would go here if needed
};