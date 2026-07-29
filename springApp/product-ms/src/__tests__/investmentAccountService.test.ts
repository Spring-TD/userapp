import investmentAccountService from '../services/investmentAccountService';

describe('investmentAccountService', () => {
  it('exports createInvestmentAccount', () => {
    expect(typeof investmentAccountService.createInvestmentAccount).toBe('function');
  });
});
