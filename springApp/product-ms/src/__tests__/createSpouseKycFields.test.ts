import { applyPlatformFieldsToApplication } from '../utils/platformApplicationFieldInput';

describe('createSpouseKyc field prep', () => {
  it('sets repayingWithSpouse and spouse contact fields on the application', () => {
    const application = {
      repayingWithSpouse: undefined as boolean | undefined,
      spouseFullName: undefined as string | undefined,
      spouseEmail: undefined as string | undefined,
      spousePhone: undefined as string | undefined,
      spouseOccupation: undefined as string | undefined,
      spouseCountry: undefined as string | undefined
    };

    applyPlatformFieldsToApplication(application as never, {
      repayingWithSpouse: true,
      spouseFullName: 'Ada Spouse',
      spouseEmail: 'ada.spouse@example.com',
      spousePhone: '08012345678',
      spouseOccupation: 'Engineer',
      spouseCountry: 'NG'
    });

    expect(application.repayingWithSpouse).toBe(true);
    expect(application.spouseFullName).toBe('Ada Spouse');
    expect(application.spouseEmail).toBe('ada.spouse@example.com');
    expect(application.spousePhone).toBe('08012345678');
    expect(application.spouseOccupation).toBe('Engineer');
    expect(application.spouseCountry).toBe('NG');
  });
});
