/**
 * Backfill user wallet PAYOUT debits into create-app-ms (merchant Transactions tab).
 *
 * Usage (from wallet-ms root, with MONGODB_URI + CREATE_APP_SERVICE_URL + JWT_SECRET in env):
 *   node scripts/backfill-payout-app-transactions.js              # dry-run (default)
 *   node scripts/backfill-payout-app-transactions.js --execute      # write mirrors
 *   node scripts/backfill-payout-app-transactions.js --execute --appId <appId>
 *   node scripts/backfill-payout-app-transactions.js --execute --userId <userId>
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });

const mongoose = require('mongoose');
const axios = require('axios');

const args = process.argv.slice(2);
const execute = args.includes('--execute');
const appIdFilter = readArg('--appId');
const userIdFilter = readArg('--userId');

function readArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx === args.length - 1) return undefined;
  return args[idx + 1]?.trim() || undefined;
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function mapMirrorStatus(providerStatus, payoutStatus, walletTransactionStatus, reversed) {
  if (reversed) return 'failed';
  const lifecycle = normalizeLifecycle(payoutStatus || providerStatus);
  if (lifecycle === 'FAILED' || lifecycle === 'REVERSED') return 'failed';
  if (lifecycle === 'SUCCESSFUL') return 'completed';
  const walletStatus = (walletTransactionStatus || '').toUpperCase();
  if (walletStatus === 'COMPLETED') return 'completed';
  if (walletStatus === 'FAILED' || walletStatus === 'CANCELLED') return 'failed';
  if (lifecycle === 'PENDING' || lifecycle === 'PROCESSING') return 'pending';
  return 'completed';
}

function normalizeLifecycle(status) {
  const normalized = (status || '').trim().toUpperCase();
  if (!normalized) return 'UNKNOWN';
  if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED', 'PAID', 'SETTLED', 'APPROVED'].includes(normalized)) return 'SUCCESSFUL';
  if (['FAILED', 'FAILURE', 'REJECTED', 'DECLINED', 'ERROR'].includes(normalized)) return 'FAILED';
  if (['REVERSED', 'REVERSAL', 'REFUNDED', 'RETURNED', 'CANCELLED', 'CANCELED'].includes(normalized)) return 'REVERSED';
  if (['PROCESSING', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(normalized)) return 'PROCESSING';
  if (['PENDING', 'INITIATED', 'QUEUED', 'NEW'].includes(normalized)) return 'PENDING';
  return 'UNKNOWN';
}

function descriptionStatus(providerStatus, mirrorStatus) {
  if (mirrorStatus === 'completed') return 'SUCCESSFUL';
  if (mirrorStatus === 'failed') return (providerStatus || 'FAILED').toUpperCase();
  return (providerStatus || 'PENDING').toUpperCase();
}

async function resolveAppIdForUser(wallets, userId, merchantId) {
  const doc = await wallets.findOne(
    {
      walletType: 'USER',
      userId,
      ...(merchantId ? { merchantId } : {}),
      appId: { $exists: true, $nin: [null, ''] }
    },
    { projection: { appId: 1 } }
  );
  return pickString(doc?.appId);
}

async function mirrorPayout({ createAppBase, token, payload }) {
  const url = `${createAppBase.replace(/\/$/, '')}/api/v1/special/transactions/app`;
  const res = await axios.post(url, payload, {
    timeout: 15_000,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': token
    },
    validateStatus: () => true
  });
  return { status: res.status, body: res.data };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  const createAppBase = process.env.CREATE_APP_SERVICE_URL;
  const token = (process.env.JWT_SECRET || process.env.WALLET_INTERNAL_TOKEN || '').trim();

  if (!mongoUri) throw new Error('MONGODB_URI (or DATABASE_URL) is required');
  if (execute && (!createAppBase || !token)) {
    throw new Error('CREATE_APP_SERVICE_URL and JWT_SECRET are required for --execute');
  }

  console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY-RUN'}`);
  if (appIdFilter) console.log(`Filter appId: ${appIdFilter}`);
  if (userIdFilter) console.log(`Filter userId: ${userIdFilter}`);

  await mongoose.connect(mongoUri);
  const transactions = mongoose.connection.collection('transactions');
  const wallets = mongoose.connection.collection('wallets');

  const payoutQuery = {
    category: 'PAYOUT',
    type: 'DEBIT',
    amount: { $lt: 0 }
  };

  const cursor = transactions.find(payoutQuery).sort({ createdAt: 1 });
  const rows = await cursor.toArray();
  console.log(`Found ${rows.length} user wallet PAYOUT debit(s) in wallet-ms`);

  const walletCache = new Map();
  const summary = { mirrored: 0, skipped: 0, failed: 0, dryRun: 0 };

  for (const txn of rows) {
    const walletId = String(txn.walletId || '');
    let wallet = walletCache.get(walletId);
    if (!wallet) {
      wallet = await wallets.findOne(
        { _id: new mongoose.Types.ObjectId(walletId) },
        {
          projection: {
            walletType: 1,
            userId: 1,
            merchantId: 1,
            appId: 1,
            name: 1,
            currency: 1
          }
        }
      );
      walletCache.set(walletId, wallet || null);
    }

    if (!wallet || wallet.walletType !== 'USER' || !wallet.userId) {
      summary.skipped += 1;
      console.log(`SKIP ${txn._id} — not a user wallet (${walletId})`);
      continue;
    }

    if (userIdFilter && wallet.userId !== userIdFilter) {
      continue;
    }

    let appId = pickString(wallet.appId);
    if (!appId) {
      appId = await resolveAppIdForUser(wallets, wallet.userId, wallet.merchantId);
    }
    if (!appId) {
      summary.skipped += 1;
      console.log(`SKIP ${txn._id} — no appId for user ${wallet.userId}`);
      continue;
    }

    if (appIdFilter && appId !== appIdFilter) {
      continue;
    }

    const meta = txn.metadata && typeof txn.metadata === 'object' ? txn.metadata : {};
    const providerStatus = pickString(meta.providerStatus, meta.payoutStatus, 'PENDING');
    const payoutStatus = pickString(meta.payoutStatus);
    const reversed = meta.reversed === true;
    const mirrorStatus = mapMirrorStatus(providerStatus, payoutStatus, txn.status, reversed);
    const providerStatusUpper = providerStatus.toUpperCase();
    const labelStatus = descriptionStatus(providerStatusUpper, mirrorStatus);
    const amount = Math.abs(Number(txn.amount) || 0);
    const reference = pickString(txn.referenceId, String(txn._id));
    const providerReference = pickString(txn.externalReference, reference);
    const destinationBankName = pickString(meta.destinationBankName, meta.destinationBankCode);
    const destinationAccountLast4 = pickString(meta.destinationAccountLast4);
    const customerName = pickString(meta.destinationAccountName, wallet.name, 'Customer');
    const destinationLabel = [destinationBankName, destinationAccountLast4 ? `••••${destinationAccountLast4}` : '']
      .filter(Boolean)
      .join(' ');

    const payload = {
      appId,
      userId: wallet.userId,
      walletId,
      amount,
      currency: (wallet.currency || 'NGN').toUpperCase(),
      type: 'debit',
      status: mirrorStatus,
      description: `PayOnUs PAYOUT (${labelStatus})${destinationLabel ? ` to ${destinationLabel}` : ''}`,
      reference,
      metaRef: providerReference,
      provider: 'payonus',
      providerReference,
      metadata: {
        category: 'PAYOUT',
        backfilled: true,
        backfilledAt: new Date().toISOString(),
        walletTransactionId: String(txn._id),
        parties: {
          sender: { name: customerName }
        },
        payout: {
          destinationBankName,
          destinationAccountLast4
        },
        providerStatus,
        ...meta
      }
    };

    const label = `${wallet.userId} | ${amount} ${payload.currency} | ref ${reference} | app ${appId}`;

    if (!execute) {
      summary.dryRun += 1;
      console.log(`DRY-RUN ${label}`);
      continue;
    }

    try {
      const result = await mirrorPayout({ createAppBase, token, payload });
      if (result.status >= 200 && result.status < 300) {
        summary.mirrored += 1;
        console.log(`OK ${label}`);
      } else {
        summary.failed += 1;
        console.log(`FAIL ${label} — HTTP ${result.status} ${JSON.stringify(result.body)}`);
      }
    } catch (error) {
      summary.failed += 1;
      console.log(`FAIL ${label} — ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('');
  console.log('=== BACKFILL SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
