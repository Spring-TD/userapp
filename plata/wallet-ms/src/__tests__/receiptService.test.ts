import {
  buildReceiptNumber,
  buildTransactionReceipt,
  renderReceiptPdf
} from '../services/receiptService';
import { createReceiptToken, verifyReceiptToken } from '../utils/receiptToken';
import { TransactionStatus, TransactionType } from '../models/Wallet';

const baseTxn = {
  id: '665f1a2b3c4d5e6f70819200',
  walletId: 'wallet_1',
  amount: -2500,
  type: TransactionType.DEBIT,
  status: TransactionStatus.COMPLETED,
  description: 'Loan repayment',
  referenceId: 'REF-123',
  externalReference: 'EXT-999',
  category: 'LOAN_REPAYMENT',
  balanceAfter: 7500,
  createdAt: new Date('2026-07-10T09:00:00.000Z'),
  updatedAt: new Date('2026-07-10T09:00:00.000Z')
} as const;

const userWallet = {
  id: 'wallet_1',
  userId: 'user_1',
  appId: 'app_1',
  walletType: 'USER' as const,
  walletPurpose: 'PRIMARY' as const,
  name: 'Primary Wallet',
  currency: 'NGN',
  mainBalance: 7500,
  ledgerBalance: 7500,
  status: 'ACTIVE' as const
};

describe('receiptService', () => {
  it('builds a deterministic receipt number from date + id', () => {
    expect(buildReceiptNumber(baseTxn as never)).toBe('RCPT-20260710-819200');
  });

  it('builds a structured receipt with formatted debit amount', () => {
    const receipt = buildTransactionReceipt(baseTxn as never, userWallet as never, {
      ownerName: 'Jane Doe',
      appName: 'Acme'
    });
    expect(receipt.direction).toBe('Debit');
    expect(receipt.amount).toBe(2500);
    expect(receipt.amountFormatted).toBe('NGN 2,500.00');
    expect(receipt.balanceAfterFormatted).toBe('NGN 7,500.00');
    expect(receipt.ownerName).toBe('Jane Doe');
    expect(receipt.appName).toBe('Acme');
    expect(receipt.reference).toBe('REF-123');
  });

  it('renders a non-empty PDF buffer', async () => {
    const receipt = buildTransactionReceipt(baseTxn as never, userWallet as never, {
      ownerName: 'Jane Doe',
      appName: 'Acme'
    });
    const pdf = await renderReceiptPdf(receipt);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('receiptToken', () => {
  it('round-trips a valid token', () => {
    const token = createReceiptToken('abc123');
    expect(verifyReceiptToken(token)).toBe('abc123');
  });

  it('rejects a tampered token', () => {
    const token = createReceiptToken('abc123');
    expect(verifyReceiptToken(token + 'x')).toBeNull();
    expect(verifyReceiptToken('abc123.deadbeef')).toBeNull();
    expect(verifyReceiptToken('')).toBeNull();
  });
});
