const mongoose = require('mongoose');

const uri =
  'mongodb+srv://doadmin:N4O91zw7o0i2s35p@db-mongodb-nyc3-18002-2beee51b.mongo.ondigitalocean.com/wallet_ms?tls=true&authSource=admin&replicaSet=db-mongodb-nyc3-18002';

(async () => {
  await mongoose.connect(uri);
  const wallets = mongoose.connection.collection('wallets');
  const rows = await wallets
    .find({
      merchantId: 'merchant_1774844182734_rm0g5u27l',
      appId: '69f330b2a795ac77103a6d77',
      merchantWalletType: { $in: ['KYC', 'REPAYMENT', 'SETTLEMENT'] }
    })
    .toArray();
  console.log(JSON.stringify(rows.map((w) => ({ id: String(w._id), type: w.merchantWalletType, currency: w.currency })), null, 2));
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
