/// <reference types="jest" />
import 'jest';
import request from 'supertest';
import app from './index';

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      service: 'service-auth-microservice'
    });
  });
});