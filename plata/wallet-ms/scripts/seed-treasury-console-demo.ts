/**
 * Seed demo pending rows for Treasury console queues (John Dave / Sample Test App).
 *
 * Usage:
 *   set SEED_MONGO_URI=<wallet_ms mongo>
 *   set SEED_WALLET_ID=<treasury wallet id>
 *   npx ts-node scripts/seed-treasury-console-demo.ts
 */
import mongoose from 'mongoose';

const MONGODB_URI = (process.env.SEED_MONGO_URI || process.env.MONGODB_URI || '').trim();
const WALLET_ID = (process.env.SEED_WALLET_ID || '').trim();
const APP_ID = process.env.PLATA_APP_ID || '69efccf9a6f701fa458935e0';
const MERCHANT_ID = process.env.PLATA_MERCHANT_ID || 'merchant_1773335565089_odwk5b0dg';
const USER_ID = process.env.PLATA_E2E_USER_ID || '6a22a2a9dd6821e05ff4124a';
const SEED_TAG = 'seed-treasury-demo';

type SeedKind = 'withdrawals' | 'investments' | 'commodities' | 'savings';

const SEEDS: Array<{
  kind: SeedKind;
  referenceId: string;
  category: string;
  amountKobo: number;
  metadata: Record<string, unknown>;
  description: string;
}> = [
  {
    kind: 'withdrawals',
    referenceId: `${SEED_TAG}-withdrawal-001`,
    category: 'SAVINGS_WITHDRAWAL_REQUEST',
    amountKobo: 25_000_00, // ₦25,000
    description: 'Demo early savings withdrawal request',
    metadata: {
      appId: APP_ID,
      merchantId: MERCHANT_ID,
      userId: USER_ID,
      applicationId: 'demo-sav-wd-001',
      productId: 'demo-savings-product',
      productName: 'Demo Savings Plan',
      customerName: 'Ada Okonkwo',
      principal: 25000,
      returnAmount: 0,
      productType: 'SAVINGS',
      withdrawalRequest: true,
      requestingFrom: 'Early withdrawal',
      seedTag: SEED_TAG
    }
  },
  {
    kind: 'investments',
    referenceId: `${SEED_TAG}-investment-001`,
    category: 'INVESTMENT_LIQUIDATION_REQUEST',
    amountKobo: 150_000_00, // ₦150,000
    description: 'Demo matured investment liquidation',
    metadata: {
      appId: APP_ID,
      merchantId: MERCHANT_ID,
      userId: USER_ID,
      applicationId: 'demo-inv-001',
      productId: 'demo-investment-product',
      productName: 'Demo Fixed Investment',
      customerName: 'Chidi Eze',
      principal: 120000,
      returnAmount: 30000,
      productType: 'INVESTMENT',
      liquidationRequest: true,
      maturityPayout: true,
      maturity: new Date(Date.now() - 86400000).toISOString(),
      seedTag: SEED_TAG
    }
  },
  {
    kind: 'commodities',
    referenceId: `${SEED_TAG}-commodity-001`,
    category: 'COMMODITY_LIQUIDATION_REQUEST',
    amountKobo: 80_000_00, // ₦80,000
    description: 'Demo matured commodity liquidation',
    metadata: {
      appId: APP_ID,
      merchantId: MERCHANT_ID,
      userId: USER_ID,
      applicationId: 'demo-com-001',
      productId: 'demo-commodity-product',
      productName: 'Demo Gold Commodity',
      customerName: 'Ngozi Bello',
      principal: 70000,
      returnAmount: 10000,
      productType: 'COMMODITY',
      liquidationRequest: true,
      maturityPayout: true,
      maturity: new Date(Date.now() - 172800000).toISOString(),
      seedTag: SEED_TAG
    }
  },
  {
    kind: 'savings',
    referenceId: `${SEED_TAG}-savings-maturity-001`,
    category: 'SAVINGS_MATURITY_PAYOUT',
    amountKobo: 45_000_00, // ₦45,000
    description: 'Demo matured savings payout',
    metadata: {
      appId: APP_ID,
      merchantId: MERCHANT_ID,
      userId: USER_ID,
      applicationId: 'demo-sav-mat-001',
      productId: 'demo-savings-product',
      productName: 'Demo Target Savings',
      customerName: 'Tunde Adeyemi',
      principal: 40000,
      returnAmount: 5000,
      productType: 'SAVINGS',
      maturityPayout: true,
      maturity: new Date(Date.now() - 3600000).toISOString(),
      requestingFrom: 'Maturity payout',
      seedTag: SEED_TAG
    }
  }
];

async function main(): Promise<void> {
  if (!MONGODB_URI) throw new Error('SEED_MONGO_URI / MONGODB_URI required');
  if (!WALLET_ID) throw new Error('SEED_WALLET_ID required');

  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection('transactions');

  // Replace prior demo seeds for this app
  const deleted = await col.deleteMany({
    'metadata.appId': APP_ID,
    'metadata.seedTag': SEED_TAG
  });
  console.log(`Cleared ${deleted.deletedCount} prior demo seed(s)`);

  const now = new Date();
  for (const seed of SEEDS) {
    await col.insertOne({
      walletId: WALLET_ID,
      amount: seed.amountKobo,
      amountUnit: 'kobo',
      type: 'DEBIT',
      status: 'PENDING',
      description: seed.description,
      referenceId: seed.referenceId,
      category: seed.category,
      metadata: seed.metadata,
      createdAt: now,
      updatedAt: now
    });
    console.log(`✓ ${seed.kind}: ${seed.referenceId} (₦${(seed.amountKobo / 100).toLocaleString()})`);
  }

  await mongoose.disconnect();
  console.log('\nDone. Refresh Withdrawals / Settlements in Sample Test App.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
