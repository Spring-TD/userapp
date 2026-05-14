import { Router } from 'express';
import recordController from '../controllers/recordController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Webhook endpoint - No authentication required
 * This endpoint is called by service-auth-ms after successful account verification
 */
router.post('/webhook/create', recordController.createRecordWebhook.bind(recordController));

/**
 * Protected endpoints - Require authentication
 */

// Get record by ID
router.get('/:recordId', authenticate, recordController.getRecord.bind(recordController));

// Get record by user ID
router.get('/user/:userId', authenticate, recordController.getRecordByUserId.bind(recordController));

// Get record by email
router.get('/email/:email', authenticate, recordController.getRecordByEmail.bind(recordController));

// Get all merchant records
router.get('/merchants/all', authenticate, recordController.getAllMerchants.bind(recordController));

// Get merchant-user records by merchant ID
router.get('/merchant/:userMerchantId/users', authenticate, recordController.getMerchantUsers.bind(recordController));

// Get ledger entries for a record
router.get('/:recordId/ledger', authenticate, recordController.getLedgerEntries.bind(recordController));

// Get ledger summary for a record
router.get('/:recordId/ledger/summary', authenticate, recordController.getLedgerSummary.bind(recordController));

// Add ledger entry
router.post('/:recordId/ledger/entry', authenticate, recordController.addLedgerEntry.bind(recordController));

// Deactivate record
router.put('/:recordId/deactivate', authenticate, recordController.deactivateRecord.bind(recordController));

// Activate record
router.put('/:recordId/activate', authenticate, recordController.activateRecord.bind(recordController));

// Fund record (Credit operation) in specific category
router.post('/:recordId/fund', authenticate, recordController.fundRecord.bind(recordController));

// Debit record (Debit operation) in specific category
router.post('/:recordId/debit', authenticate, recordController.debitRecord.bind(recordController));

// Get category-specific summary
router.get('/:recordId/category-summary', authenticate, recordController.getCategorySummary.bind(recordController));

// Get comprehensive analytics for a record
router.get('/:recordId/analytics', authenticate, recordController.getAnalytics.bind(recordController));

// Get aggregated merchant analytics (merchant + all their users)
router.get('/merchant/:userMerchantId/analytics', authenticate, recordController.getMerchantAnalytics.bind(recordController));

export { router as recordRoutes };
