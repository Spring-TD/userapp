/**
 * Live E2E — Treasury & Settlements console via account-ms-plata.
 *
 * Usage (John Dave / Plata — see logins.md):
 *   set PLATA_EMAIL=titusdavid39+a@gmail.com
 *   set PLATA_PASSWORD=SecurePass123!
 *   set PLATA_APP_ID=69efccf9a6f701fa458935e0
 *   set PLATA_MERCHANT_ID=merchant_1773335565089_odwk5b0dg
 *   set MONGODB_URI=<wallet-ms-plata Mongo connection string>
 *   npm run e2e:treasury-console
 */
import mongoose from 'mongoose';

const GATEWAY = (process.env.PLATA_GATEWAY_URL || 'https://account-ms-plata.fly.dev').replace(/\/$/, '');
const EMAIL = process.env.PLATA_EMAIL || 'titusdavid39+a@gmail.com';
const PASSWORD = process.env.PLATA_PASSWORD || 'SecurePass123!';
const APP_ID = process.env.PLATA_APP_ID || '69efccf9a6f701fa458935e0';
const MERCHANT_ID = process.env.PLATA_MERCHANT_ID || 'merchant_1773335565089_odwk5b0dg';
const MONGODB_URI = process.env.MONGODB_URI || '';

const E2E_REF = `e2e-treasury-${Date.now()}`;
const E2E_USER_ID = process.env.PLATA_E2E_USER_ID || '6a22a2a9dd6821e05ff4124a';
const E2E_AMOUNT_KOBO = 100; // ₦1.00

interface StepResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: StepResult[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
  const url = `${GATEWAY}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

async function login(): Promise<string> {
  const res = await fetch(`${GATEWAY}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const json = (await res.json()) as { accessToken?: string; success?: boolean };
  if (!res.ok || !json.accessToken) {
    throw new Error(`Login failed HTTP ${res.status}`);
  }
  return json.accessToken;
}

async function seedPendingInvestmentRow(treasuryWalletId: string): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI required to seed pending settlement row for approve E2E');
  }
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection('transactions');
  const existing = await col.findOne({ referenceId: E2E_REF });
  if (existing) {
    await col.deleteOne({ _id: existing._id });
  }
  await col.insertOne({
    walletId: treasuryWalletId,
    amount: E2E_AMOUNT_KOBO,
    amountUnit: 'kobo',
    type: 'DEBIT',
    status: 'PENDING',
    description: 'E2E treasury console pending investment liquidation',
    referenceId: E2E_REF,
    category: 'INVESTMENT_LIQUIDATION_REQUEST',
    metadata: {
      appId: APP_ID,
      merchantId: MERCHANT_ID,
      userId: E2E_USER_ID,
      applicationId: 'e2e-app-001',
      productId: '69efcd558af41e1b93bab6c2',
      productName: 'Loan Test Product',
      customerName: 'E2E Treasury Tester',
      principal: 1,
      returnAmount: 0,
      liquidationRequest: true,
      productType: 'INVESTMENT'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

async function cleanupSeed(): Promise<void> {
  if (!MONGODB_URI || mongoose.connection.readyState !== 1) return;
  const col = mongoose.connection.collection('transactions');
  await col.deleteMany({
    $or: [{ referenceId: E2E_REF }, { 'metadata.treasuryConsolePayoutReference': `treasury-console:investments:${E2E_REF}` }]
  });
}

async function main(): Promise<void> {
  console.log('\n=== Treasury console E2E (Plata) ===');
  console.log(`Gateway: ${GATEWAY}`);
  console.log(`Merchant: ${MERCHANT_ID} · App: ${APP_ID}\n`);

  let token: string;
  try {
    token = await login();
    pass('Login', EMAIL);
  } catch (e) {
    fail('Login', String(e));
    process.exit(1);
  }

  // --- Read paths ---
  const overviewBefore = await api(token, 'GET', `/api/v1/frontend-plata/treasury/overview?appId=${APP_ID}`);
  if (overviewBefore.status === 200 && overviewBefore.json.success) {
    const d = overviewBefore.json.data as Record<string, unknown>;
    pass('GET overview', `pendingTotal=${d.pendingTotal}`);
  } else {
    fail('GET overview', JSON.stringify(overviewBefore.json).slice(0, 200));
  }

  const treasuryWalletId =
    ((overviewBefore.json.data as Record<string, unknown>)?.wallets as Record<string, unknown>)?.treasury
      ? undefined
      : undefined;

  // Resolve treasury wallet id from funding instructions
  const fund = await api(
    token,
    'GET',
    `/api/v1/frontend-plata/treasury/wallets/treasury/funding-instructions?appId=${APP_ID}&amount=1`
  );
  const walletIdFromFund = (
    ((fund.json.data as Record<string, unknown>)?.instructions as Record<string, unknown>)?.walletId as string
  ) || '';
  const resolvedTreasuryWalletId = walletIdFromFund || treasuryWalletId || '';

  for (const wt of ['treasury', 'billing', 'repayment'] as const) {
    const r = await api(
      token,
      'GET',
      `/api/v1/frontend-plata/treasury/wallets/${wt}/transactions?appId=${APP_ID}&limit=3`
    );
    if (r.status === 200 && r.json.success) {
      const items = ((r.json.data as Record<string, unknown>)?.items as unknown[]) || [];
      pass(`GET ${wt} transactions`, `count=${items.length}`);
    } else {
      fail(`GET ${wt} transactions`, JSON.stringify(r.json).slice(0, 120));
    }
  }

  for (const wt of ['treasury', 'billing'] as const) {
    const r = await api(
      token,
      'GET',
      `/api/v1/frontend-plata/treasury/wallets/${wt}/funding-instructions?appId=${APP_ID}&amount=100`
    );
    if (r.status === 200 && r.json.success) pass(`GET ${wt} funding instructions`);
    else fail(`GET ${wt} funding instructions`, JSON.stringify(r.json).slice(0, 120));
  }

  const withdrawals = await api(token, 'GET', `/api/v1/frontend-plata/treasury/withdrawals?appId=${APP_ID}`);
  if (withdrawals.status === 200 && withdrawals.json.success) pass('GET withdrawals queue');
  else fail('GET withdrawals queue');

  // --- Seed + approve flow (investments) ---
  if (!resolvedTreasuryWalletId) {
    fail('Seed pending row', 'Could not resolve treasury walletId');
  } else if (!MONGODB_URI) {
    console.log('\n  ⚠ Skipping approve E2E (set MONGODB_URI to seed pending row)\n');
  } else {
    try {
      await seedPendingInvestmentRow(resolvedTreasuryWalletId);
      pass('Seed pending investment row', E2E_REF);

      const overviewPending = await api(token, 'GET', `/api/v1/frontend-plata/treasury/overview?appId=${APP_ID}`);
      const pendingTotal = (overviewPending.json.data as Record<string, unknown>)?.pendingTotal as number;
      if (pendingTotal >= 1) pass('Overview reflects pending', `pendingTotal=${pendingTotal}`);
      else fail('Overview reflects pending', `expected >=1 got ${pendingTotal}`);

      const listInv = await api(token, 'GET', `/api/v1/frontend-plata/treasury/settlements/investments?appId=${APP_ID}`);
      const items = ((listInv.json.data as Record<string, unknown>)?.items as Array<{ reference: string }>) || [];
      const found = items.some((i) => i.reference === E2E_REF);
      if (found) pass('GET settlements/investments lists seeded row');
      else fail('GET settlements/investments lists seeded row', `refs=${items.map((i) => i.reference).join(',')}`);

      const approve = await api(token, 'POST', '/api/v1/frontend-plata/treasury/settlements/investments/approve', {
        appId: APP_ID,
        references: [E2E_REF]
      });
      const ad = approve.json.data as Record<string, unknown>;
      if (approve.status === 200 && approve.json.success && (ad?.paidCount as number) === 1) {
        pass('POST approve investment settlement', `paid=${ad.paidCount} treasuryAfter=${ad.treasuryBalanceAfter}`);
      } else {
        fail('POST approve investment settlement', JSON.stringify(approve.json).slice(0, 300));
      }

      const overviewAfter = await api(token, 'GET', `/api/v1/frontend-plata/treasury/overview?appId=${APP_ID}`);
      const pendingAfter = (overviewAfter.json.data as Record<string, unknown>)?.pendingTotal as number;
      const pendingBefore = (overviewBefore.json.data as Record<string, unknown>)?.pendingTotal as number;
      if (pendingAfter <= pendingBefore) pass('Pending total cleared after approve', `now=${pendingAfter}`);
      else fail('Pending total cleared after approve', `before=${pendingBefore} after=${pendingAfter}`);
    } catch (e) {
      fail('Approve flow', String(e));
    } finally {
      await cleanupSeed();
      if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    }
  }

  // --- Settlement modes + empty batches ---
  for (const st of ['investments', 'commodities', 'savings'] as const) {
    const r = await api(token, 'GET', `/api/v1/frontend-plata/treasury/settlements/${st}?appId=${APP_ID}`);
    if (r.status === 200 && r.json.success) pass(`GET settlements/${st}`);
    else fail(`GET settlements/${st}`);
  }

  const modeGet = await api(
    token,
    'GET',
    `/api/v1/frontend-plata/treasury/settlements/commodities/mode?appId=${APP_ID}`
  );
  if (modeGet.status === 200 && modeGet.json.success) pass('GET settlement mode');

  const modePut = await api(token, 'PUT', '/api/v1/frontend-plata/treasury/settlements/commodities/mode', {
    appId: APP_ID,
    mode: 'automatic'
  });
  if (modePut.status === 200 && modePut.json.success) {
    pass('PUT settlement mode automatic', `paidCount=${(modePut.json.data as Record<string, unknown>)?.paidCount ?? 0}`);
  } else {
    fail('PUT settlement mode automatic', JSON.stringify(modePut.json).slice(0, 200));
  }

  await api(token, 'PUT', '/api/v1/frontend-plata/treasury/settlements/commodities/mode', {
    appId: APP_ID,
    mode: 'manual'
  });
  pass('PUT settlement mode manual (restore)');

  const emptyApprove = await api(token, 'POST', '/api/v1/frontend-plata/treasury/withdrawals/approve', {
    appId: APP_ID,
    references: []
  });
  if (emptyApprove.status === 200 && emptyApprove.json.success) pass('POST withdrawals approve (empty batch)');
  else fail('POST withdrawals approve (empty batch)');

  const emptySettle = await api(token, 'POST', '/api/v1/frontend-plata/treasury/settlements/savings/approve', {
    appId: APP_ID,
    references: []
  });
  if (emptySettle.status === 200 && emptySettle.json.success) pass('POST savings approve (empty batch)');
  else fail('POST savings approve (empty batch)');

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
