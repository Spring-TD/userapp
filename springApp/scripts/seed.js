/**
 * Seed script for SpringTD microservice databases.
 * Uses MongoDB connection from env: MONGO_BASE_URI (default: mongodb://admin:adminpassword@localhost:27017)
 * With Docker Compose use: MONGO_BASE_URI=mongodb://admin:adminpassword@localhost:27017 npm run seed
 * Set DRY_RUN=1 to log what would be seeded without writing.
 */

require('dotenv').config({ path: __dirname + '/.env' });
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const MONGO_BASE = process.env.MONGO_BASE_URI || process.env.MONGODB_URI || 'mongodb://admin:adminpassword@localhost:27017';
const BCRYPT_ROUNDS = 10;
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'SeedPassword123!';

function dbUri(dbName) {
  // Use only server part (no database path) so we can append /dbName
  const withoutQuery = MONGO_BASE.replace(/\?.*$/, '');
  const base = withoutQuery.replace(/\/[^/]*$/, '').replace(/\/$/, '') || withoutQuery;
  const hasAuth = base.includes('@');
  const suffix = hasAuth ? '?authSource=admin' : '';
  return `${base}/${dbName}${suffix}`;
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function run() {
  const hashedPassword = await hashPassword(SEED_PASSWORD);
  const now = new Date();
  const merchantId = new ObjectId().toString();
  const adminId = new ObjectId().toString();
  const userId = new ObjectId().toString();
  const roleId = new ObjectId().toString();

  // --- service_auth_db ---
  const serviceAuthRoles = [
    {
      _id: new ObjectId(),
      name: 'Admin',
      description: 'Full platform access',
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_roles', 'view_analytics'],
      merchant_id: merchantId,
      created_at: now,
      updated_at: now
    },
    {
      _id: new ObjectId(roleId),
      name: 'Operator',
      description: 'Standard operator role',
      permissions: ['read', 'write', 'view_analytics'],
      merchant_id: merchantId,
      created_at: now,
      updated_at: now
    }
  ];

  const serviceAuthUsers = [
    {
      _id: new ObjectId(merchantId),
      email: 'merchant@springtd.com',
      password: hashedPassword,
      first_name: 'Seed',
      last_name: 'Merchant',
      phone: '+15550000001',
      user_type: 'merchant',
      status: 'active',
      email_verified: true,
      phone_verified: false,
      created_at: now,
      updated_at: now,
      failed_login_attempts: 0,
      user_merchant_id: merchantId,
      country: 'US',
      callback_url: 'https://example.com/callback',
      error_logs_url: 'https://example.com/errors'
    },
    {
      _id: new ObjectId(adminId),
      email: 'admin@springtd.com',
      password: hashedPassword,
      first_name: 'Seed',
      last_name: 'Admin',
      phone: '+15550000002',
      user_type: 'admin',
      status: 'active',
      email_verified: true,
      phone_verified: false,
      created_at: now,
      updated_at: now,
      failed_login_attempts: 0,
      user_merchant_id: merchantId,
      country: 'US'
    },
    {
      _id: new ObjectId(userId),
      email: 'user@springtd.com',
      password: hashedPassword,
      first_name: 'Seed',
      last_name: 'User',
      phone: '+15550000003',
      user_type: 'user',
      status: 'active',
      email_verified: true,
      phone_verified: false,
      created_at: now,
      updated_at: now,
      failed_login_attempts: 0,
      user_merchant_id: merchantId,
      country: 'US',
      role_id: roleId
    }
  ];

  // --- client_auth_db (mirror users/roles if used by client-auth-ms) ---
  const clientAuthRoles = [
    {
      _id: new ObjectId(),
      name: 'Client User',
      description: 'Client app user',
      permissions: ['read', 'write'],
      merchant_id: merchantId,
      created_at: now,
      updated_at: now
    }
  ];

  const clientAuthUsers = [
    {
      _id: new ObjectId(),
      email: 'client@springtd.com',
      password: hashedPassword,
      first_name: 'Client',
      last_name: 'User',
      user_type: 'user',
      status: 'active',
      email_verified: true,
      phone_verified: false,
      created_at: now,
      updated_at: now,
      failed_login_attempts: 0,
      user_merchant_id: merchantId,
      country: 'US'
    }
  ];

  // --- account_db ---
  const accounts = [
    {
      _id: new ObjectId(),
      userId,
      accountNumber: 'ACC-' + Date.now().toString(36).toUpperCase(),
      accountType: 'checking',
      balance: 1000,
      currency: 'USD',
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  ];

  const applications = [
    {
      _id: new ObjectId(),
      userId,
      productId: 'prod-loan-001',
      productName: 'Personal Loan',
      productType: 'loan',
      amount: 5000,
      currency: 'USD',
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    }
  ];

  // --- compliance_db ---
  const kycProfiles = [
    {
      _id: new ObjectId(),
      userId: merchantId,
      userType: 'merchant',
      documents: [],
      status: 'pending',
      submittedAt: null,
      createdAt: now,
      updatedAt: now
    }
  ];

  // --- billing_db ---
  const subscriptions = [
    {
      _id: new ObjectId(),
      merchantId,
      customerId: userId,
      planId: 'plan-basic',
      amount: 29.99,
      currency: 'USD',
      billingType: 'recurring',
      interval: 'month',
      intervalCount: 1,
      status: 'active',
      startDate: now,
      nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now
    }
  ];

  // --- payment_db ---
  const recordId = 'rec-' + new ObjectId().toString();
  const merchantRecords = [
    {
      _id: new ObjectId(),
      recordId,
      recordType: 'MERCHANT',
      userId: merchantId,
      email: 'merchant@springtd.com',
      firstName: 'Seed',
      lastName: 'Merchant',
      userMerchantId: merchantId,
      country: 'US',
      currentBalance: 0,
      currency: 'USD',
      totalDebits: 0,
      totalCredits: 0,
      isActive: true,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now
    }
  ];

  // --- wallet_ms ---
  const walletId1 = new ObjectId();
  const walletId2 = new ObjectId();
  const wallets = [
    {
      _id: walletId1,
      walletType: 'MERCHANT',
      merchantId,
      merchantWalletType: 'REPAYMENT',
      name: 'Repayment Wallet',
      balance: 5000,
      mainBalance: 5000,
      ledgerBalance: 5000,
      currency: 'USD',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      _id: walletId2,
      walletType: 'USER',
      userId,
      merchantId,
      name: 'User Wallet',
      balance: 100,
      mainBalance: 100,
      ledgerBalance: 100,
      currency: 'USD',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }
  ];

  const transactions = [
    {
      _id: new ObjectId(),
      walletId: walletId1.toString(),
      amount: 100,
      type: 'CREDIT',
      status: 'COMPLETED',
      description: 'Seed credit',
      balanceBefore: 4900,
      balanceAfter: 5000,
      createdAt: now,
      updatedAt: now
    }
  ];

  // --- product_ms ---
  const merchantProductConfigurations = [
    {
      _id: new ObjectId(),
      productId: 'prod-loan-001',
      merchantId,
      isActive: true,
      pricingType: 'fixed',
      pricingCondition: null,
      upperCap: 10000,
      lowerCap: 1000,
      springTDFee: 0.5,
      serviceFee: 1.0,
      markupRate: 0,
      customTerms: {},
      enabledFeatures: ['disbursement', 'repayment'],
      createdAt: now,
      updatedAt: now
    }
  ];

  // --- create_app_db ---
  const apps = [
    {
      _id: new ObjectId(),
      name: 'Seed App',
      merchantId,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  ];

  const configs = [
    {
      _id: new ObjectId(),
      appId: null, // set after apps insert if needed
      templateId: null,
      config: { theme: 'default' },
      createdAt: now,
      updatedAt: now
    }
  ];

  const byDb = {
    service_auth_db: [
      { collection: 'roles', docs: serviceAuthRoles },
      { collection: 'useraccounts', docs: serviceAuthUsers }
    ],
    client_auth_db: [
      { collection: 'roles', docs: clientAuthRoles },
      { collection: 'useraccounts', docs: clientAuthUsers }
    ],
    account_db: [
      { collection: 'accounts', docs: accounts },
      { collection: 'applications', docs: applications }
    ],
    compliance_db: [
      { collection: 'kycprofiles', docs: kycProfiles }
    ],
    billing_db: [
      { collection: 'subscriptions', docs: subscriptions }
    ],
    payment_db: [
      { collection: 'merchantrecords', docs: merchantRecords }
    ],
    wallet_ms: [
      { collection: 'wallets', docs: wallets },
      { collection: 'transactions', docs: transactions }
    ],
    product_ms: [
      { collection: 'merchantproductconfigurations', docs: merchantProductConfigurations }
    ],
    create_app_db: [
      { collection: 'apps', docs: apps },
      { collection: 'appconfigurations', docs: configs }
    ]
  };

  console.log('SpringTD database seed');
  console.log('MONGO_BASE_URI:', MONGO_BASE.replace(/:[^:@]+@/, ':***@'));
  console.log('DRY_RUN:', DRY_RUN);
  console.log('');

  try {
    for (const [dbName, tasks] of Object.entries(byDb)) {
      const uri = dbUri(dbName);
      const client = new MongoClient(uri);
      await client.connect();
      const database = client.db(dbName);

      for (const { collection, docs } of tasks) {
        const coll = database.collection(collection);
        if (DRY_RUN) {
          console.log(`[DRY] ${dbName}.${collection}: would insert ${docs.length} document(s)`);
        } else {
          const existing = await coll.countDocuments();
          if (existing > 0) {
            console.log(`Skip ${dbName}.${collection} (already has ${existing} documents). Delete collection first to re-seed.`);
          } else {
            await coll.insertMany(docs);
            console.log(`Seeded ${dbName}.${collection}: ${docs.length} document(s)`);
          }
        }
      }
      await client.close();
    }

    console.log('\nSeed completed.');
    if (!DRY_RUN) {
      console.log('\nSeed users (password: ' + SEED_PASSWORD + '):');
      console.log('  merchant@springtd.com (merchant)');
      console.log('  admin@springtd.com (admin)');
      console.log('  user@springtd.com (user)');
      console.log('  client@springtd.com (client-auth)');
    }
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

run();
