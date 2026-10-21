"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.maskSecret = maskSecret;
const crypto_1 = __importDefault(require("crypto"));
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
function resolveEncryptionKey() {
    const raw = process.env.BANKING_CONFIG_ENCRYPTION_KEY?.trim() ||
        process.env.JWT_SECRET?.trim() ||
        'wallet-banking-config-dev-key';
    return crypto_1.default.createHash('sha256').update(raw, 'utf8').digest();
}
/** Encrypt a secret for at-rest storage. Returns `enc:v1:<ivHex>:<tagHex>:<cipherHex>`. */
function encryptSecret(plaintext) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGO, resolveEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}
/** Decrypt a value produced by `encryptSecret`. Plaintext (legacy) values are returned as-is. */
function decryptSecret(stored) {
    const value = (stored || '').trim();
    if (!value.startsWith('enc:v1:')) {
        return value;
    }
    const parts = value.split(':');
    if (parts.length !== 5) {
        throw new Error('Invalid encrypted secret format');
    }
    const iv = Buffer.from(parts[2], 'hex');
    const tag = Buffer.from(parts[3], 'hex');
    const data = Buffer.from(parts[4], 'hex');
    if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted secret parameters');
    }
    const decipher = crypto_1.default.createDecipheriv(ALGO, resolveEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
function maskSecret(value) {
    if (!value)
        return undefined;
    const plain = value.startsWith('enc:v1:') ? '********' : value;
    if (plain.length <= 8)
        return '********';
    return `${plain.slice(0, 4)}…${plain.slice(-4)}`;
}
//# sourceMappingURL=bankingConfigCrypto.js.map