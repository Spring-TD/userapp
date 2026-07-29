function stripSurroundingQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

export function normalizeWalletServiceBase(raw: string): string {
  let s = raw.trim().replace(/\/+$/g, '');
  const suffixes = ['/api/v1/internal/wallets', '/api/v1/wallets', '/api/v1/internal', '/api/v1', '/api'];
  for (;;) {
    let changed = false;
    for (const suf of suffixes) {
      if (s.length >= suf.length && s.slice(-suf.length).toLowerCase() === suf.toLowerCase()) {
        s = s.slice(0, -suf.length).replace(/\/+$/g, '');
        changed = true;
      }
    }
    if (!changed) break;
  }
  return s;
}

export function walletServiceUrl(): string {
  return normalizeWalletServiceBase(
    process.env.WALLET_SERVICE_URL || process.env.WALLET_MS_URL || 'http://localhost:4004'
  );
}

/** Shared JWT_SECRET used as X-Internal-Token for wallet-ms internal routes. */
export function walletMsInternalToken(): string {
  return stripSurroundingQuotes(process.env.JWT_SECRET || '');
}

export function isWalletMsInternalConfigured(): boolean {
  return Boolean(walletServiceUrl() && walletMsInternalToken());
}

export function walletMsInternalHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': walletMsInternalToken()
  };
}

export function walletMsRequestTimeoutMs(defaultMs = 30000): number {
  return Math.max(10000, parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || String(defaultMs), 10));
}
