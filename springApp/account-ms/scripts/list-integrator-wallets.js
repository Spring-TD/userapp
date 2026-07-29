const mongoose = require('mongoose');

const uri =
  'mongodb+srv://doadmin:N4O91zw7o0i2s35p@db-mongodb-nyc3-18002-2beee51b.mongo.ondigitalocean.com/wallet_ms?tls=true&authSource=admin&replicaSet=db-mongodb-nyc3-18002';

(async () => {
  await mongoose.connect(uri);
  const wallets = mongoose.connection.collection('wallets');
  const integratorMerchantId = process.argv[2] || '69d777637d4d75ddcc56ef91';
  const rows = await wallets
    .find({
      merchantId: integratorMerchantId,
      merchantWalletType: { $in: ['KYC', 'REPAYMENT', 'SETTLEMENT'] }
    })
    .toArray();
  console.log(JSON.stringify(rows, null, 2));
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
