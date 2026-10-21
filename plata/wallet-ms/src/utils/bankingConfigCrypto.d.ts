/** Encrypt a secret for at-rest storage. Returns `enc:v1:<ivHex>:<tagHex>:<cipherHex>`. */
export declare function encryptSecret(plaintext: string): string;
/** Decrypt a value produced by `encryptSecret`. Plaintext (legacy) values are returned as-is. */
export declare function decryptSecret(stored: string): string;
export declare function maskSecret(value?: string | null): string | undefined;
//# sourceMappingURL=bankingConfigCrypto.d.ts.map