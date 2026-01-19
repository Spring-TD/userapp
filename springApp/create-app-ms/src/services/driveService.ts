import { DriveDocument, DriveDocumentQueryParams } from '../types/app';
import { ApiError } from '../middleware/errorHandler';

export class DriveService {
  // In-memory storage for drive documents (in a real implementation, this would be a database)
  private static documents: DriveDocument[] = [];

  /**
   * Upload a document to the drive
   * @param documentData The document data
   * @returns The created document
   */
  static async uploadDocument(documentData: Omit<DriveDocument, 'id' | 'uploadedAt'>): Promise<DriveDocument> {
    const newDocument: DriveDocument = {
      id: this.generateId(),
      ...documentData,
      uploadedAt: new Date().toISOString()
    };

    this.documents.push(newDocument);
    return newDocument;
  }

  /**
   * Get all documents for an app with optional filtering and pagination
   * @param appId The ID of the app
   * @param queryParams Query parameters for filtering and pagination
   * @returns Array of documents
   */
  static async getDocumentsByAppId(
    appId: string,
    queryParams: DriveDocumentQueryParams = {}
  ): Promise<DriveDocument[]> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    // Filter documents by appId
    let filteredDocuments = this.documents.filter(d => d.appId === appId);

    // Apply filters
    if (queryParams.userId) {
      filteredDocuments = filteredDocuments.filter(d => d.userId === queryParams.userId);
    }

    if (queryParams.fileType) {
      filteredDocuments = filteredDocuments.filter(d => d.fileType === queryParams.fileType);
    }

    if (queryParams.status) {
      filteredDocuments = filteredDocuments.filter(d => d.status === queryParams.status);
    }

    if (queryParams.startDate) {
      const startDate = new Date(queryParams.startDate);
      filteredDocuments = filteredDocuments.filter(d => new Date(d.uploadedAt) >= startDate);
    }

    if (queryParams.endDate) {
      const endDate = new Date(queryParams.endDate);
      filteredDocuments = filteredDocuments.filter(d => new Date(d.uploadedAt) <= endDate);
    }

    // Apply pagination
    if (queryParams.page && queryParams.limit) {
      const startIndex = (queryParams.page - 1) * queryParams.limit;
      const endIndex = startIndex + queryParams.limit;
      filteredDocuments = filteredDocuments.slice(startIndex, endIndex);
    }

    // Sort by uploadedAt descending (newest first)
    filteredDocuments.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return filteredDocuments;
  }

  /**
   * Get a document by ID
   * @param documentId The ID of the document
   * @returns The document or null if not found
   */
  static async getDocumentById(documentId: string): Promise<DriveDocument | null> {
    if (!documentId) {
      throw new ApiError(400, 'Document ID is required');
    }

    const document = this.documents.find(d => d.id === documentId);
    return document || null;
  }

  /**
   * Update a document
   * @param documentId The ID of the document
   * @param updateData The data to update
   * @returns The updated document or null if not found
   */
  static async updateDocument(documentId: string, updateData: Partial<DriveDocument>): Promise<DriveDocument | null> {
    if (!documentId) {
      throw new ApiError(400, 'Document ID is required');
    }

    const documentIndex = this.documents.findIndex(d => d.id === documentId);
    
    if (documentIndex === -1) {
      return null;
    }

    const updatedDocument = {
      ...this.documents[documentIndex],
      ...updateData,
      uploadedAt: this.documents[documentIndex].uploadedAt // Keep original upload time
    };

    this.documents[documentIndex] = updatedDocument as DriveDocument;
    return updatedDocument as DriveDocument;
  }

  /**
   * Delete a document
   * @param documentId The ID of the document
   * @returns True if deleted, false if not found
   */
  static async deleteDocument(documentId: string): Promise<boolean> {
    if (!documentId) {
      throw new ApiError(400, 'Document ID is required');
    }

    const documentIndex = this.documents.findIndex(d => d.id === documentId);
    
    if (documentIndex === -1) {
      return false;
    }

    this.documents.splice(documentIndex, 1);
    return true;
  }

  /**
   * Get document statistics for an app
   * @param appId The ID of the app
   * @returns Document statistics
   */
  static async getDocumentStats(appId: string): Promise<any> {
    if (!appId) {
      throw new ApiError(400, 'App ID is required');
    }

    const appDocuments = this.documents.filter(d => d.appId === appId);
    
    const totalDocuments = appDocuments.length;
    const pendingDocuments = appDocuments.filter(d => d.status === 'pending').length;
    const verifiedDocuments = appDocuments.filter(d => d.status === 'verified').length;
    const rejectedDocuments = appDocuments.filter(d => d.status === 'rejected').length;

    // Group by file type
    const fileTypeCounts: Record<string, number> = {};
    appDocuments.forEach(d => {
      fileTypeCounts[d.fileType] = (fileTypeCounts[d.fileType] || 0) + 1;
    });

    return {
      totalDocuments,
      pendingDocuments,
      verifiedDocuments,
      rejectedDocuments,
      fileTypeCounts
    };
  }

  /**
   * Generate a random ID (for testing purposes)
   * @returns A random ID string
   */
  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}