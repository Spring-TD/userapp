import {
  isBlockingLendingApplicationStatus,
  lendingApplicationBlockMessage
} from '../utils/lendingApplicationGuard';

describe('lendingApplicationGuard', () => {
  it('treats pending, approved, and blacklisted as blocking', () => {
    expect(isBlockingLendingApplicationStatus('PENDING')).toBe(true);
    expect(isBlockingLendingApplicationStatus('APPROVED')).toBe(true);
    expect(isBlockingLendingApplicationStatus('BLACKLISTED')).toBe(true);
  });

  it('allows rejected applications to re-apply', () => {
    expect(isBlockingLendingApplicationStatus('REJECTED')).toBe(false);
  });

  it('returns user-facing block messages by status', () => {
    expect(lendingApplicationBlockMessage('PENDING')).toContain('pending application');
    expect(lendingApplicationBlockMessage('APPROVED')).toContain('approved application');
    expect(lendingApplicationBlockMessage('BLACKLISTED')).toContain('not eligible');
  });
});
