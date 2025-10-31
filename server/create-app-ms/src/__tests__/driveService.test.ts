import { DriveService } from '../services/driveService';

describe('DriveService', () => {
  beforeEach(() => {
    // Clear all documents before each test
    (DriveService as any).documents = [];
  });

  describe('uploadDocument', () => {
    it('should successfully upload a document', async () => {
      const documentData = {
        appId: 'app1',
        userId: 'user1',
        fileName: 'test.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        url: 'http://example.com/test.pdf',
        status: 'pending' as const
      };

      const document = await DriveService.uploadDocument(documentData);
      
      expect(document).toBeDefined();
      expect(document.id).toBeDefined();
      expect(document.uploadedAt).toBeDefined();
      expect(document.appId).toBe('app1');
      expect(document.fileName).toBe('test.pdf');
    });
  });

  describe('getDocumentsByAppId', () => {
    it('should return documents for a specific app', async () => {
      // Create test documents
      const document1 = await DriveService.uploadDocument({
        appId: 'app1',
        userId: 'user1',
        fileName: 'test1.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        url: 'http://example.com/test1.pdf',
        status: 'pending'
      });

      const document2 = await DriveService.uploadDocument({
        appId: 'app1',
        userId: 'user2',
        fileName: 'test2.pdf',
        fileType: 'pdf',
        fileSize: 2048,
        url: 'http://example.com/test2.pdf',
        status: 'verified'
      });

      const document3 = await DriveService.uploadDocument({
        appId: 'app2',
        userId: 'user1',
        fileName: 'test3.pdf',
        fileType: 'pdf',
        fileSize: 3072,
        url: 'http://example.com/test3.pdf',
        status: 'pending'
      });

      // Get documents for app1
      const documents = await DriveService.getDocumentsByAppId('app1');
      
      expect(documents).toHaveLength(2);
      expect(documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: document1.id }),
          expect.objectContaining({ id: document2.id })
        ])
      );
      expect(documents).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: document3.id })
        ])
      );
    });

    it('should return empty array for non-existent app', async () => {
      const documents = await DriveService.getDocumentsByAppId('non-existent');
      expect(documents).toHaveLength(0);
    });
  });

  describe('getDocumentById', () => {
    it('should return a document by ID', async () => {
      const documentData = {
        appId: 'app1',
        userId: 'user1',
        fileName: 'test.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        url: 'http://example.com/test.pdf',
        status: 'pending' as const
      };

      const createdDocument = await DriveService.uploadDocument(documentData);
      const retrievedDocument = await DriveService.getDocumentById(createdDocument.id);
      
      expect(retrievedDocument).toEqual(createdDocument);
    });

    it('should return null for non-existent document', async () => {
      const document = await DriveService.getDocumentById('non-existent');
      expect(document).toBeNull();
    });
  });

  describe('updateDocument', () => {
    it('should update a document', async () => {
      const documentData = {
        appId: 'app1',
        userId: 'user1',
        fileName: 'test.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        url: 'http://example.com/test.pdf',
        status: 'pending' as const
      };

      const createdDocument = await DriveService.uploadDocument(documentData);
      const updatedDocument = await DriveService.updateDocument(createdDocument.id, {
        status: 'verified',
        fileName: 'updated-test.pdf'
      });
      
      expect(updatedDocument).toBeDefined();
      expect(updatedDocument?.id).toBe(createdDocument.id);
      expect(updatedDocument?.status).toBe('verified');
      expect(updatedDocument?.fileName).toBe('updated-test.pdf');
      expect(updatedDocument?.uploadedAt).toBe(createdDocument.uploadedAt); // Should remain unchanged
    });

    it('should return null for non-existent document', async () => {
      const document = await DriveService.updateDocument('non-existent', { status: 'verified' });
      expect(document).toBeNull();
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      const documentData = {
        appId: 'app1',
        userId: 'user1',
        fileName: 'test.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        url: 'http://example.com/test.pdf',
        status: 'pending' as const
      };

      const createdDocument = await DriveService.uploadDocument(documentData);
      const deleted = await DriveService.deleteDocument(createdDocument.id);
      
      expect(deleted).toBe(true);
      
      const retrievedDocument = await DriveService.getDocumentById(createdDocument.id);
      expect(retrievedDocument).toBeNull();
    });

    it('should return false for non-existent document', async () => {
      const deleted = await DriveService.deleteDocument('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getDocumentStats', () => {
    it('should return correct document statistics', async () => {
      // Create test documents
      await DriveService.uploadDocument({
        appId: 'app1',
        userId: 'user1',
        fileName: 'test1.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        url: 'http://example.com/test1.pdf',
        status: 'pending'
      });

      await DriveService.uploadDocument({
        appId: 'app1',
        userId: 'user2',
        fileName: 'test2.pdf',
        fileType: 'pdf',
        fileSize: 2048,
        url: 'http://example.com/test2.pdf',
        status: 'verified'
      });

      await DriveService.uploadDocument({
        appId: 'app1',
        userId: 'user3',
        fileName: 'test3.jpg',
        fileType: 'jpg',
        fileSize: 3072,
        url: 'http://example.com/test3.jpg',
        status: 'rejected'
      });

      const stats = await DriveService.getDocumentStats('app1');
      
      expect(stats.totalDocuments).toBe(3);
      expect(stats.pendingDocuments).toBe(1);
      expect(stats.verifiedDocuments).toBe(1);
      expect(stats.rejectedDocuments).toBe(1);
      expect(stats.fileTypeCounts).toEqual({
        pdf: 2,
        jpg: 1
      });
    });
  });
});