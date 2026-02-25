/**
 * Seed all plata microservice databases with data for the 3 users
 * created in client-auth-ms (admin@example.com, merchant@example.com, user@example.com).
 *
 * Prerequisites:
 * - MongoDB running (e.g. Docker: docker-compose up -d mongodb, or remote e.g. Digital Ocean)
 *
 * This script seeds client-auth-ms first (4 users: admin, merchant, user, user-ref; first 3 use password Password123!),
 * then seeds all other services using those users.
 *
 * Env – base URI (recommended for one host, many DBs):
 *   MONGODB_BASE_URI - Base connection string with no path (e.g. mongodb://user:pass@host:27017?authSource=admin).
 *   Each service then uses the default DB name below unless overridden.
 *
 * Env – per-service overrides (optional; full URI for that service):
 *   CLIENT_AUTH_MONGODB_URI  - client-auth-ms DB
 *   ACCOUNT_MS_MONGO_URI     - account-ms DB
 *   BILLING_MS_MONGODB_URI   - billing-ms DB
 *   CREATE_APP_MONGODB_URI   - create-app-ms DB
 *   WALLET_MS_MONGODB_URI    - wallet-ms DB
 *   PAYMENT_MS_MONGODB_URI   - payment-ms DB
 *   NOTIFICATIONS_MS_MONGO_URI - notifications-ms DB
 *   PRODUCT_MS_MONGODB_URI   - product-ms DB
 *   SERVICE_AUTH_MONGODB_URI - service-auth-ms DB
 *   COMPLIANCE_MS_MONGODB_URI - compliance-ms DB (KYC profiles)
 *
 * Run from plata/scripts: npm install && npm run seed
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import { URL } from 'url';
import bcrypt from 'bcrypt';

// Build a full service URI from base (no path) + default DB name. Base path is ignored.
function buildServiceUri(baseUri, dbName) {
  const parsed = new URL(baseUri);
  const hasQuery = parsed.search && parsed.search.length > 1;
  const credentials = parsed.username && parsed.password ? `${parsed.username}:${parsed.password}@` : '';
  const hostAndPort = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
  let uri = `${parsed.protocol}//${credentials}${hostAndPort}/${dbName}`;
  if (hasQuery) {
    uri += parsed.search.startsWith('?') ? parsed.search : `?${parsed.search}`;
  } else {
    uri += '?authSource=admin';
  }
  return uri;
}

const DEFAULT_BASE = 'mongodb://admin:adminpassword@localhost:27017';
const BASE_URI = process.env.MONGODB_BASE_URI || DEFAULT_BASE;

// Default database names per service (match docker-compose / service conventions)
const DEFAULT_DB_NAMES = {
  client_auth: 'client_auth_db',
  account: 'account_db',
  billing: 'billing_db',
  create_app: 'create-app-ms',
  wallet: 'wallet_ms',
  payment: 'payment_ms',
  notifications: 'notifications_db',
  product: 'product_ms',
  service_auth: 'service_auth_db',
  compliance: 'compliance_db'
};

// Use process.env overrides if available, otherwise build from base URI
const CLIENT_AUTH_URI = process.env.CLIENT_AUTH_MONGODB_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.client_auth);
const ACCOUNT_MS_URI = process.env.ACCOUNT_MS_MONGO_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.account);
const BILLING_MS_URI = process.env.BILLING_MS_MONGODB_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.billing);
const CREATE_APP_URI = process.env.CREATE_APP_MONGODB_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.create_app);
const WALLET_MS_URI = process.env.WALLET_MS_MONGODB_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.wallet);
const PAYMENT_MS_URI = process.env.PAYMENT_MS_MONGODB_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.payment);
const NOTIFICATIONS_MS_URI = process.env.NOTIFICATIONS_MS_MONGODB_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.notifications);
const PRODUCT_MS_URI = process.env.PRODUCT_MS_MONGODB_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.product);
const SERVICE_AUTH_URI = process.env.SERVICE_AUTH_MONGODB_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.service_auth);
const COMPLIANCE_MS_URI = process.env.COMPLIANCE_MS_MONGODB_URI || 
  buildServiceUri(BASE_URI, DEFAULT_DB_NAMES.compliance);

const SEEDED_EMAILS = ['admin@example.com', 'merchant@example.com', 'user@example.com'];
const MERCHANT_ID = 'seeded-merchant-001';

function log(msg) {
  console.log(`[seed] ${msg}`);
}

function logErr(msg, err) {
  console.error(`[seed] ${msg}`, err?.message || err);
}

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

/**
 * Seed client-auth-ms: create the 3 users (admin, merchant, user) if none exist.
 * Password for all: Password123!
 */
async function seedClientAuthMs(client) {
  const db = client.db();
  const col = db.collection('users');
  const existing = await col.countDocuments();
  if (existing > 0) {
    log('client-auth-ms: users already present, skipping.');
    return;
  }
  const hashedPassword = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);
  const placeholderPassword = await bcrypt.hash('__no_password_seeded-external-ref__', BCRYPT_ROUNDS);
  const now = new Date();
  const usersToInsert = [
    {
      email: 'admin@example.com',
      password: hashedPassword,
      first_name: 'System',
      last_name: 'Admin',
      phone: '+1234567890',
      user_type: 'admin',
      status: 'active',
      email_verified: true,
      phone_verified: true,
      country: 'US',
      user_merchant_id: 'admin',
      failed_login_attempts: 0,
      created_at: now,
      updated_at: now
    },
    {
      email: 'merchant@example.com',
      password: hashedPassword,
      first_name: 'Business',
      last_name: 'Owner',
      phone: '+1987654321',
      user_type: 'merchant',
      status: 'active',
      email_verified: true,
      phone_verified: true,
      country: 'US',
      user_merchant_id: MERCHANT_ID,
      callback_url: 'https://webhook.site/test',
      error_logs_url: 'https://webhook.site/logs',
      failed_login_attempts: 0,
      created_at: now,
      updated_at: now
    },
    {
      email: 'user@example.com',
      password: hashedPassword,
      first_name: 'Staff',
      last_name: 'Member',
      phone: '+1555000111',
      user_type: 'user',
      status: 'active',
      email_verified: true,
      phone_verified: true,
      country: 'US',
      user_merchant_id: MERCHANT_ID,
      failed_login_attempts: 0,
      created_at: now,
      updated_at: now
    },
    {
      email: 'user-ref@example.com',
      password: placeholderPassword,
      first_name: 'External',
      last_name: 'User',
      phone: '+1555000222',
      user_type: 'user',
      status: 'active',
      email_verified: true,
      phone_verified: false,
      country: 'NG',
      user_merchant_id: MERCHANT_ID,
      user_ref: 'seeded-external-ref',
      failed_login_attempts: 0,
      created_at: now,
      updated_at: now
    }
  ];
  await col.insertMany(usersToInsert);
  log('client-auth-ms: created 4 users (admin, merchant, user, user-ref). Password for first 3: Password123!');
  log('client-auth-ms: seeding done.');
}

/**
 * Fetch the 3 seeded users from client-auth-ms DB (users collection).
 * Returns [{ id, email, user_type, user_merchant_id }, ...]
 */
async function fetchClientAuthUsers(client) {
  const db = client.db();
  const col = db.collection('users');
  const cursor = col.find({ email: { $in: SEEDED_EMAILS } }).project({
    _id: 1,
    email: 1,
    user_type: 1,
    user_merchant_id: 1,
    first_name: 1,
    last_name: 1
  });
  const docs = await cursor.toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    email: d.email,
    user_type: d.user_type,
    user_merchant_id: d.user_merchant_id || '',
    first_name: d.first_name,
    last_name: d.last_name
  }));
}

/**
 * Seed billing-ms: Subscription for merchant and user (customer).
 */
async function seedBillingMs(client, users) {
  const db = client.db();
  const subsCol = db.collection('subscriptions');
  const txCol = db.collection('transactions');

  const existing = await subsCol.countDocuments();
  if (existing > 0) {
    log('billing-ms: subscriptions already present, skipping.');
    return;
  }

  const merchant = users.find((u) => u.user_type === 'merchant');
  const endUser = users.find((u) => u.user_type === 'user');
  const now = new Date();
  const nextBilling = new Date(now);
  nextBilling.setMonth(nextBilling.getMonth() + 1);

  if (merchant) {
    await subsCol.insertOne({
      merchantId: merchant.user_merchant_id,
      customerId: merchant.id,
      planId: 'plan-seed-merchant',
      amount: 29.99,
      currency: 'USD',
      billingType: 'recurring',
      interval: 'month',
      intervalCount: 1,
      status: 'active',
      startDate: now,
      nextBillingDate: nextBilling,
      createdAt: now,
      updatedAt: now
    });
    log(`billing-ms: created subscription for merchant ${merchant.email}`);
  }

  if (endUser && merchant) {
    await subsCol.insertOne({
      merchantId: merchant.user_merchant_id,
      customerId: endUser.id,
      planId: 'plan-seed-user',
      amount: 9.99,
      currency: 'USD',
      billingType: 'recurring',
      interval: 'month',
      intervalCount: 1,
      status: 'active',
      startDate: now,
      nextBillingDate: nextBilling,
      createdAt: now,
      updatedAt: now
    });
    log(`billing-ms: created subscription for user ${endUser.email}`);

    await txCol.insertOne({
      merchantId: merchant.user_merchant_id,
      customerId: endUser.id,
      amount: 9.99,
      currency: 'USD',
      billingType: 'recurring',
      type: 'payment',
      status: 'completed',
      description: 'Seed subscription payment',
      referenceId: `tx-seed-${Date.now()}`,
      createdAt: now,
      updatedAt: now
    });
    log('billing-ms: created sample transaction.');
  }
  log('billing-ms: seeding done.');
}

/**
 * Seed create-app-ms: Apps for the merchant.
 */
async function seedCreateAppMs(client, users) {
  const db = client.db();
  const appsCol = db.collection('apps');

  const merchant = users.find((u) => u.user_type === 'merchant');
  if (!merchant) return;

  const existing = await appsCol.countDocuments({ merchantId: merchant.user_merchant_id });
  if (existing > 0) {
    log('create-app-ms: apps already present for merchant, skipping.');
    return;
  }

  const now = new Date().toISOString();
  await appsCol.insertOne({
    name: 'Seeded Demo App',
    websiteUrl: 'https://example.com',
    alias: 'seeded-demo-app',
    description: 'Demo app created by seed script for seeded-merchant-001',
    merchantId: merchant.user_merchant_id,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    productKeys: []
  });
  log(`create-app-ms: created app for merchant ${merchant.email}`);
  log('create-app-ms: seeding done.');
}

/**
 * Seed wallet-ms: merchant wallets (Treasury, Operation, KYC) + user wallet for the end user.
 */
async function seedWalletMs(client, users) {
  const db = client.db();
  const walletsCol = db.collection('wallets');

  const existing = await walletsCol.countDocuments();
  if (existing > 0) {
    log('wallet-ms: wallets already present, skipping.');
    return;
  }

  const merchant = users.find((u) => u.user_type === 'merchant');
  const endUser = users.find((u) => u.user_type === 'user');
  const now = new Date();

  if (merchant) {
    for (const { type, name } of [
      { type: 'TREASURY', name: 'Treasury Wallet' },
      { type: 'OPERATION', name: 'Operation Wallet' },
      { type: 'KYC', name: 'KYC Wallet' }
    ]) {
      await walletsCol.insertOne({
        walletType: 'MERCHANT',
        merchantId: merchant.user_merchant_id,
        merchantWalletType: type,
        name,
        mainBalance: 0,
        ledgerBalance: 0,
        currency: 'USD',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      });
    }
    log(`wallet-ms: created 3 merchant wallets for ${merchant.email}`);
  }

  if (endUser && merchant) {
    await walletsCol.insertOne({
      walletType: 'USER',
      merchantId: merchant.user_merchant_id,
      userId: endUser.id,
      name: 'User Wallet',
      mainBalance: 0,
      ledgerBalance: 0,
      currency: 'USD',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    });
    log(`wallet-ms: created user wallet for ${endUser.email}`);
  }
  log('wallet-ms: seeding done.');
}

/**
 * Seed payment-ms: MerchantRecord for merchant, MerchantUserRecord for user.
 */
async function seedPaymentMs(client, users) {
  const db = client.db();
  const merchantCol = db.collection('merchantrecords');
  const userCol = db.collection('merchantuserrecords');

  const existing = await merchantCol.countDocuments();
  if (existing > 0) {
    log('payment-ms: records already present, skipping.');
    return;
  }

  const merchant = users.find((u) => u.user_type === 'merchant');
  const endUser = users.find((u) => u.user_type === 'user');
  const now = new Date();

  if (merchant) {
    await merchantCol.insertOne({
      recordId: randomUUID(),
      recordType: 'MERCHANT',
      userId: merchant.id,
      email: merchant.email,
      firstName: merchant.first_name,
      lastName: merchant.last_name,
      userMerchantId: merchant.user_merchant_id,
      country: 'US',
      currentBalance: 0,
      currency: 'USD',
      totalDebits: 0,
      totalCredits: 0,
      isActive: true,
      verifiedAt: now,
      metadata: {},
      createdAt: now,
      updatedAt: now
    });
    log(`payment-ms: created merchant record for ${merchant.email}`);
  }

  if (endUser && merchant) {
    await userCol.insertOne({
      recordId: randomUUID(),
      recordType: 'MERCHANT_USER',
      userId: endUser.id,
      email: endUser.email,
      firstName: endUser.first_name,
      lastName: endUser.last_name,
      userMerchantId: merchant.user_merchant_id,
      country: 'US',
      currentBalance: 0,
      currency: 'USD',
      totalDebits: 0,
      totalCredits: 0,
      isActive: true,
      verifiedAt: now,
      metadata: {},
      createdAt: now,
      updatedAt: now
    });
    log(`payment-ms: created merchant-user record for ${endUser.email}`);
  }
  log('payment-ms: seeding done.');
}

/**
 * Seed notifications-ms: sample notifications for the 3 users.
 */
async function seedNotificationsMs(client, users) {
  const db = client.db();
  const col = db.collection('notifications');

  const existing = await col.countDocuments();
  if (existing > 0) {
    log('notifications-ms: notifications already present, skipping.');
    return;
  }

  const now = new Date();
  for (const u of users) {
    const recipient = u.email;
    await col.insertOne({
      channel: 'email',
      recipient,
      template: 'welcome',
      data: { name: u.first_name },
      status: 'sent',
      retryCount: 0,
      sentAt: now,
      createdAt: now,
      updatedAt: now
    });
  }
  log(`notifications-ms: created ${users.length} sample notifications.`);
  log('notifications-ms: seeding done.');
}

/**
 * Seed product-ms: one product per app. Uses first app from create-app-ms for merchant if needed;
 * we seed a product with appId = merchant_id (alias) so it links to merchant.
 */
async function seedProductMs(client, users) {
  const db = client.db();
  const productsCol = db.collection('products');

  const merchant = users.find((u) => u.user_type === 'merchant');
  if (!merchant) return;

  const existing = await productsCol.countDocuments({ appId: merchant.user_merchant_id });
  if (existing > 0) {
    log('product-ms: products already present for merchant, skipping.');
    return;
  }

  const now = new Date().toISOString();
  const ref = `PRD-${Date.now().toString().slice(-6)}-SEED`;
  await productsCol.insertOne({
    referenceNumber: ref,
    name: 'Seeded Savings Product',
    description: 'Demo savings product for seeded merchant',
    type: 'Savings',
    appId: merchant.user_merchant_id,
    status: 'incomplete',
    createdAt: now,
    updatedAt: now
  });
  log(`product-ms: created product for merchant ${merchant.email}`);
  log('product-ms: seeding done.');
}

/**
 * Seed service-auth-ms: roles for the seeded merchant (so role-based flows work).
 */
async function seedServiceAuthMs(client, users) {
  const db = client.db();
  const rolesCol = db.collection('roles');

  const merchant = users.find((u) => u.user_type === 'merchant');
  if (!merchant) return;

  const existing = await rolesCol.countDocuments({ merchant_id: merchant.user_merchant_id });
  if (existing > 0) {
    log('service-auth-ms: roles already present for merchant, skipping.');
    return;
  }

  const now = new Date();
  const roles = [
    { _id: `role-seed-admin-${MERCHANT_ID}`, name: 'Admin', description: 'Full access', permissions: ['create_admin', 'see_billing', 'create_app', 'see_activity_log', 'view_products', 'edit_products', 'create_products'], merchant_id: merchant.user_merchant_id, created_at: now, updated_at: now },
    { _id: `role-seed-member-${MERCHANT_ID}`, name: 'Member', description: 'Standard user', permissions: ['view_products', 'change_password', 'see_activity_log'], merchant_id: merchant.user_merchant_id, created_at: now, updated_at: now }
  ];
  await rolesCol.insertMany(roles);
  log(`service-auth-ms: created ${roles.length} roles for merchant ${merchant.email}`);
  log('service-auth-ms: seeding done.');
}

/** KYC status / userType values used by compliance-ms */
const KYC_STATUS = { PENDING: 'pending', COMPLETED: 'completed', APPROVED: 'approved' };
const USER_TYPE = { INDIVIDUAL: 'individual', MERCHANT: 'merchant', ADMIN: 'admin' };

/**
 * Seed compliance-ms: one KYC profile per user (MongoDB).
 */
async function seedComplianceMs(client, users) {
  const db = client.db();
  const col = db.collection('kycprofiles');

  const existing = await col.countDocuments();
  if (existing > 0) {
    log('compliance-ms: KYC profiles already present, skipping.');
    return;
  }

  const now = new Date();
  for (const u of users) {
    const userType = u.user_type === 'merchant' ? USER_TYPE.MERCHANT : u.user_type === 'admin' ? USER_TYPE.ADMIN : USER_TYPE.INDIVIDUAL;
    const doc = {
      userId: u.id,
      userType,
      documents: [
        {
          _id: new ObjectId(),
          type: 'identity',
          fileName: `seed-doc-${u.id.slice(-6)}.pdf`,
          fileType: 'application/pdf',
          fileSize: 1024,
          uploadDate: now,
          status: KYC_STATUS.PENDING
        }
      ],
      status: KYC_STATUS.PENDING,
      submittedAt: now
    };
    await col.insertOne(doc);
    log(`compliance-ms: created KYC profile for ${u.email}`);
  }
  log('compliance-ms: seeding done.');
}

async function run() {
  let clientAuthClient;
  try {
    clientAuthClient = new MongoClient(CLIENT_AUTH_URI);
    await clientAuthClient.connect();
    log('Connected to client-auth-ms DB.');
  } catch (err) {
    logErr('Failed to connect to client-auth-ms DB. Is MongoDB running?', err);
    process.exit(1);
  }

  let users;
  try {
    await seedClientAuthMs(clientAuthClient);
    users = await fetchClientAuthUsers(clientAuthClient);
    await clientAuthClient.close();
  } catch (err) {
    logErr('Failed to seed or fetch users from client-auth-ms.', err);
    await clientAuthClient.close();
    process.exit(1);
  }

  if (users.length === 0) {
    log('No seeded users found (expected: admin@example.com, merchant@example.com, user@example.com). Ensure client-auth DB has these users.');
    process.exit(1);
  }
  log(`Found ${users.length} users: ${users.map((u) => u.email).join(', ')}.`);

  // account-ms is gateway-only (no DB); skip seeding it
  const steps = [
    { name: 'billing-ms', uri: BILLING_MS_URI, fn: seedBillingMs },
    { name: 'create-app-ms', uri: CREATE_APP_URI, fn: seedCreateAppMs },
    { name: 'wallet-ms', uri: WALLET_MS_URI, fn: seedWalletMs },
    { name: 'payment-ms', uri: PAYMENT_MS_URI, fn: seedPaymentMs },
    { name: 'notifications-ms', uri: NOTIFICATIONS_MS_URI, fn: seedNotificationsMs },
    { name: 'product-ms', uri: PRODUCT_MS_URI, fn: seedProductMs },
    { name: 'service-auth-ms', uri: SERVICE_AUTH_URI, fn: seedServiceAuthMs },
    { name: 'compliance-ms', uri: COMPLIANCE_MS_URI, fn: seedComplianceMs }
  ];

  for (const { name, uri, fn } of steps) {
    let client;
    try {
      client = new MongoClient(uri);
      await client.connect();
      log(`Connected to ${name}.`);
      await fn(client, users);
    } catch (err) {
      logErr(`${name}: error`, err);
    } finally {
      if (client) await client.close();
    }
  }

  log('Seed script finished.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
