import {
  decryptSecret,
  encryptSecret,
  maskSecret
} from '../utils/bankingConfigCrypto';

describe('bankingConfigCrypto', () => {
  it('round-trips secrets', () => {
    const plain = '7dc3a810-a230-4477-8be7-6c96c5585873';
    const enc = encryptSecret(plain);
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it('passes through legacy plaintext', () => {
    expect(decryptSecret('plain-token')).toBe('plain-token');
  });

  it('masks secrets', () => {
    expect(maskSecret('abcdefghijklmnop')).toMatch(/^abcd…mnop$/);
    expect(maskSecret('enc:v1:aa:bb:cc')).toBe('********');
  });
});
