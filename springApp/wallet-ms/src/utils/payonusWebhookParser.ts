import { payonusNubanConfig } from '../config/payonusNuban';

export type PayonusFundingWebhookFields = {
  id?: string;
  type?: string;
  walletId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  transactionId?: string;
  paymentMethod?: string;
  status?: string;
  description?: string;
  providerReference?: string;
  merchantId?: string;
  businessId?: string;
  onusReference?: string;
  paymentChannel?: string;
  paymentStatus?: string;
  transactionAmount?: number;
  merchantReference?: string;
  accountNumber?: string;
  virtual_account_number?: string;
  hash?: string;
  transactionFee?: number;
  sessionId?: string;
  businessName?: string;
  merchantName?: string;
  customerName?: string;
  customerEmail?: string;
  beneficiaryAccountName?: string;
  beneficiaryBankName?: string;
  beneficiaryBankCode?: string;
  senderName?: string;
  senderAccountNumber?: string;
  senderBankName?: string;
  senderBankCode?: string;
  transactionDateTime?: string;
  fixedAccountId?: string;
  fixedAccountMerchantReference?: string;
};

const UNWRAP_KEYS = [
  'data',
  'payload',
  'notification',
  'event',
  'body',
  'result',
  'transaction',
  'creditNotification',
  'NotificationData',
  'notificationData',
  'rawPayload',
  'rawPayLoad',
  'attributes',
  'credit',
  'transfer'
];

const TRANSACTION_ID_PATHS = [
  'transactionId',
  'transaction_id',
  'transactionID',
  'id',
  'trxId',
  'trx_id',
  'onusReference',
  'onus_reference',
  'onUsReference',
  'OnUsReference',
  'providerReference',
  'provider_reference',
  'TransactionReference',
  'transactionReference',
  'transaction_reference',
  'paymentRequestId',
  'payment_request_id',
  'reference',
  'sessionId',
  'session_id',
  'financialTransactionReference',
  'processorReference',
  'data.transactionId',
  'data.id',
  'data.reference'
];

const ONUS_REFERENCE_PATHS = [
  'onusReference',
  'onus_reference',
  'onUsReference',
  'OnUsReference',
  'providerReference',
  'provider_reference',
  'TransactionReference',
  'transactionReference',
  'transaction_reference',
  'reference',
  'data.onusReference',
  'data.reference'
];

const AMOUNT_PATHS = [
  'amount',
  'Amount',
  'transactionAmount',
  'transaction_amount',
  'paidAmount.value',
  'paidAmount',
  'TotalAmount',
  'totalAmount',
  'CreditAmount',
  'creditAmount',
  'settlementAmount',
  'data.amount',
  'data.transactionAmount',
  'data.transaction_amount',
  'data.paidAmount.value',
  'data.paidAmount'
];

const TRANSACTION_FEE_PATHS = [
  'transactionFee',
  'transaction_fee',
  'fee',
  'Fee',
  'charges',
  'Charges',
  'charge',
  'Charge',
  'paymentFee',
  'payment_fee',
  'data.transactionFee',
  'data.transaction_fee',
  'data.fee',
  'data.charges'
];

const ACCOUNT_NUMBER_PATHS = [
  ...payonusNubanConfig.accountNumberPaths,
  'BeneficiaryAccount',
  'beneficiaryAccount',
  'beneficiary_account',
  'virtualAccountNo',
  'virtual_account_no',
  'virtualAccountNumber',
  'virtual_account_number',
  'receiverAccountNumber',
  'receiver_account_number',
  'destinationAccountNumber',
  'destination_account_number',
  'beneficiary.accountNumber',
  'beneficiary.account_number',
  'customer.account.number',
  'customer.accountNumber',
  'data.beneficiaryAccount',
  'data.beneficiary.accountNumber',
  'data.beneficiary.account_number',
  'data.account_number'
];

const BENEFICIARY_ACCOUNT_NAME_PATHS = [
  'accountName',
  'account_name',
  'beneficiaryAccountName',
  'beneficiary_account_name',
  'BeneficiaryAccountName',
  'beneficiary.accountName',
  'beneficiary.account_name',
  'customer.account.name',
  'customer.accountName',
  'data.accountName',
  'data.account_name',
  'data.beneficiaryAccountName',
  'data.beneficiary_account_name'
];

const BENEFICIARY_BANK_NAME_PATHS = [
  'bankName',
  'bank_name',
  'beneficiaryBankName',
  'beneficiary_bank_name',
  'BeneficiaryBankName',
  'beneficiary.bankName',
  'beneficiary.bank_name',
  'customer.account.bankName',
  'customer.bankName',
  'data.bankName',
  'data.bank_name',
  'data.beneficiaryBankName',
  'data.beneficiary_bank_name'
];

const BENEFICIARY_BANK_CODE_PATHS = [
  'bankCode',
  'bank_code',
  'beneficiaryBankCode',
  'beneficiary_bank_code',
  'BeneficiaryBankCode',
  'beneficiary.bankCode',
  'beneficiary.bank_code',
  'customer.account.bankCode',
  'customer.bankCode',
  'data.bankCode',
  'data.bank_code',
  'data.beneficiaryBankCode',
  'data.beneficiary_bank_code'
];

const STATUS_PATHS = [
  'status',
  'paymentStatus',
  'payment_status',
  'transactionStatus',
  'transaction_status',
  'state',
  'latestTransactionStatus',
  'additionalInfo.transactionStatusDesc',
  'additionalInfo.latestTransactionStatus',
  'data.status',
  'data.paymentStatus',
  'data.payment_status',
  'data.state'
];

const CURRENCY_PATHS = [
  'currency',
  'Currency',
  'paidAmount.currency',
  'data.currency',
  'data.paidAmount.currency'
];

const PAYMENT_METHOD_PATHS = [
  'paymentMethod',
  'payment_method',
  'paymentChannel',
  'payment_channel',
  'channel',
  'type',
  'data.paymentMethod',
  'data.paymentChannel'
];

const BUSINESS_ID_PATHS = [
  'businessId',
  'business_id',
  'businessID',
  'partnerServiceId',
  'partner_service_id',
  'data.businessId',
  'data.business_id'
];

const BUSINESS_NAME_PATHS = [
  'businessName',
  'business_name',
  'BusinessName',
  'business.name',
  'data.businessName',
  'data.business_name',
  'data.business.name'
];

const MERCHANT_NAME_PATHS = [
  'merchantName',
  'merchant_name',
  'MerchantName',
  'merchant.name',
  'data.merchantName',
  'data.merchant_name',
  'data.merchant.name'
];

const CUSTOMER_NAME_PATHS = [
  'customerName',
  'customer_name',
  'CustomerName',
  'customer.name',
  'customer.fullName',
  'customer.full_name',
  'data.customerName',
  'data.customer_name',
  'data.customer.name'
];

const CUSTOMER_EMAIL_PATHS = [
  'email',
  'emailAddress',
  'email_address',
  'customerEmail',
  'customer_email',
  'customer.email',
  'customer.emailAddress',
  'customer.email_address',
  'data.email',
  'data.emailAddress',
  'data.customerEmail',
  'data.customer.email'
];

const SENDER_NAME_PATHS = [
  'senderName',
  'sender_name',
  'SenderName',
  'sender.name',
  'senderDetails.name',
  'originatorName',
  'originator_name',
  'payerName',
  'payer_name',
  'data.senderName',
  'data.sender_name',
  'data.sender.name',
  'data.senderDetails.name',
  'data.originatorName'
];

const SENDER_ACCOUNT_NUMBER_PATHS = [
  'senderAccountNumber',
  'sender_account_number',
  'SenderAccountNumber',
  'sender.accountNumber',
  'sender.account_number',
  'senderDetails.accountNumber',
  'senderDetails.account_number',
  'originatorAccountNumber',
  'originator_account_number',
  'payerAccountNumber',
  'payer_account_number',
  'sourceAccountNumber',
  'source_account_number',
  'data.senderAccountNumber',
  'data.sender_account_number',
  'data.sender.accountNumber',
  'data.senderDetails.accountNumber',
  'data.senderDetails.account_number',
  'data.originatorAccountNumber'
];

const SENDER_BANK_NAME_PATHS = [
  'senderBankName',
  'sender_bank_name',
  'SenderBankName',
  'sender.bankName',
  'sender.bank_name',
  'senderDetails.bankName',
  'senderDetails.bank_name',
  'originatorBankName',
  'originator_bank_name',
  'payerBankName',
  'payer_bank_name',
  'sourceBankName',
  'source_bank_name',
  'data.senderBankName',
  'data.sender_bank_name',
  'data.sender.bankName',
  'data.senderDetails.bankName',
  'data.senderDetails.bank_name',
  'data.originatorBankName'
];

const SENDER_BANK_CODE_PATHS = [
  'senderBankCode',
  'sender_bank_code',
  'SenderBankCode',
  'sender.bankCode',
  'sender.bank_code',
  'senderDetails.bankCode',
  'senderDetails.bank_code',
  'originatorBankCode',
  'originator_bank_code',
  'payerBankCode',
  'payer_bank_code',
  'sourceBankCode',
  'source_bank_code',
  'data.senderBankCode',
  'data.sender_bank_code',
  'data.sender.bankCode',
  'data.senderDetails.bankCode',
  'data.senderDetails.bank_code',
  'data.originatorBankCode'
];

const SESSION_ID_PATHS = [
  'sessionId',
  'session_id',
  'SessionID',
  'SessionId',
  'nipSessionId',
  'nip_session_id',
  'paymentSessionId',
  'payment_session_id',
  'sessionID',
  'data.sessionId',
  'data.session_id',
  'data.sessionID',
  'data.nipSessionId'
];

const TRANSACTION_DATE_TIME_PATHS = [
  'dateTime',
  'date_time',
  'transactionDateTime',
  'transaction_date_time',
  'transactionDate',
  'transaction_date',
  'createdAt',
  'created_at',
  'paidAt',
  'paid_at',
  'paymentDate',
  'payment_date',
  'data.dateTime',
  'data.transactionDateTime',
  'data.transaction_date_time',
  'data.createdAt',
  'data.paidAt'
];

const DESCRIPTION_PATHS = [
  'description',
  'narration',
  'message',
  'remark',
  'data.description',
  'data.narration'
];

const HASH_PATHS = ['hash', 'signature', 'data.hash'];

const FIXED_ACCOUNT_ID_PATHS = ['fixedAccountId', 'fixed_account_id', 'data.fixedAccountId', 'data.fixed_account_id'];

const FIXED_ACCOUNT_MERCHANT_REFERENCE_PATHS = [
  'fixedAccountMerchantReference',
  'fixed_account_merchant_reference',
  'data.fixedAccountMerchantReference',
  'data.fixed_account_merchant_reference'
];

function tryParseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function getAtPath(obj: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function firstString(obj: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const value = getAtPath(obj, path);
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return undefined;
}

function parseNumericAmount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const normalized = value.replace(/,/g, '').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value && typeof value === 'object') {
    const nested = value as Record<string, unknown>;
    if (nested.value !== undefined) return parseNumericAmount(nested.value);
    if (nested.amount !== undefined) return parseNumericAmount(nested.amount);
  }
  return undefined;
}

function firstAmount(obj: unknown, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = getAtPath(obj, path);
    const parsed = parseNumericAmount(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function collectPayloadLayers(raw: unknown, depth = 0, layers: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (depth > 6 || raw === null || raw === undefined) return layers;

  if (typeof raw === 'string') {
    const parsed = tryParseJsonString(raw);
    if (parsed !== raw) return collectPayloadLayers(parsed, depth + 1, layers);
    return layers;
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      collectPayloadLayers(item, depth + 1, layers);
    }
    return layers;
  }

  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    layers.push(record);
    for (const key of UNWRAP_KEYS) {
      if (record[key] !== undefined && record[key] !== null) {
        collectPayloadLayers(record[key], depth + 1, layers);
      }
    }
  }

  return layers;
}

function pickAcrossLayers<T>(
  layers: Record<string, unknown>[],
  picker: (layer: Record<string, unknown>) => T | undefined
): T | undefined {
  for (const layer of layers) {
    const value = picker(layer);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function summarizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => summarizeValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(input).slice(0, 40)) {
      if (/secret|password|token|authorization/i.test(key)) {
        output[key] = '[redacted]';
      } else {
        output[key] = summarizeValue(nested, depth + 1);
      }
    }
    return output;
  }
  return String(value);
}

export function summarizeRawBodyForLog(raw: unknown): unknown {
  return summarizeValue(raw);
}

export function getRawBodyTopLevelKeys(raw: unknown): string[] {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return ['[text/plain json]'];
    return ['[text/plain]'];
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.keys(raw as Record<string, unknown>).slice(0, 40);
}

export function parsePayonusRawPayload(raw: unknown, depth = 0): unknown {
  if (depth > 8) return raw;
  if (typeof raw === 'string') {
    const parsed = tryParseJsonString(raw);
    return parsed === raw ? raw : parsePayonusRawPayload(parsed, depth + 1);
  }
  if (Array.isArray(raw)) return raw.map((item) => parsePayonusRawPayload(item, depth + 1));
  if (raw && typeof raw === 'object') {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
        key,
        parsePayonusRawPayload(value, depth + 1)
      ])
    );
  }
  return raw;
}

export function parsePayonusFundingWebhookBody(raw: unknown): PayonusFundingWebhookFields {
  const layers = collectPayloadLayers(parsePayonusRawPayload(raw));
  if (!layers.length) return {};

  const transactionId = pickAcrossLayers(layers, (layer) => firstString(layer, TRANSACTION_ID_PATHS));
  const onusReference = pickAcrossLayers(layers, (layer) => firstString(layer, ONUS_REFERENCE_PATHS));
  const amount = pickAcrossLayers(layers, (layer) => firstAmount(layer, AMOUNT_PATHS));
  const transactionFee = pickAcrossLayers(layers, (layer) => firstAmount(layer, TRANSACTION_FEE_PATHS));
  const accountNumber = pickAcrossLayers(layers, (layer) => firstString(layer, ACCOUNT_NUMBER_PATHS));
  const beneficiaryAccountName = pickAcrossLayers(layers, (layer) =>
    firstString(layer, BENEFICIARY_ACCOUNT_NAME_PATHS)
  );
  const beneficiaryBankName = pickAcrossLayers(layers, (layer) => firstString(layer, BENEFICIARY_BANK_NAME_PATHS));
  const beneficiaryBankCode = pickAcrossLayers(layers, (layer) => firstString(layer, BENEFICIARY_BANK_CODE_PATHS));
  const status = pickAcrossLayers(layers, (layer) => firstString(layer, STATUS_PATHS));
  const paymentStatus = pickAcrossLayers(layers, (layer) =>
    firstString(layer, ['paymentStatus', 'payment_status', 'data.paymentStatus', 'data.payment_status'])
  );
  const currency = pickAcrossLayers(layers, (layer) => firstString(layer, CURRENCY_PATHS));
  const paymentMethod = pickAcrossLayers(layers, (layer) => firstString(layer, PAYMENT_METHOD_PATHS));
  const paymentChannel = pickAcrossLayers(layers, (layer) =>
    firstString(layer, ['paymentChannel', 'payment_channel', 'channel', 'data.paymentChannel'])
  );
  const businessId = pickAcrossLayers(layers, (layer) => firstString(layer, BUSINESS_ID_PATHS));
  const businessName = pickAcrossLayers(layers, (layer) => firstString(layer, BUSINESS_NAME_PATHS));
  const merchantName = pickAcrossLayers(layers, (layer) => firstString(layer, MERCHANT_NAME_PATHS));
  const customerName = pickAcrossLayers(layers, (layer) => firstString(layer, CUSTOMER_NAME_PATHS));
  const customerEmail = pickAcrossLayers(layers, (layer) => firstString(layer, CUSTOMER_EMAIL_PATHS));
  const senderName = pickAcrossLayers(layers, (layer) => firstString(layer, SENDER_NAME_PATHS));
  const senderAccountNumber = pickAcrossLayers(layers, (layer) => firstString(layer, SENDER_ACCOUNT_NUMBER_PATHS));
  const senderBankName = pickAcrossLayers(layers, (layer) => firstString(layer, SENDER_BANK_NAME_PATHS));
  const senderBankCode = pickAcrossLayers(layers, (layer) => firstString(layer, SENDER_BANK_CODE_PATHS));
  const sessionId = pickAcrossLayers(layers, (layer) => firstString(layer, SESSION_ID_PATHS));
  const transactionDateTime = pickAcrossLayers(layers, (layer) => firstString(layer, TRANSACTION_DATE_TIME_PATHS));
  const description = pickAcrossLayers(layers, (layer) => firstString(layer, DESCRIPTION_PATHS));
  const hash = pickAcrossLayers(layers, (layer) => firstString(layer, HASH_PATHS));
  const fixedAccountId = pickAcrossLayers(layers, (layer) => firstString(layer, FIXED_ACCOUNT_ID_PATHS));
  const fixedAccountMerchantReference = pickAcrossLayers(layers, (layer) =>
    firstString(layer, FIXED_ACCOUNT_MERCHANT_REFERENCE_PATHS)
  );
  const type = pickAcrossLayers(layers, (layer) => firstString(layer, ['type', 'event', 'eventType', 'event_type']));
  const merchantReference = pickAcrossLayers(layers, (layer) =>
    firstString(layer, ['merchantReference', 'merchant_reference', 'customer.reference', 'data.merchantReference'])
  );

  const parsed: PayonusFundingWebhookFields = {};
  if (transactionId) parsed.transactionId = transactionId;
  if (onusReference) parsed.onusReference = onusReference;
  if (amount !== undefined) {
    parsed.amount = amount;
    parsed.transactionAmount = amount;
  }
  if (transactionFee !== undefined) parsed.transactionFee = transactionFee;
  if (accountNumber) {
    parsed.accountNumber = accountNumber;
    parsed.virtual_account_number = accountNumber;
  }
  if (beneficiaryAccountName) parsed.beneficiaryAccountName = beneficiaryAccountName;
  if (beneficiaryBankName) parsed.beneficiaryBankName = beneficiaryBankName;
  if (beneficiaryBankCode) parsed.beneficiaryBankCode = beneficiaryBankCode;
  if (status) parsed.status = status;
  if (paymentStatus) parsed.paymentStatus = paymentStatus;
  if (currency) parsed.currency = currency;
  if (paymentMethod) parsed.paymentMethod = paymentMethod;
  if (paymentChannel) parsed.paymentChannel = paymentChannel;
  if (businessId) parsed.businessId = businessId;
  if (businessName) parsed.businessName = businessName;
  if (merchantName) parsed.merchantName = merchantName;
  if (customerName) parsed.customerName = customerName;
  if (customerEmail) parsed.customerEmail = customerEmail;
  if (senderName) parsed.senderName = senderName;
  if (senderAccountNumber) parsed.senderAccountNumber = senderAccountNumber;
  if (senderBankName) parsed.senderBankName = senderBankName;
  if (senderBankCode) parsed.senderBankCode = senderBankCode;
  if (sessionId) parsed.sessionId = sessionId;
  if (transactionDateTime) parsed.transactionDateTime = transactionDateTime;
  if (description) parsed.description = description;
  if (hash) parsed.hash = hash;
  if (fixedAccountId) parsed.fixedAccountId = fixedAccountId;
  if (fixedAccountMerchantReference) parsed.fixedAccountMerchantReference = fixedAccountMerchantReference;
  if (type) parsed.type = type;
  if (merchantReference) parsed.merchantReference = merchantReference;

  return parsed;
}
