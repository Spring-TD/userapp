import { bankAccountNameMatchesKyc, bankAccountNamesCloselyMatch, nameTokens, normalizePersonName } from '../utils/bankAccountNameMatch';

describe('bankAccountNameMatch', () => {
  it('normalizes casing and punctuation', () => {
    expect(normalizePersonName('  jane-o’connor  ')).toBe('JANE-O CONNOR');
  });

  it('matches reordered bank account names', () => {
    expect(bankAccountNameMatchesKyc('SMITH JANE ADE', 'Jane Smith')).toBe(true);
  });

  it('matches when bank name includes extra middle names', () => {
    expect(bankAccountNameMatchesKyc('ADEOLA JANE SMITH', 'Jane Smith')).toBe(true);
  });

  it('rejects clearly different names', () => {
    expect(bankAccountNameMatchesKyc('JOHN DOE', 'Jane Smith')).toBe(false);
  });

  it('drops honorific tokens before comparing', () => {
    expect(nameTokens('MR JOHN DOE')).toEqual(['JOHN', 'DOE']);
    expect(bankAccountNameMatchesKyc('DOE JOHN CHUKWU', 'Mr John Doe')).toBe(true);
  });

  it('closely matches submitted and PayOnUs account holder names', () => {
    expect(bankAccountNamesCloselyMatch('Jane Smith', 'SMITH JANE ADE')).toBe(true);
    expect(bankAccountNamesCloselyMatch('John Doe', 'Jane Smith')).toBe(false);
  });
});
