const mongoose = require('mongoose');

const uri =
  process.env.MONGODB_URI ||
  'mongodb+srv://doadmin:N4O91zw7o0i2s35p@db-mongodb-nyc3-18002-2beee51b.mongo.ondigitalocean.com/wallet_ms?tls=true&authSource=admin&replicaSet=db-mongodb-nyc3-18002';
const walletId = process.argv[2] || '69f330b71956bb00e89cdfe6';
const currency = process.argv[3] || 'NGN';

(async () => {
  await mongoose.connect(uri);
  const wallets = mongoose.connection.collection('wallets');
  const res = await wallets.updateOne(
    { _id: new mongoose.Types.ObjectId(walletId) },
    { $set: { currency, updatedAt: new Date() } }
  );
  const wallet = await wallets.findOne({ _id: new mongoose.Types.ObjectId(walletId) });
  console.log(JSON.stringify({ modified: res.modifiedCount, currency: wallet?.currency }));
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
