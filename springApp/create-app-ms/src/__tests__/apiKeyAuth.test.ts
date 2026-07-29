import { apiKeyAuth } from '../middleware/apiKeyAuth';

jest.mock('../config/environment', () => ({
  config: {
    nodeEnv: 'production',
    specialApiKey: 'default-special-key',
    publicKey: 'default-public-key'
  }
}));

function runMiddleware(headers: Record<string, string>) {
  const req = { headers } as Parameters<typeof apiKeyAuth>[0];
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as unknown as Parameters<typeof apiKeyAuth>[1];
  const next = jest.fn();
  apiKeyAuth(req, res, next);
  return { res, next };
}

describe('apiKeyAuth', () => {
  it('rejects default API keys in production', () => {
    const { res, next } = runMiddleware({
      'x-special-key': 'default-special-key',
      'x-public-key': 'default-public-key'
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Default API keys are not allowed in production'
    });
  });

  it('rejects missing API keys', () => {
    const { res, next } = runMiddleware({});

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
