"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccountQuick = createAccountQuick;
exports.getAccountByAccountNumber = getAccountByAccountNumber;
exports.getBalance = getBalance;
exports.getTransactions = getTransactions;
const axios_1 = __importDefault(require("axios"));
const bankone_1 = require("../../config/bankone");
const logger_1 = require("../../utils/logger");
function joinUrl(base, path) {
    const b = base.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${b}${p}`;
}
function asRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    return value;
}
function firstString(obj, keys) {
    if (!obj)
        return undefined;
    for (const key of keys) {
        const v = obj[key];
        if (typeof v === 'string' && v.trim())
            return v.trim();
        if (typeof v === 'number' && Number.isFinite(v))
            return String(v);
    }
    return undefined;
}
function isSuccessful(payload) {
    if (!payload)
        return false;
    const flag = payload.IsSuccessful ?? payload.isSuccessful ?? payload.Success ?? payload.success;
    if (typeof flag === 'boolean')
        return flag;
    if (typeof flag === 'string')
        return ['true', '1', 'yes'].includes(flag.toLowerCase());
    return false;
}
function errorMessage(payload, fallback) {
    return (firstString(payload, ['Message', 'message', 'ResponseDescription', 'responseDescription', 'error']) ||
        fallback);
}
function splitName(profile) {
    if (profile.lastName?.trim()) {
        return {
            lastName: profile.lastName.trim(),
            otherNames: (profile.otherNames || profile.firstName || 'Customer').trim()
        };
    }
    const full = (profile.fullName || '').trim();
    if (!full) {
        return { lastName: 'Customer', otherNames: 'Applicant' };
    }
    const parts = full.split(/\s+/);
    if (parts.length === 1) {
        return { lastName: parts[0], otherNames: parts[0] };
    }
    return { lastName: parts[parts.length - 1], otherNames: parts.slice(0, -1).join(' ') };
}
function normalizeGender(value, fallback) {
    const raw = (value || fallback || '1').trim().toLowerCase();
    if (raw === 'm' || raw === 'male' || raw === '1')
        return '1';
    if (raw === 'f' || raw === 'female' || raw === '2')
        return '2';
    return raw || '1';
}
function normalizePhone(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length >= 10)
        return digits.slice(-11);
    return digits || '08000000000';
}
async function createAccountQuick(settings, profile, trackingRef) {
    const version = settings.apiVersion || '2';
    const url = joinUrl(settings.coreBaseUrl, `/api/Account/CreateAccountQuick/${version}?authToken=${encodeURIComponent(settings.authToken)}`);
    const { lastName, otherNames } = splitName(profile);
    const body = {
        TransactionTrackingRef: trackingRef,
        AccountOpeningTrackingRef: trackingRef,
        ProductCode: settings.productCode,
        CustomerID: '',
        LastName: lastName,
        OtherNames: otherNames,
        BVN: (profile.bvn || '').replace(/\D/g, ''),
        PhoneNo: normalizePhone(profile.phone),
        Gender: normalizeGender(profile.gender, settings.defaultGender),
        PlaceOfBirth: (profile.placeOfBirth || settings.defaultPlaceOfBirth || 'Nigeria').trim(),
        DateOfBirth: (profile.dateOfBirth || '1990-01-01').trim(),
        Address: (profile.address || settings.defaultAddress || 'Nigeria').trim(),
        AccountOfficerCode: settings.accountOfficerCode,
        Email: (profile.email || `${trackingRef}@wallet.local`).trim(),
        NotificationPreference: 0,
        TransactionPermission: '0',
        AccountTier: (profile.accountTier || settings.defaultAccountTier || '1').trim()
    };
    try {
        const response = await axios_1.default.post(url, body, {
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            timeout: bankone_1.bankoneConfig.httpTimeoutMs,
            validateStatus: () => true
        });
        const raw = asRecord(response.data) || {};
        if (!isSuccessful(raw)) {
            return { ok: false, errorMessage: errorMessage(raw, `BankOne create failed (HTTP ${response.status})`), raw };
        }
        // Staging/live CreateAccountQuick often returns account fields on Message (object),
        // not ResponseObject. Prefer nested payloads, then fall back to the root.
        const nested = asRecord(raw.Message) ||
            asRecord(raw.message) ||
            asRecord(raw.ResponseObject) ||
            asRecord(raw.responseObject) ||
            asRecord(raw.Data) ||
            asRecord(raw.data) ||
            raw;
        const accountNumber = firstString(nested, [
            'AccountNumber',
            'accountNumber',
            'BankoneAccountNumber',
            'bankoneAccountNumber',
            'NUBAN',
            'nuban',
            'Number',
            'number'
        ]);
        if (!accountNumber) {
            return { ok: false, errorMessage: 'BankOne create succeeded but returned no account number', raw };
        }
        return {
            ok: true,
            data: {
                accountNumber,
                customerId: firstString(nested, ['CustomerID', 'CustomerId', 'customerId']),
                accountName: firstString(nested, [
                    'FullName',
                    'fullName',
                    'Name',
                    'AccountName',
                    'accountName'
                ]),
                providerReference: firstString(nested, ['TransactionTrackingRef', 'AccountOpeningTrackingRef', 'Reference', 'Id']) ||
                    trackingRef
            },
            raw
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'BankOne createAccountQuick failed';
        logger_1.logger.warn('BankOne createAccountQuick error', { message });
        return { ok: false, errorMessage: message };
    }
}
async function getAccountByAccountNumber(settings, accountNumber) {
    const version = settings.apiVersion || '2';
    const url = joinUrl(settings.coreBaseUrl, `/api/Account/GetAccountByAccountNumber/${version}?accountNumber=${encodeURIComponent(accountNumber)}&authToken=${encodeURIComponent(settings.authToken)}`);
    try {
        const response = await axios_1.default.get(url, {
            headers: { Accept: 'application/json' },
            timeout: bankone_1.bankoneConfig.httpTimeoutMs,
            validateStatus: () => true
        });
        const raw = asRecord(response.data) || {};
        if (!isSuccessful(raw)) {
            return { ok: false, errorMessage: errorMessage(raw, 'BankOne account lookup failed'), raw };
        }
        const nested = asRecord(raw.ResponseObject) ||
            asRecord(raw.responseObject) ||
            asRecord(raw.Data) ||
            asRecord(raw.data) ||
            raw;
        const number = firstString(nested, ['AccountNumber', 'accountNumber', 'Number']) || accountNumber;
        return {
            ok: true,
            data: {
                accountNumber: number,
                customerId: firstString(nested, ['CustomerID', 'CustomerId', 'customerId']),
                accountName: firstString(nested, ['Name', 'AccountName', 'accountName'])
            },
            raw
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'BankOne getAccount failed';
        return { ok: false, errorMessage: message };
    }
}
async function getBalance(settings, accountNumber) {
    const version = settings.apiVersion || '2';
    const url = joinUrl(settings.coreBaseUrl, `/api/Account/GetAccountBalance/${version}?accountNumber=${encodeURIComponent(accountNumber)}&authToken=${encodeURIComponent(settings.authToken)}&computewithdrawableBalance=false`);
    try {
        const response = await axios_1.default.get(url, {
            headers: { Accept: 'application/json' },
            timeout: bankone_1.bankoneConfig.httpTimeoutMs,
            validateStatus: () => true
        });
        const raw = asRecord(response.data) || {};
        if (!isSuccessful(raw) && response.status >= 400) {
            return { ok: false, errorMessage: errorMessage(raw, 'BankOne balance enquiry failed'), raw };
        }
        const nested = asRecord(raw.ResponseObject) ||
            asRecord(raw.responseObject) ||
            asRecord(raw.Data) ||
            asRecord(raw.data) ||
            raw;
        const available = Number(firstString(nested, ['AvailableBalance', 'availableBalance', 'WithdrawableBalance']) || NaN);
        const ledger = Number(firstString(nested, ['LedgerBalance', 'ledgerBalance', 'Balance']) || NaN);
        return {
            ok: true,
            data: {
                availableBalance: Number.isFinite(available) ? available : undefined,
                ledgerBalance: Number.isFinite(ledger) ? ledger : undefined,
                raw
            },
            raw
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'BankOne getBalance failed';
        return { ok: false, errorMessage: message };
    }
}
function formatBankOneDate(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}
function parseTransactions(payload) {
    const nested = asRecord(payload.ResponseObject) ||
        asRecord(payload.responseObject) ||
        asRecord(payload.Data) ||
        asRecord(payload.data);
    const listCandidate = (Array.isArray(payload.Transactions) && payload.Transactions) ||
        (Array.isArray(payload.transactions) && payload.transactions) ||
        (nested && Array.isArray(nested.Transactions) && nested.Transactions) ||
        (nested && Array.isArray(nested.transactions) && nested.transactions) ||
        (Array.isArray(payload) && payload) ||
        [];
    const results = [];
    for (const item of listCandidate) {
        const row = asRecord(item);
        if (!row)
            continue;
        const amountRaw = Number(firstString(row, ['Amount', 'amount', 'TransactionAmount', 'transactionAmount']) || 0);
        const instrument = firstString(row, ['InstrumentType', 'instrumentType', 'RecordType', 'recordType', 'Type', 'type']) ||
            '';
        const debitCredit = firstString(row, ['DebitCredit', 'debitCredit', 'DrCr', 'drCr', 'TransactionType']) || '';
        const isCredit = /credit|cr/i.test(debitCredit) ||
            /credit/i.test(instrument) ||
            amountRaw > 0 && !/debit|dr/i.test(debitCredit);
        const amount = Math.abs(amountRaw);
        if (!amount)
            continue;
        const transactionReference = firstString(row, [
            'TransactionReference',
            'transactionReference',
            'ReferenceNumber',
            'referenceNumber',
            'RefNo',
            'refNo',
            'Id',
            'id',
            'CurrentUniqueIdentifier'
        ]) || `${accountFallbackRef(row)}-${amount}`;
        results.push({
            transactionReference,
            amount,
            narration: firstString(row, ['Narration', 'narration', 'Remarks', 'remarks', 'Description']),
            transactionDate: firstString(row, ['TransactionDate', 'transactionDate', 'Date', 'date']),
            isCredit,
            raw: row
        });
    }
    return results;
}
function accountFallbackRef(row) {
    return (firstString(row, ['InstrumentNo', 'instrumentNo', 'Stan', 'stan']) ||
        String(Date.now()));
}
async function getTransactions(settings, accountNumber, fromDate, toDate, numberOfItems = 50) {
    const url = joinUrl(settings.coreBaseUrl, `/api/Account/GetTransactions?accountNumber=${encodeURIComponent(accountNumber)}` +
        `&fromDate=${encodeURIComponent(formatBankOneDate(fromDate))}` +
        `&toDate=${encodeURIComponent(formatBankOneDate(toDate))}` +
        `&institutionCode=${encodeURIComponent(settings.institutionCode)}` +
        `&numberOfItems=${encodeURIComponent(String(numberOfItems))}` +
        `&authToken=${encodeURIComponent(settings.authToken)}`);
    try {
        const response = await axios_1.default.get(url, {
            headers: { Accept: 'application/json' },
            timeout: bankone_1.bankoneConfig.httpTimeoutMs,
            validateStatus: () => true
        });
        const raw = asRecord(response.data) || {};
        if (!isSuccessful(raw) && response.status >= 400) {
            return { ok: false, errorMessage: errorMessage(raw, 'BankOne getTransactions failed'), raw };
        }
        return { ok: true, data: parseTransactions(raw), raw };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'BankOne getTransactions failed';
        return { ok: false, errorMessage: message };
    }
}
//# sourceMappingURL=bankoneClient.js.map