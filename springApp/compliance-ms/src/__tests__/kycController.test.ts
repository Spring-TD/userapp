import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { UserType } from '../types/kycTypes';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

function makeToken(userId: string, userType: UserType): string {
  return jwt.sign({ userId, userType, email: `${userId}@example.com` }, JWT_SECRET, { expiresIn: '1h' });
}

describe('KYC Controller Integration (current routes/auth)', () => {
  it('returns service metadata on root endpoint', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.service).toBe('Compliance Microservice');
  });

  it('returns health payload', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.service).toBe('compliance-ms');
    expect(response.body.status).toBe('healthy');
  });

  it('rejects protected route without token', async () => {
    const response = await request(app).post('/api/v1/kyc/submit').send({});
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects protected route with invalid token', async () => {
    const response = await request(app)
      .post('/api/v1/kyc/submit')
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .send({});
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns validation error for invalid KYC payload with valid token', async () => {
    const token = makeToken('user_001', UserType.INDIVIDUAL);
    const response = await request(app)
      .post('/api/v1/kyc/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        userId: 'user_001',
        userType: UserType.INDIVIDUAL,
        documents: [
          {
            type: 'invalid_type',
            fileName: 'id_document.jpg',
            fileType: 'image/jpeg',
            fileSize: 2000000,
            fileUrl: 'https://example.com/documents/id_document.jpg'
          }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});
