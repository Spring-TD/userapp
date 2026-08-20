import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../config/environment', () => ({
  config: {
    clientAuthServiceUrl: 'https://client-auth.example',
    internalServiceToken: 'internal-token'
  }
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

import axios from 'axios';
import { fetchAppCustomerStats } from '../services/clientAuthCustomerClient';

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe('fetchAppCustomerStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({
      status: 200,
      data: {
        success: true,
        data: { registered: 3, active: 2, registeredDeltaThisMonth: 1 }
      }
    } as never);
  });

  it('does not throw when appId is a Mongo ObjectId-like value', async () => {
    const objectIdLike = { toString: () => '69f330b2a795ac77103a6d77' };
    const stats = await fetchAppCustomerStats(objectIdLike as unknown as string);

    expect(stats).toEqual({ registered: 3, active: 2, registeredDeltaThisMonth: 1 });
    expect(mockedGet).toHaveBeenCalledWith(
      'https://client-auth.example/api/v1/user/internal/apps/69f330b2a795ac77103a6d77/customer-count',
      expect.any(Object)
    );
  });

  it('returns zeros for empty appId instead of throwing', async () => {
    await expect(fetchAppCustomerStats(undefined as unknown as string)).resolves.toEqual({
      registered: 0,
      active: 0,
      registeredDeltaThisMonth: 0
    });
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
