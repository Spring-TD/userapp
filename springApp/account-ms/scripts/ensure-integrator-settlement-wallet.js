const mongoose = require('mongoose');

const uri =
  'mongodb+srv://doadmin:N4O91zw7o0i2s35p@db-mongodb-nyc3-18002-2beee51b.mongo.ondigitalocean.com/wallet_ms?tls=true&authSource=admin&replicaSet=db-mongodb-nyc3-18002';

const merchantId = process.argv[2] || '69d777637d4d75ddcc56ef91';
const currency = process.argv[3] || 'NGN';

(async () => {
  await mongoose.connect(uri);
  const wallets = mongoose.connection.collection('wallets');
  const existing = await wallets.findOne({
    merchantId,
    merchantWalletType: { $in: ['KYC', 'REPAYMENT', 'SETTLEMENT'] },
    currency
  });
  if (existing) {
    console.log(JSON.stringify({ created: false, id: String(existing._id), currency: existing.currency }));
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const result = await wallets.insertOne({
    walletType: 'MERCHANT',
    merchantId,
    merchantWalletType: 'REPAYMENT',
    name: 'Integrator Repayment Wallet',
    currency,
    balance: 0,
    mainBalance: 0,
    ledgerBalance: 0,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  });
  console.log(JSON.stringify({ created: true, id: String(result.insertedId), merchantId, currency }));
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
