/**
 * Seed / update BankOne banking config for Charis MFB on Plata (opt-in only).
 *
 * Usage (PowerShell):
 *   $env:WALLET_MS_URL = "https://wallet-ms-plata.fly.dev"
 *   $env:INTERNAL_TOKEN = "<wallet-ms JWT_SECRET>"
 *   $env:BANKONE_AUTH_TOKEN = "<renewed BankOne staging authToken>"
 *   $env:BANKONE_INSTITUTION_CODE = "...."
 *   npx ts-node src/scripts/seedCharisBankingConfig.ts
 *
 * Defaults merchantId to Charis from prior Plata lookup; override with CHARIS_MERCHANT_ID.
 */
import axios from 'axios';

const CHARIS_MERCHANT_ID_DEFAULT = 'merchant_1786008898151_5791w97s6';
const CHARIS_EMAIL = 'info@charismfb.com';

async function main(): Promise<void> {
  const baseUrl = (process.env.WALLET_MS_URL || 'http://localhost:3004').replace(/\/+$/, '');
  const token = process.env.INTERNAL_TOKEN || process.env.JWT_SECRET || '';
  const merchantId = (process.env.CHARIS_MERCHANT_ID || CHARIS_MERCHANT_ID_DEFAULT).trim();
  const authToken = (process.env.BANKONE_AUTH_TOKEN || '').trim();
  const institutionCode = (process.env.BANKONE_INSTITUTION_CODE || '').trim();
  const productCode = (process.env.BANKONE_PRODUCT_CODE || '101').trim();
  const accountOfficerCode = (process.env.BANKONE_ACCOUNT_OFFICER_CODE || '3004').trim();
  const coreBaseUrl = (
    process.env.BANKONE_CORE_BASE_URL || 'https://staging.mybankone.com/BankOneWebAPI'
  ).replace(/\/+$/, '');

  if (!token) {
    throw new Error('INTERNAL_TOKEN (or JWT_SECRET) is required');
  }
  if (!authToken) {
    throw new Error('BANKONE_AUTH_TOKEN is required (use a renewed staging token)');
  }
  if (!institutionCode) {
    throw new Error('BANKONE_INSTITUTION_CODE is required');
  }

  const url = `${baseUrl}/internal/api/v1/banking-config/${encodeURIComponent(merchantId)}`;
  const body = {
    provider: 'bankone',
    enabled: true,
    fallbackToPayonus: true,
    bankone: {
      coreBaseUrl,
      channelsBaseUrl:
        process.env.BANKONE_CHANNELS_BASE_URL ||
        'https://staging.mybankone.com/thirdpartyapiservice/apiservice',
      authToken,
      institutionCode,
      productCode,
      accountOfficerCode,
      apiVersion: process.env.BANKONE_API_VERSION || '2',
      bankName: process.env.BANKONE_BANK_NAME || 'Charis Microfinance Bank',
      bankCode: process.env.BANKONE_BANK_CODE || undefined,
      defaultAccountTier: '1',
      defaultGender: '1',
      defaultPlaceOfBirth: 'Nigeria',
      defaultAddress: 'Nigeria'
    }
  };

  console.log(`Seeding BankOne config for Charis (${CHARIS_EMAIL}) merchantId=${merchantId}`);
  const response = await axios.put(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': token
    },
    validateStatus: () => true,
    timeout: 30_000
  });

  console.log(`HTTP ${response.status}`);
  console.log(JSON.stringify(response.data, null, 2));
  if (response.status >= 400 || !response.data?.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
