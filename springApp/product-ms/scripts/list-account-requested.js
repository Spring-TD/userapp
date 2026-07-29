const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('No Mongo URI in env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  console.log('collections', collections.join(', '));

  const filter = { loanWorkflowStatus: 'account_requested' };
  let total = 0;
  const hits = [];

  for (const name of collections) {
    const count = await db.collection(name).countDocuments(filter);
    if (count > 0) {
      hits.push({ name, count });
      total += count;
      const sample = await db
        .collection(name)
        .find(filter, {
          projection: {
            _id: 1,
            productName: 1,
            productType: 1,
            userId: 1,
            appId: 1,
            status: 1,
            loanWorkflowStatus: 1,
            amount: 1,
            createdAt: 1
          }
        })
        .limit(20)
        .toArray();
      console.log(JSON.stringify({ collection: name, count, sample }, null, 2));
    }
  }

  console.log(JSON.stringify({ total, hits }, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
