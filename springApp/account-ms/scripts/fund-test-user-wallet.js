const mongoose = require('mongoose');

const uri =
  process.env.MONGODB_URI ||
  'mongodb+srv://doadmin:N4O91zw7o0i2s35p@db-mongodb-nyc3-18002-2beee51b.mongo.ondigitalocean.com/wallet_ms?tls=true&authSource=admin&replicaSet=db-mongodb-nyc3-18002';
const userId = process.argv[2] || '6a2fa2c55e076aafcf32316a';
const amount = Number(process.argv[3] || 500);

(async () => {
  await mongoose.connect(uri);
  const wallets = mongoose.connection.collection('wallets');
  const res = await wallets.updateOne(
    { userId, walletPurpose: 'PRIMARY' },
    { $set: { mainBalance: amount, ledgerBalance: amount, balance: amount, updatedAt: new Date() } }
  );
  const wallet = await wallets.findOne({ userId, walletPurpose: 'PRIMARY' });
  console.log(
    JSON.stringify({
      matched: res.matchedCount,
      modified: res.modifiedCount,
      balance: wallet?.mainBalance
    })
  );
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
