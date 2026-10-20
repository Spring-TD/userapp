import { Router } from 'express';
import { authenticate, authorizeMerchant } from '../middleware/auth';
import { requirePermission } from '../middleware/requirePermission';
import { Permission } from '../rbac/permissions';
import { TreasuryConsoleController } from '../controllers/treasuryConsoleController';

const router = Router();

router.use(authenticate, authorizeMerchant);

/**
 * Plata merchant dashboard — Treasury & Settlements console.
 * Documented separately at account-ms `/frontendplata` (not integrator Swagger).
 */

router.get(
  '/treasury/overview',
  requirePermission(Permission.VIEW_WALLET_BALANCES),
  TreasuryConsoleController.getOverview
);

router.get(
  '/treasury/wallets/:walletType/transactions',
  requirePermission(Permission.VIEW_TRANSACTION_LEDGER),
  TreasuryConsoleController.listWalletTransactions
);

router.get(
  '/treasury/wallets/:walletType/funding-instructions',
  requirePermission(Permission.VIEW_WALLET_BALANCES),
  TreasuryConsoleController.getFundingInstructions
);

router.get(
  '/treasury/withdrawals',
  requirePermission(Permission.VIEW_PAYOUT_HISTORY),
  TreasuryConsoleController.listWithdrawals
);

router.get(
  '/treasury/withdrawals/history',
  requirePermission(Permission.VIEW_PAYOUT_HISTORY),
  TreasuryConsoleController.listWithdrawalHistory
);

router.post(
  '/treasury/withdrawals/approve',
  requirePermission(Permission.APPROVE_PAYOUT, Permission.INITIATE_PAYOUT),
  TreasuryConsoleController.approveWithdrawals
);

router.post(
  '/treasury/withdrawals/reject',
  requirePermission(Permission.APPROVE_PAYOUT, Permission.INITIATE_PAYOUT),
  TreasuryConsoleController.rejectWithdrawals
);

router.get(
  '/treasury/settlements/:settlementType',
  requirePermission(Permission.VIEW_PAYOUT_HISTORY),
  TreasuryConsoleController.listSettlements
);

router.get(
  '/treasury/settlements/:settlementType/history',
  requirePermission(Permission.VIEW_PAYOUT_HISTORY),
  TreasuryConsoleController.listSettlementHistory
);

router.get(
  '/treasury/settlements/:settlementType/mode',
  requirePermission(Permission.VIEW_PAYOUT_HISTORY),
  TreasuryConsoleController.getSettlementMode
);

router.put(
  '/treasury/settlements/:settlementType/mode',
  requirePermission(Permission.APPROVE_PAYOUT, Permission.MANAGE_SYSTEM_SETTINGS),
  TreasuryConsoleController.setSettlementMode
);

router.post(
  '/treasury/settlements/:settlementType/approve',
  requirePermission(Permission.APPROVE_PAYOUT, Permission.INITIATE_PAYOUT),
  TreasuryConsoleController.approveSettlements
);

router.post(
  '/treasury/settlements/:settlementType/reject',
  requirePermission(Permission.APPROVE_PAYOUT, Permission.INITIATE_PAYOUT),
  TreasuryConsoleController.rejectSettlements
);

export { router as treasuryConsoleRoutes };
