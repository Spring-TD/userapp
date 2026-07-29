import applicantProfileService from '../services/applicantProfileService';

describe('buildApplicantProfileForUpstreamSync', () => {
  it('is exported on applicantProfileService', () => {
    expect(typeof applicantProfileService.buildApplicantProfileForUpstreamSync).toBe('function');
  });
});
