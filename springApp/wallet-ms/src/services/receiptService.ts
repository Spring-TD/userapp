import PDFDocument from 'pdfkit';
import type { Transaction, Wallet } from '../models/Wallet';
import { TransactionType } from '../models/Wallet';

type PdfDoc = InstanceType<typeof PDFDocument>;

export interface TransactionReceipt {
  receiptNumber: string;
  transactionId: string;
  status: string;
  direction: 'Credit' | 'Debit';
  amount: number;
  amountFormatted: string;
  currency: string;
  description: string;
  category?: string;
  reference?: string;
  externalReference?: string;
  dateTime: string;
  balanceAfterFormatted?: string;
  walletType: string;
  walletName?: string;
  ownerName?: string;
  appName?: string;
  counterparty?: {
    name?: string;
    accountNumber?: string;
    bankName?: string;
  };
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${Math.abs(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function buildReceiptNumber(transaction: Transaction): string {
  const created = transaction.createdAt ? new Date(transaction.createdAt) : new Date();
  const datePart = created.toISOString().slice(0, 10).replace(/-/g, '');
  const idPart = transaction.id.slice(-6).toUpperCase();
  return `RCPT-${datePart}-${idPart}`;
}

function resolveCounterparty(transaction: Transaction): TransactionReceipt['counterparty'] {
  if (transaction.senderDetails) {
    return {
      name: transaction.senderDetails.name,
      accountNumber: transaction.senderDetails.accountNumber,
      bankName: transaction.senderDetails.bankName
    };
  }
  const meta = transaction.metadata ?? {};
  const payout = (meta.payout as Record<string, unknown> | undefined) ?? undefined;
  if (payout) {
    return {
      name: (meta.destinationAccountName as string) || undefined,
      accountNumber: (payout.destinationAccountLast4 as string) || undefined,
      bankName: (payout.destinationBankName as string) || undefined
    };
  }
  const destName = meta.destinationAccountName as string | undefined;
  const destBank = meta.destinationBankName as string | undefined;
  if (destName || destBank) {
    return { name: destName, bankName: destBank };
  }
  return undefined;
}

export function buildTransactionReceipt(
  transaction: Transaction,
  wallet: Wallet | null | undefined,
  extra?: { ownerName?: string; appName?: string }
): TransactionReceipt {
  const currency = wallet?.currency || (transaction.metadata?.currency as string) || 'NGN';
  const direction = transaction.type === TransactionType.CREDIT ? 'Credit' : 'Debit';
  const dateTime = new Date(transaction.createdAt ?? Date.now()).toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos'
  });

  return {
    receiptNumber: buildReceiptNumber(transaction),
    transactionId: transaction.id,
    status: String(transaction.status),
    direction,
    amount: Math.abs(transaction.amount),
    amountFormatted: formatMoney(transaction.amount, currency),
    currency,
    description: transaction.description || `${direction} transaction`,
    category: transaction.category,
    reference: transaction.referenceId,
    externalReference: transaction.externalReference,
    dateTime,
    balanceAfterFormatted:
      typeof transaction.balanceAfter === 'number'
        ? formatMoney(transaction.balanceAfter, currency)
        : undefined,
    walletType: wallet?.walletType || 'WALLET',
    walletName: wallet && 'name' in wallet ? (wallet as { name?: string }).name : undefined,
    ownerName: extra?.ownerName,
    appName: extra?.appName,
    counterparty: resolveCounterparty(transaction)
  };
}

function row(doc: PdfDoc, label: string, value?: string): void {
  if (!value) return;
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#555').text(label, 55, y, { width: 170 });
  doc.font('Helvetica').fontSize(10).fillColor('#111').text(value, 235, y, { width: 305 });
  doc.moveDown(0.6);
}

/** Render a downloadable A4 PDF receipt from structured receipt data. */
export function renderReceiptPdf(receipt: TransactionReceipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const brand = receipt.appName || 'Spring';

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111').text(brand, { align: 'left' });
    doc.font('Helvetica').fontSize(12).fillColor('#555').text('Transaction Receipt');
    doc.moveDown(0.5);

    doc
      .strokeColor('#e5e5e5')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(0.8);

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(receipt.direction === 'Credit' ? '#0a7d2c' : '#b02a2a')
      .text(`${receipt.direction === 'Credit' ? '+' : '-'} ${receipt.amountFormatted}`);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#555')
      .text(`${receipt.direction} • ${receipt.status}`);
    doc.moveDown(1);

    row(doc, 'Receipt No.', receipt.receiptNumber);
    row(doc, 'Date', receipt.dateTime);
    row(doc, 'Description', receipt.description);
    row(doc, 'Category', receipt.category);
    row(doc, 'Reference', receipt.reference);
    row(doc, 'Provider Reference', receipt.externalReference);
    row(doc, 'Wallet', receipt.walletName || receipt.walletType);
    row(doc, 'Account Holder', receipt.ownerName);
    if (receipt.counterparty?.name || receipt.counterparty?.bankName) {
      row(
        doc,
        'Counterparty',
        [receipt.counterparty.name, receipt.counterparty.bankName].filter(Boolean).join(' — ')
      );
    }
    row(doc, 'Balance After', receipt.balanceAfterFormatted);
    row(doc, 'Transaction ID', receipt.transactionId);

    doc.moveDown(1.2);
    doc
      .strokeColor('#e5e5e5')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(0.6);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#999')
      .text(
        `This is a system-generated receipt from ${brand}. No signature is required. Generated on ${new Date().toLocaleString(
          'en-NG',
          { timeZone: 'Africa/Lagos' }
        )}.`,
        { align: 'center' }
      );

    doc.end();
  });
}
