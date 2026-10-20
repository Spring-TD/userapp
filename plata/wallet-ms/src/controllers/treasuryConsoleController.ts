import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { TreasuryConsoleService, type MerchantWalletTypeKey } from '../services/treasuryConsoleService';
import { validateInput } from '../utils/validation';
import { Permission, actorHasAnyPermission } from '../rbac/permissions';
import type { TreasurySettlementType } from '../models/TreasuryConsoleSettingsModel';

const appIdQuerySchema = Joi.object({
  appId: Joi.string().trim().min(1).max(100).required()
});

const walletTypeParamSchema = Joi.string().valid('treasury', 'billing', 'repayment').required();

const settlementTypeParamSchema = Joi.string().valid('investments', 'commodities', 'savings').required();

const approveBodySchema = Joi.object({
  appId: Joi.string().trim().min(1).max(100).required(),
  references: Joi.array().items(Joi.string().trim().min(1).max(120)).default([])
});

const rejectBodySchema = Joi.object({
  appId: Joi.string().trim().min(1).max(100).required(),
  references: Joi.array().items(Joi.string().trim().min(1).max(120)).min(1).required(),
  reason: Joi.string().trim().max(500).optional().allow('')
});

const modeBodySchema = Joi.object({
  appId: Joi.string().trim().min(1).max(100).required(),
  mode: Joi.string().valid('manual', 'automatic').required()
});

const historyQuerySchema = Joi.object({
  appId: Joi.string().trim().min(1).max(100).required(),
  status: Joi.string().valid('approved', 'rejected', 'all').default('all'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  skip: Joi.number().integer().min(0).default(0)
});

const fundingInstructionsSchema = Joi.object({
  appId: Joi.string().trim().min(1).max(100).required(),
  amount: Joi.number().positive().required()
});

function resolveMerchantId(req: Request): string | undefined {
  return req.user?.merchantId || req.user?.userId;
}

function assertMerchantAccess(req: Request, merchantId: string, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return false;
  }
  if (
    req.user.userType !== 'MERCHANT' &&
    req.user.userType !== 'ADMIN' &&
    req.user.merchantId !== merchantId
  ) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return false;
  }
  return true;
}

function assertPermission(
  req: Request,
  res: Response,
  required: string | string[]
): boolean {
  if (
    !actorHasAnyPermission(req.user?.permissions, req.user?.isOwner, required)
  ) {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return false;
  }
  return true;
}

export class TreasuryConsoleController {
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, Permission.VIEW_WALLET_BALANCES)) return;

      const { error, value } = validateInput<{ appId: string }>(appIdQuerySchema, req.query);
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const data = await TreasuryConsoleService.getOverview(merchantId, value!.appId);
      res.json({ success: true, data: TreasuryConsoleService.formatOverviewForApi(data) });
    } catch (err) {
      next(err);
    }
  }

  static async listWalletTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, Permission.VIEW_TRANSACTION_LEDGER)) return;

      const walletType = String(req.params.walletType || '');
      const wtCheck = walletTypeParamSchema.validate(walletType);
      if (wtCheck.error) {
        res.status(400).json({ success: false, error: 'Invalid walletType' });
        return;
      }
      const wt = walletType as MerchantWalletTypeKey;

      const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
      if (!appId.trim()) {
        res.status(400).json({ success: false, error: 'appId query is required' });
        return;
      }

      const data = await TreasuryConsoleService.listWalletTransactions(merchantId, appId, wt, {
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
        skip: req.query.skip !== undefined ? Number(req.query.skip) : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined
      });

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async listWithdrawals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, Permission.VIEW_PAYOUT_HISTORY)) return;

      const { error, value } = validateInput<{ appId: string }>(appIdQuerySchema, req.query);
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
      const items = await TreasuryConsoleService.listWithdrawals(value!.appId, limit);
      res.json({
        success: true,
        data: { items, pagination: { total: items.length, limit, skip: 0 } }
      });
    } catch (err) {
      next(err);
    }
  }

  static async listWithdrawalHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, Permission.VIEW_PAYOUT_HISTORY)) return;

      const { error, value } = validateInput<{
        appId: string;
        status: 'approved' | 'rejected' | 'all';
        limit: number;
        skip: number;
      }>(historyQuerySchema, req.query);
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const data = await TreasuryConsoleService.listWithdrawalHistory(value!.appId, {
        decision: value!.status,
        limit: value!.limit,
        skip: value!.skip
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async approveWithdrawals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, [Permission.APPROVE_PAYOUT, Permission.INITIATE_PAYOUT])) return;

      const { error, value } = validateInput<{ appId: string; references: string[] }>(
        approveBodySchema,
        req.body
      );
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const data = await TreasuryConsoleService.approveWithdrawals(
        merchantId,
        value!.appId,
        value!.references
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async listSettlements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, Permission.VIEW_PAYOUT_HISTORY)) return;

      const st = String(req.params.settlementType || '');
      const stCheck = settlementTypeParamSchema.validate(st);
      if (stCheck.error) {
        res.status(400).json({ success: false, error: 'Invalid settlementType' });
        return;
      }

      const { error, value } = validateInput<{ appId: string }>(appIdQuerySchema, req.query);
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
      const items = await TreasuryConsoleService.listSettlements(
        value!.appId,
        st as TreasurySettlementType,
        limit
      );
      res.json({
        success: true,
        data: { items, pagination: { total: items.length, limit, skip: 0 } }
      });
    } catch (err) {
      next(err);
    }
  }

  static async listSettlementHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, Permission.VIEW_PAYOUT_HISTORY)) return;

      const st = String(req.params.settlementType || '');
      const stCheck = settlementTypeParamSchema.validate(st);
      if (stCheck.error) {
        res.status(400).json({ success: false, error: 'Invalid settlementType' });
        return;
      }

      const { error, value } = validateInput<{
        appId: string;
        status: 'approved' | 'rejected' | 'all';
        limit: number;
        skip: number;
      }>(historyQuerySchema, req.query);
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const data = await TreasuryConsoleService.listSettlementHistory(
        value!.appId,
        st as TreasurySettlementType,
        {
          decision: value!.status,
          limit: value!.limit,
          skip: value!.skip
        }
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getSettlementMode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, Permission.VIEW_PAYOUT_HISTORY)) return;

      const st = String(req.params.settlementType || '');
      const stCheck = settlementTypeParamSchema.validate(st);
      if (stCheck.error) {
        res.status(400).json({ success: false, error: 'Invalid settlementType' });
        return;
      }

      const { error, value } = validateInput<{ appId: string }>(appIdQuerySchema, req.query);
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const data = await TreasuryConsoleService.getSettlementMode(
        merchantId,
        value!.appId,
        st as TreasurySettlementType
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async setSettlementMode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, [Permission.APPROVE_PAYOUT, Permission.MANAGE_SYSTEM_SETTINGS])) return;

      const st = String(req.params.settlementType || '');
      const stCheck = settlementTypeParamSchema.validate(st);
      if (stCheck.error) {
        res.status(400).json({ success: false, error: 'Invalid settlementType' });
        return;
      }

      const { error, value } = validateInput<{ appId: string; mode: 'manual' | 'automatic' }>(
        modeBodySchema,
        req.body
      );
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const data = await TreasuryConsoleService.setSettlementMode(
        merchantId,
        value!.appId,
        st as TreasurySettlementType,
        value!.mode
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async approveSettlements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, [Permission.APPROVE_PAYOUT, Permission.INITIATE_PAYOUT])) return;

      const st = String(req.params.settlementType || '');
      const stCheck = settlementTypeParamSchema.validate(st);
      if (stCheck.error) {
        res.status(400).json({ success: false, error: 'Invalid settlementType' });
        return;
      }

      const { error, value } = validateInput<{ appId: string; references: string[] }>(
        approveBodySchema,
        req.body
      );
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const data = await TreasuryConsoleService.approveSettlements(
        merchantId,
        value!.appId,
        st as TreasurySettlementType,
        value!.references
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async rejectWithdrawals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, [Permission.APPROVE_PAYOUT, Permission.INITIATE_PAYOUT])) return;

      const { error, value } = validateInput<{ appId: string; references: string[]; reason?: string }>(
        rejectBodySchema,
        req.body
      );
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const data = await TreasuryConsoleService.rejectWithdrawals(
        merchantId,
        value!.appId,
        value!.references,
        value!.reason
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async rejectSettlements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, [Permission.APPROVE_PAYOUT, Permission.INITIATE_PAYOUT])) return;

      const st = String(req.params.settlementType || '');
      const stCheck = settlementTypeParamSchema.validate(st);
      if (stCheck.error) {
        res.status(400).json({ success: false, error: 'Invalid settlementType' });
        return;
      }

      const { error, value } = validateInput<{ appId: string; references: string[]; reason?: string }>(
        rejectBodySchema,
        req.body
      );
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const data = await TreasuryConsoleService.rejectSettlements(
        merchantId,
        value!.appId,
        st as TreasurySettlementType,
        value!.references,
        value!.reason
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getFundingInstructions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = resolveMerchantId(req);
      if (!merchantId || !assertMerchantAccess(req, merchantId, res)) return;
      if (!assertPermission(req, res, Permission.VIEW_WALLET_BALANCES)) return;

      const walletType = String(req.params.walletType || '');
      if (walletType !== 'treasury' && walletType !== 'billing') {
        res.status(400).json({ success: false, error: 'walletType must be treasury or billing' });
        return;
      }

      const { error, value } = validateInput<{ appId: string; amount: number }>(
        fundingInstructionsSchema,
        {
          appId: req.query.appId,
          amount: req.query.amount !== undefined ? Number(req.query.amount) : undefined
        }
      );
      if (error) {
        res.status(400).json({ success: false, error: 'Validation failed', details: error });
        return;
      }

      const instructions = await TreasuryConsoleService.formatWalletForFundingInstructions(
        merchantId,
        value!.appId,
        walletType,
        value!.amount
      );
      res.json({ success: true, data: { instructions } });
    } catch (err) {
      next(err);
    }
  }
}
