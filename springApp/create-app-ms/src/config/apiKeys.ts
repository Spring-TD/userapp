export const DEFAULT_SPECIAL_API_KEY = 'default-special-key';
export const DEFAULT_PUBLIC_KEY = 'default-public-key';

export function isInsecureDefaultApiKeyPair(specialKey: string, publicKey: string): boolean {
  return specialKey === DEFAULT_SPECIAL_API_KEY && publicKey === DEFAULT_PUBLIC_KEY;
}
