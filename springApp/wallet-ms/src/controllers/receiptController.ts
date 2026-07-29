import { Request, Response } from 'express';
import { db } from '../db/database';
import { logger } from '../utils/logger';
import { buildTransactionReceipt, renderReceiptPdf } from '../services/receiptService';
import { verifyReceiptToken } from '../utils/receiptToken';
import { fetchMerchantOwner, fetchRetailUserProfile, formatPersonName } from '../services/authProfileClient';
import type { Wallet } from '../models/Wallet';

async function resolveOwnerName(wallet: Wallet | null | undefined): Promise<string | undefined> {
  if (!wallet) return undefined;
  if (wallet.walletType === 'USER') {
    const userId = (wallet as { userId?: string }).userId;
    if (!userId) return undefined;
    const profile = await fetchRetailUserProfile(userId);
    return formatPersonName(profile?.firstName, profile?.lastName, 'Customer');
  }
  const merchantId = (wallet as { merchantId?: string }).merchantId;
  if (!merchantId) return undefined;
  const owner = await fetchMerchantOwner(merchantId);
  return formatPersonName(owner?.firstName, owner?.lastName, 'Merchant');
}

/**
 * Authorize access to a transaction receipt. Accepts either:
 *  - a signed receipt token (?token=) embedded in notification links, or
 *  - an authenticated session that owns the wallet (req.user).
 */
function isAuthorized(req: Request, transactionWalletOwnerUserId?: string, merchantId?: string): boolean {
  const token = (req.query.token as string | undefined) || '';
  if (token) {
    const id = verifyReceiptToken(token);
    if (id && id === req.params.transactionId) return true;
  }
  const user = req.user;
  if (user) {
    if (transactionWalletOwnerUserId && user.userId === transactionWalletOwnerUserId) return true;
    if (merchantId && user.merchantId === merchantId) return true;
  }
  return false;
}

export class ReceiptController {
  static async getReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const transaction = await db.getTransactionById(transactionId);
      if (!transaction) {
        res.status(404).json({ success: false, error: 'Transaction not found' });
        return;
      }
      const wallet = await db.getWalletById(transaction.walletId);
      const ownerUserId = wallet?.walletType === 'USER' ? (wallet as { userId?: string }).userId : undefined;
      const merchantId = wallet?.walletType === 'MERCHANT' ? (wallet as { merchantId?: string }).merchantId : undefined;

      if (!isAuthorized(req, ownerUserId, merchantId)) {
        res.status(403).json({ success: false, error: 'Not authorized to view this receipt' });
        return;
      }

      const ownerName = await resolveOwnerName(wallet);
      const receipt = buildTransactionReceipt(transaction, wallet, { ownerName });
      res.status(200).json({ success: true, data: receipt });
    } catch (error) {
      logger.error('Error building transaction receipt', { error });
      res.status(500).json({ success: false, error: 'Failed to build receipt' });
    }
  }

  static async getReceiptPdf(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const transaction = await db.getTransactionById(transactionId);
      if (!transaction) {
        res.status(404).json({ success: false, error: 'Transaction not found' });
        return;
      }
      const wallet = await db.getWalletById(transaction.walletId);
      const ownerUserId = wallet?.walletType === 'USER' ? (wallet as { userId?: string }).userId : undefined;
      const merchantId = wallet?.walletType === 'MERCHANT' ? (wallet as { merchantId?: string }).merchantId : undefined;

      if (!isAuthorized(req, ownerUserId, merchantId)) {
        res.status(403).json({ success: false, error: 'Not authorized to view this receipt' });
        return;
      }

      const ownerName = await resolveOwnerName(wallet);
      const receipt = buildTransactionReceipt(transaction, wallet, { ownerName });
      const pdf = await renderReceiptPdf(receipt);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${receipt.receiptNumber}.pdf"`
      );
      res.setHeader('Content-Length', pdf.length);
      res.status(200).end(pdf);
    } catch (error) {
      logger.error('Error rendering transaction receipt PDF', { error });
      res.status(500).json({ success: false, error: 'Failed to render receipt PDF' });
    }
  }
}
