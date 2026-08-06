import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../config/environment', () => ({
  config: {
    plataProductServicePublicUrl: 'https://product-ms-plata.example',
    plataProductInternalToken: 'internal-token',
    jwtSecret: 'fallback-token',
    walletServiceHttpTimeoutMs: 15000
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
import { proxyRespondToLoanOffer } from '../services/pendingApprovedLoanClient';
import { proxyRespondToMortgageOffer } from '../services/pendingApprovedMortgageClient';

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe('pending-approved Plata proxy errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves an actionable loan disbursement status and message', async () => {
    mockedPost.mockResolvedValue({
      status: 402,
      data: {
        success: false,
        error: 'Insufficient funds in Treasury wallet'
      }
    } as never);

    await expect(
      proxyRespondToLoanOffer('local-application-id', {
        action: 'accept',
        acceptedTerms: true,
        springUserId: 'user-1'
      })
    ).rejects.toMatchObject({
      statusCode: 402,
      message: 'Insufficient funds in Treasury wallet'
    });
  });

  it('preserves an actionable mortgage offer status and message', async () => {
    mockedPost.mockResolvedValue({
      status: 409,
      data: {
        success: false,
        error: 'Invalid mortgage offer step'
      }
    } as never);

    await expect(
      proxyRespondToMortgageOffer('local-application-id', {
        action: 'accept',
        acceptedTerms: true,
        springUserId: 'user-1'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Invalid mortgage offer step'
    });
  });
});
