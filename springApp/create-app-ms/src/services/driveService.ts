import { DriveDocument, DriveDocumentQueryParams } from '../types/app';
import { ApiError } from '../middleware/errorHandler';
import { DriveMongoModel } from '../models/drive.mongo';

export class DriveService {
  /**
   * Upload a document to the drive
   * @param documentData The document data
   * @returns The created document
   */
  static async uploadDocument(documentData: Omit<DriveDocument, 'id' | 'uploadedAt'>): Promise<DriveDocument> {
    const newDocument = await DriveMongoModel.create({
      ...documentData,
      uploadedAt: new Date().toISOString()
    });

    return newDocument.toJSON() as unknown as DriveDocument;
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

    const filter: any = { appId };

    // Apply filters
    if (queryParams.userId) {
      filter.userId = queryParams.userId;
    }

    if (queryParams.fileType) {
      filter.fileType = queryParams.fileType;
    }

    if (queryParams.status) {
      filter.status = queryParams.status;
    }

    if (queryParams.startDate || queryParams.endDate) {
      filter.uploadedAt = {};
      if (queryParams.startDate) {
        filter.uploadedAt.$gte = new Date(queryParams.startDate).toISOString();
      }
      if (queryParams.endDate) {
        filter.uploadedAt.$lte = new Date(queryParams.endDate).toISOString();
      }
    }

    let query = DriveMongoModel.find(filter);

    // Apply sorting (newest first)
    query = query.sort({ uploadedAt: -1 });

    // Apply pagination
    if (queryParams.page && queryParams.limit) {
      const skip = (queryParams.page - 1) * queryParams.limit;
      query = query.skip(skip).limit(queryParams.limit);
    }

    const documents = await query.exec();
    return documents.map(d => d.toJSON() as unknown as DriveDocument);
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

    const document = await DriveMongoModel.findById(documentId);
    return document ? (document.toJSON() as unknown as DriveDocument) : null;
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

    const updatedDocument = await DriveMongoModel.findByIdAndUpdate(
      documentId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return updatedDocument ? (updatedDocument.toJSON() as unknown as DriveDocument) : null;
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

    const result = await DriveMongoModel.findByIdAndDelete(documentId);
    return !!result;
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

    // Use aggregation to mimic the logic in mock service
    const stats = await DriveMongoModel.aggregate([
      { $match: { appId } },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          pendingDocuments: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          verifiedDocuments: {
            $sum: { $cond: [{ $eq: ["$status", "verified"] }, 1, 0] }
          },
          rejectedDocuments: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          },
          fileTypeCounts: {
            $push: "$fileType"
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        totalDocuments: 0,
        pendingDocuments: 0,
        verifiedDocuments: 0,
        rejectedDocuments: 0,
        fileTypeCounts: {}
      };
    }

    const result = stats[0];

    // Process fileTypeCounts locally from the array of types
    const fileTypeCounts: Record<string, number> = {};
    (result.fileTypeCounts as string[]).forEach(type => {
      fileTypeCounts[type] = (fileTypeCounts[type] || 0) + 1;
    });

    return {
      totalDocuments: result.totalDocuments,
      pendingDocuments: result.pendingDocuments,
      verifiedDocuments: result.verifiedDocuments,
      rejectedDocuments: result.rejectedDocuments,
      fileTypeCounts
    };
  }
}