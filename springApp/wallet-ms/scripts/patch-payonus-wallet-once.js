/**
 * One-off: patch PayOnUs NUBAN fields on a user's primary wallet.
 * Usage (from wallet-ms): node scripts/patch-payonus-wallet-once.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });

const mongoose = require('mongoose');

const userId = '6a0afef60bfb6e1589fe5c02';
const accountNumber = '7833909375';
const update = {
  payonusNubanAccountNumber: accountNumber,
  payonusNubanBankName: 'Globus Bank',
  payonusNubanProviderReference: 'user-6a0afef60bfb6e1589fe5c02',
  payonusNubanAccountType: 'reserved',
  payonusNubanProvisionStatus: 'active',
  payonusNubanProvisionError: null,
  payonusNubanProvisionedAt: new Date()
};

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('MONGODB_URI not set in wallet-ms/.env');
  }

  let host = 'unknown';
  try {
    host = new URL(uri).hostname;
  } catch {
    /* ignore */
  }
  console.log(`Connecting to MongoDB host: ${host}`);

  await mongoose.connect(uri);
  const wallets = mongoose.connection.collection('wallets');

  const conflict = await wallets.findOne(
    { payonusNubanAccountNumber: accountNumber, userId: { $ne: userId } },
    { projection: { _id: 1, userId: 1, name: 1 } }
  );
  if (conflict) {
    throw new Error(`Account number already on another wallet: ${JSON.stringify(conflict)}`);
  }

  const before = await wallets.findOne(
    {
      walletType: 'USER',
      userId,
      $or: [{ walletPurpose: 'PRIMARY' }, { walletPurpose: { $exists: false } }]
    },
    {
      projection: {
        _id: 1,
        userId: 1,
        name: 1,
        payonusNubanAccountNumber: 1,
        payonusNubanProvisionStatus: 1
      }
    }
  );

  if (!before) {
    throw new Error(`No primary USER wallet for userId ${userId}`);
  }

  const result = await wallets.findOneAndUpdate(
    { _id: before._id },
    { $set: update },
    {
      returnDocument: 'after',
      projection: {
        _id: 1,
        userId: 1,
        name: 1,
        payonusNubanAccountNumber: 1,
        payonusNubanBankName: 1,
        payonusNubanProviderReference: 1,
        payonusNubanAccountType: 1,
        payonusNubanProvisionStatus: 1,
        payonusNubanProvisionedAt: 1
      }
    }
  );

  const updated = result.value ?? result;
  console.log(
    JSON.stringify(
      {
        walletId: String(before._id),
        before: {
          payonusNubanAccountNumber: before.payonusNubanAccountNumber,
          payonusNubanProvisionStatus: before.payonusNubanProvisionStatus
        },
        after: updated
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
