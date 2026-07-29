import axios from 'axios';
import { config } from '../config/environment';
import { ApiError } from '../middleware/errorHandler';
import { TransactionService } from './transactionService';
import { DriveService } from './driveService';
import type {
  ProductOverviewCustomerTabRow,
  ProductOverviewGeneralInfoCard,
  ProductOverviewLoanTableRow,
  ProductOverviewPricingSettings,
  ProductOverviewResponse,
  ProductOverviewSummary,
  ProductOverviewTabs,
  ProductOverviewTransactionsTab
} from '../types/productOverview';
import type { DriveDocument, Transaction } from '../types/app';

type MerchantUserBrief = {
  displayName: string;
  email: string;
  userRef: string | null;
  phone: string | null;
};

type LooseApplication = {
  id: string;
  userId: string;
  productId: string;
  productName?: string;
  productType: string;
  amount: number;
  currency: string;
  status: string;
  appId?: string;
  rejectionReason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function toIso(d: Date | string | undefined): string {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString();
  try {
    return new Date(d).toISOString();
  } catch {
    return String(d);
  }
}

function isLoanLike(productType: string): boolean {
  const t = (productType || '').toLowerCase();
  return t.includes('loan') || t.includes('mortgage');
}

function productIdSet(productDoc: Record<string, unknown>, productIdPath: string): Set<string> {
  const ids = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) ids.add(v.trim());
  };
  add(productDoc.id);
  add(productDoc.referenceNumber);
  add(productDoc.upstreamProductId);
  add(productIdPath.trim());
  return ids;
}

function applicationMatchesProduct(app: LooseApplication, appId: string, ids: Set<string>): boolean {
  const aid = (app.appId || '').trim();
  if (aid !== appId.trim()) return false;
  return ids.has(app.productId);
}

function formatTenureLabel(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string' || typeof raw === 'number') {
    const s = String(raw).trim();
    return s.length ? s : null;
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    const months = o.months ?? o.month;
    const years = o.years ?? o.year;
    const parts: string[] = [];
    if (typeof years === 'number' && years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
    if (typeof months === 'number' && months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
    if (parts.length) return parts.join(', ');
    try {
      const j = JSON.stringify(raw);
      return j.length > 200 ? `${j.slice(0, 197)}...` : j;
    } catch {
      return null;
    }
  }
  return null;
}

function tenureLabelFromProduct(doc: Record<string, unknown>): string | null {
  const about = doc.about as Record<string, unknown> | undefined;
  const fromAbout = about?.tenure ?? about?.duration;
  const fromDoc = doc.tenure ?? doc.duration;
  return formatTenureLabel(fromAbout ?? fromDoc);
}

function requirementSummaryFromProduct(doc: Record<string, unknown>): string | null {
  const req = doc.requirements as Record<string, unknown> | undefined;
  if (!req || typeof req !== 'object') return null;
  const docs = req.documentsToDownload;
  if (Array.isArray(docs) && docs.length > 0) {
    const first = docs[0] as Record<string, unknown>;
    const name = first?.name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  const other = req.otherRequirements;
  if (Array.isArray(other) && other.length > 0) {
    const first = other[0] as Record<string, unknown>;
    const d = first?.description ?? first?.requirementType;
    if (typeof d === 'string' && d.trim()) return d.trim();
  }
  return null;
}

function parseTenureMonthsFromProduct(doc: Record<string, unknown>): number | null {
  const about = doc.about as Record<string, unknown> | undefined;
  const raw = about?.tenure ?? about?.duration ?? doc.tenure ?? doc.duration;
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw <= 120 ? Math.round(raw) : null;
  }
  if (typeof raw === 'string') {
    const m = raw.match(/(\d+(?:\.\d+)?)\s*months?/i);
    if (m) return Math.round(Number.parseFloat(m[1]));
    const y = raw.match(/(\d+(?:\.\d+)?)\s*years?/i);
    if (y) return Math.round(Number.parseFloat(y[1]) * 12);
    const n = Number.parseFloat(raw);
    if (!Number.isNaN(n) && n > 0 && n <= 600) return Math.round(n);
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    const months = o.months ?? o.month;
    if (typeof months === 'number' && months > 0) return Math.round(months);
    const years = o.years ?? o.year;
    if (typeof years === 'number' && years > 0) return Math.round(years * 12);
  }
  return null;
}

/** Interpret product.structure.interestRate as monthly decimal (e.g. 7 -> 0.07). Returns null if unknown. */
function parseMonthlyInterestDecimal(doc: Record<string, unknown>): number | null {
  const structure = doc.structure as Record<string, unknown> | undefined;
  if (!structure || typeof structure !== 'object') return null;
  const raw = structure.interestRate ?? structure.offerYield;
  if (raw == null) return null;
  let pct: number | null = null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    pct = raw;
  } else if (typeof raw === 'string') {
    const cleaned = raw.replace(/%/g, '').trim();
    const n = Number.parseFloat(cleaned);
    pct = Number.isFinite(n) ? n : null;
  }
  if (pct == null || pct < 0) return null;
  if (pct > 1) return pct / 100;
  return pct;
}

function loanTypeDisplayForCard(a: LooseApplication, doc: Record<string, unknown>): string {
  const raw = (a.productType || String(doc.type || '') || '').toUpperCase();
  if (raw.includes('MORTGAGE')) return 'Mortgage Loan';
  if (raw.includes('LOAN')) return 'Loan';
  const name = typeof doc.name === 'string' ? doc.name.trim() : '';
  const pn = (a.productName && a.productName.trim()) || '';
  return pn || name || 'Loan';
}

function estimateRepaymentTotal(
  principal: number,
  tenureMonths: number | null,
  monthlyRate: number | null
): number | null {
  if (principal <= 0 || !tenureMonths || tenureMonths <= 0 || monthlyRate == null || monthlyRate < 0) {
    return null;
  }
  const interest = principal * monthlyRate * tenureMonths;
  return Math.round((principal + interest) * 100) / 100;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** UI pattern e.g. `12:45 / Apr 12, 2025` (24h clock). */
function formatLoanBookTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso && iso.length > 0 ? iso : '—';
  }
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const mon = MONTH_SHORT[d.getMonth()];
  return `${hh}:${mm} / ${mon} ${d.getDate()}, ${d.getFullYear()}`;
}

function parseNumericFromFeeValue(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw).replace(/,/g, '').trim();
  const n = Number.parseFloat(s.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Sum numeric `fees[].value` under `feesAndCharges` (and same on `baseFeesAndCharges` if fees empty). */
function parsePrimaryFeeFromProduct(doc: Record<string, unknown>): number | null {
  const tryBlock = (fc: unknown): number | null => {
    if (!fc || typeof fc !== 'object') return null;
    const fees = (fc as Record<string, unknown>).fees;
    if (!Array.isArray(fees) || fees.length === 0) return null;
    let sum = 0;
    let found = false;
    for (const item of fees) {
      if (!item || typeof item !== 'object') continue;
      const v = (item as Record<string, unknown>).value;
      const n = parseNumericFromFeeValue(v);
      if (n != null) {
        sum += n;
        found = true;
      }
    }
    return found ? Math.round(sum * 100) / 100 : null;
  };

  const fromCharges = tryBlock(doc.feesAndCharges);
  if (fromCharges != null) return fromCharges;
  return tryBlock(doc.baseFeesAndCharges);
}

function buildLoanTableRow(
  a: LooseApplication,
  doc: Record<string, unknown>,
  userBriefById: Map<string, MerchantUserBrief>
): ProductOverviewLoanTableRow {
  const brief = a.userId ? userBriefById.get(a.userId) : undefined;
  const ref =
    (typeof doc.referenceNumber === 'string' && doc.referenceNumber.trim()) ||
    (typeof doc.id === 'string' && doc.id.trim()) ||
    '';
  const product = String(doc.name || a.productName || '').trim() || 'Product';
  const createdAt = toIso(a.createdAt);
  const fee = parsePrimaryFeeFromProduct(doc);
  const amount = Number(a.amount) || 0;
  const currency = (a.currency && a.currency.trim()) || 'NGN';

  return {
    applicationId: a.id,
    userId: a.userId,
    amount,
    currency,
    ref: ref.length > 0 ? ref : '—',
    timestamp: formatLoanBookTimestamp(createdAt),
    fee,
    feeCurrency: currency,
    product,
    metaRef: brief?.userRef?.trim() || a.userId,
    userEmail: brief?.email && brief.email.trim().length > 0 ? brief.email.trim() : '—',
    userPhone: brief?.phone && brief.phone.trim().length > 0 ? brief.phone.trim() : null,
    status: a.status,
    rejectionReason: a.rejectionReason,
    createdAt,
    updatedAt: toIso(a.updatedAt)
  };
}

async function fetchMerchantUserBriefMap(appId: string, authorization: string): Promise<{
  map: Map<string, MerchantUserBrief>;
  listOk: boolean;
}> {
  const map = new Map<string, MerchantUserBrief>();
  try {
    const url = `${config.accountServiceUrl.replace(/\/+$/, '')}/api/v1/user/list`;
    const res = await axios.get(url, {
      headers: { Authorization: authorization },
      params: { appId },
      timeout: 15000,
      validateStatus: () => true
    });
    if (res.status !== 200) {
      return { map, listOk: false };
    }
    const users = res.data?.data?.users;
    if (!Array.isArray(users)) {
      return { map, listOk: false };
    }
    for (const u of users) {
      const id = u?.id ?? u?.userId ?? u?._id;
      if (!id) continue;
      const fn = String(u.first_name ?? u.firstName ?? '').trim();
      const ln = String(u.last_name ?? u.lastName ?? '').trim();
      const full = [fn, ln].filter(Boolean).join(' ').trim();
      const email = String(u.email ?? '').trim();
      const displayName = full || email || String(id);
      const refRaw = u.user_ref ?? u.userRef;
      const userRef =
        typeof refRaw === 'string' && refRaw.trim().length > 0 ? refRaw.trim() : null;
      const phoneRaw = u.phone ?? u.phone_number;
      const phone =
        typeof phoneRaw === 'string' && phoneRaw.trim().length > 0 ? phoneRaw.trim() : null;
      map.set(String(id), { displayName, email: email || '—', userRef, phone });
    }
    return { map, listOk: true };
  } catch (e) {
    console.error('[product-overview] merchant user list failed:', e);
    return { map, listOk: false };
  }
}

function buildGeneralInfoCard(
  a: LooseApplication,
  doc: Record<string, unknown>,
  userBriefById: Map<string, MerchantUserBrief>
): ProductOverviewGeneralInfoCard {
  const principal = Number(a.amount) || 0;
  const tenureMonths = parseTenureMonthsFromProduct(doc);
  const tenureDisplay =
    tenureMonths != null && tenureMonths > 0
      ? `${tenureMonths} Month${tenureMonths === 1 ? '' : 's'}`
      : tenureLabelFromProduct(doc);

  const monthlyRate = parseMonthlyInterestDecimal(doc);
  const repayment = estimateRepaymentTotal(principal, tenureMonths, monthlyRate);

  const brief = a.userId ? userBriefById.get(a.userId) : undefined;
  const borrowerName =
    brief && brief.displayName.trim().length > 0 ? brief.displayName.trim() : '—';

  return {
    applicationId: a.id,
    userId: a.userId,
    loanInformation: {
      name: borrowerName,
      type: loanTypeDisplayForCard(a, doc)
    },
    loanTenure: {
      tenure: tenureDisplay,
      repayment,
      currency: a.currency || 'NGN'
    },
    loanRequirement: {
      name: requirementSummaryFromProduct(doc)
    },
    status: a.status,
    createdAt: toIso(a.createdAt),
    updatedAt: toIso(a.updatedAt)
  };
}

function extractPricingSettings(doc: Record<string, unknown>): ProductOverviewPricingSettings {
  const out: ProductOverviewPricingSettings = {};
  const keys: Array<keyof ProductOverviewPricingSettings> = [
    'feesAndCharges',
    'baseFeesAndCharges',
    'merchantFeeAdditions',
    'pricingType',
    'pricingCondition',
    'upperCap',
    'lowerCap',
    'springTDFee',
    'serviceFee',
    'markupRate',
    'customTerms',
    'enabledFeatures'
  ];
  for (const k of keys) {
    if (k in doc && doc[k as string] !== undefined) {
      (out as Record<string, unknown>)[k] = doc[k as string];
    }
  }
  const config = doc.config as Record<string, unknown> | undefined;
  if (config && typeof config === 'object') {
    for (const k of keys) {
      if (!(k in out) && k in config && config[k as string] !== undefined) {
        (out as Record<string, unknown>)[k] = config[k as string];
      }
    }
  }
  return out;
}

function pickLatestDriveDocByUserId(docs: DriveDocument[]): Map<string, DriveDocument> {
  const byUser = new Map<string, DriveDocument>();
  for (const d of docs) {
    const uid = d.userId;
    if (!uid || byUser.has(uid)) continue;
    byUser.set(uid, d);
  }
  return byUser;
}

function buildCustomerTabRows(
  scoped: LooseApplication[],
  userBriefById: Map<string, MerchantUserBrief>,
  driveByUserId: Map<string, DriveDocument>
): ProductOverviewCustomerTabRow[] {
  const byUser = new Map<string, string[]>();
  for (const a of scoped) {
    if (!a.userId) continue;
    const list = byUser.get(a.userId) || [];
    list.push(a.id);
    byUser.set(a.userId, list);
  }

  return [...byUser.entries()].map(([userId, applicationIds]) => {
    const brief = userBriefById.get(userId);
    const drive = driveByUserId.get(userId);
    const submittedFile =
      drive && drive.id && drive.url
        ? { documentId: drive.id, url: drive.url, fileName: drive.fileName || 'document' }
        : null;

    return {
      userId,
      userName: brief?.displayName?.trim() || '—',
      email: brief?.email?.trim() || '—',
      userDisplayId: brief?.userRef?.trim() || userId,
      applicationIds,
      applicationCount: applicationIds.length,
      submittedFile
    };
  });
}

async function fetchProductConfig(appId: string, productId: string, authorization: string): Promise<any> {
  const url = `${config.productServiceUrl.replace(/\/+$/, '')}/api/v1/products/config/${encodeURIComponent(appId)}/${encodeURIComponent(productId)}`;
  try {
    const res = await axios.get(url, {
      headers: { Authorization: authorization },
      timeout: 20000,
      validateStatus: (s) => s < 500
    });
    if (res.status === 404) {
      throw new ApiError(404, 'Product not found for this app');
    }
    if (res.status >= 400) {
      const msg =
        (res.data && typeof res.data.error === 'string' && res.data.error) ||
        `Product service returned ${res.status}`;
      throw new ApiError(res.status >= 400 && res.status < 500 ? res.status : 502, msg);
    }
    const data = res.data?.data;
    if (!data) {
      throw new ApiError(502, 'Invalid product service response');
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 404) {
        throw new ApiError(404, 'Product not found for this app');
      }
      throw new ApiError(502, err.message || 'Failed to reach product service');
    }
    throw err;
  }
}

async function fetchApplicationsFromAccountMs(
  authorization: string,
  adminId: string | undefined,
  appId: string
): Promise<LooseApplication[]> {
  const headers: Record<string, string> = { Authorization: authorization };
  if (adminId?.trim()) {
    headers['x-admin-id'] = adminId.trim();
  }
  const url = `${config.accountServiceUrl.replace(/\/+$/, '')}/api/v1/applications`;
  const applications: LooseApplication[] = [];
  let page = 1;
  const limit = 20;

  while (true) {
    const res = await axios.get(url, {
      headers,
      params: { appId: appId.trim(), page, limit },
      timeout: 20000,
      validateStatus: () => true
    });
    if (res.status >= 400) {
      throw new Error(`account-ms applications ${res.status}`);
    }
    const list = res.data?.data;
    if (!Array.isArray(list)) {
      return applications;
    }
    applications.push(...list);

    const pagination = res.data?.pagination as { hasNextPage?: boolean; totalPages?: number } | undefined;
    if (!pagination?.hasNextPage || page >= (pagination.totalPages ?? page)) {
      return applications;
    }
    page += 1;
  }
}

export async function buildProductOverview(opts: {
  appId: string;
  productIdPath: string;
  authorization: string;
  adminId?: string;
  transactionPage?: number;
  transactionLimit?: number;
}): Promise<ProductOverviewResponse> {
  const appId = opts.appId.trim();
  const productIdPath = opts.productIdPath.trim();
  if (!appId || !productIdPath) {
    throw new ApiError(400, 'App ID and product ID are required');
  }

  const productDoc = await fetchProductConfig(appId, productIdPath, opts.authorization);
  const doc = productDoc as Record<string, unknown>;
  if (String(doc.appId || '').trim() !== appId) {
    throw new ApiError(403, 'Product does not belong to this app');
  }
  if (doc.isActive !== true) {
    throw new ApiError(400, 'Product is not active for this app');
  }

  const ids = productIdSet(doc, productIdPath);

  const warnings: string[] = [];
  let applications: LooseApplication[] = [];
  try {
    applications = await fetchApplicationsFromAccountMs(opts.authorization, opts.adminId, appId);
  } catch (e) {
    console.error('[product-overview] applications fetch failed:', e);
    warnings.push('applications_unavailable');
  }

  const scoped = applications.filter((a) => applicationMatchesProduct(a, appId, ids));

  let requestedAmount = 0;
  let approvedAmount = 0;
  let pendingAmount = 0;
  let rejectedAmount = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const a of scoped) {
    requestedAmount += Number(a.amount) || 0;
    const st = (a.status || '').toUpperCase();
    if (st === 'APPROVED') {
      approvedAmount += Number(a.amount) || 0;
      approvedCount += 1;
    } else if (st === 'PENDING') {
      pendingAmount += Number(a.amount) || 0;
      pendingCount += 1;
    } else if (st === 'REJECTED') {
      rejectedAmount += Number(a.amount) || 0;
      rejectedCount += 1;
    }
  }

  const { map: userBriefById, listOk: userListOk } = await fetchMerchantUserBriefMap(appId, opts.authorization);
  if (!userListOk && scoped.some((a) => a.userId)) {
    warnings.push('customer_names_unavailable');
  }

  let driveByUserId = new Map<string, DriveDocument>();
  try {
    const driveDocs = await DriveService.getDocumentsByAppId(appId, { limit: 500 });
    driveByUserId = pickLatestDriveDocByUserId(driveDocs);
  } catch (e) {
    console.error('[product-overview] drive documents fetch failed:', e);
    warnings.push('drive_documents_unavailable');
  }

  const activeLoans: ProductOverviewLoanTableRow[] = [];
  const inactiveLoans: ProductOverviewLoanTableRow[] = [];
  const pendingLoans: ProductOverviewLoanTableRow[] = [];
  for (const a of scoped) {
    if (!isLoanLike(a.productType)) continue;
    const st = (a.status || '').toUpperCase();
    const row = buildLoanTableRow(a, doc, userBriefById);
    if (st === 'APPROVED') activeLoans.push(row);
    else if (st === 'REJECTED') inactiveLoans.push(row);
    else if (st === 'PENDING') pendingLoans.push(row);
  }

  const buildGeneralInfoCards = (apps: LooseApplication[]): ProductOverviewGeneralInfoCard[] =>
    apps.map((a) => buildGeneralInfoCard(a, doc, userBriefById));

  let generalInfo: ProductOverviewGeneralInfoCard[] = buildGeneralInfoCards(
    scoped.filter((a) => isLoanLike(a.productType))
  );
  if (generalInfo.length === 0 && scoped.length > 0) {
    generalInfo = buildGeneralInfoCards(scoped);
  }

  if (userListOk && scoped.some((a) => a.userId && !userBriefById.has(a.userId))) {
    warnings.push('some_customer_names_unresolved');
  }

  const customerRows = buildCustomerTabRows(scoped, userBriefById, driveByUserId);

  const transactionProductKey =
    (typeof doc.id === 'string' && doc.id.trim()) ||
    (typeof doc.upstreamProductId === 'string' && doc.upstreamProductId.trim()) ||
    productIdPath;

  let txOverview = {
    completedVolume: 0,
    completedCount: 0,
    pendingVolume: 0,
    pendingCount: 0,
    failedCount: 0
  };
  try {
    txOverview = await TransactionService.getProductTransactionOverview(appId, transactionProductKey);
  } catch (e) {
    console.error('[product-overview] transaction aggregate failed:', e);
    warnings.push('transactions_summary_unavailable');
  }

  const page = Math.max(1, opts.transactionPage ?? 1);
  const limit = Math.min(100, Math.max(1, opts.transactionLimit ?? 25));

  let transactionItems: Transaction[] = [];
  try {
    transactionItems = await TransactionService.getTransactionsByAppId(appId, {
      productId: transactionProductKey,
      page,
      limit,
      status: undefined,
      type: undefined
    });
  } catch (e) {
    console.error('[product-overview] transaction list failed:', e);
    warnings.push('transactions_list_unavailable');
  }

  const summary: ProductOverviewSummary = {
    requestedAmount,
    approvedAmount,
    pendingAmount,
    rejectedAmount,
    applicationCount: scoped.length,
    approvedCount,
    pendingCount,
    rejectedCount,
    totalTransactionsAmount: txOverview.completedVolume,
    completedTransactionsCount: txOverview.completedCount,
    pendingTransactionsCount: txOverview.pendingCount,
    uniqueCustomerCount: customerRows.length
  };

  const transactionsTab: ProductOverviewTransactionsTab = {
    items: transactionItems,
    pagination: { page, limit }
  };

  const tabs: ProductOverviewTabs = {
    generalInfo,
    activeLoans,
    inactiveLoans,
    pendingLoans,
    customers: customerRows,
    transactions: transactionsTab,
    pricingSettings: extractPricingSettings(doc)
  };

  return {
    product: productDoc,
    summary,
    tabs,
    warnings
  };
}
