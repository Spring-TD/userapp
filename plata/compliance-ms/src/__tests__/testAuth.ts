import jwt from 'jsonwebtoken';
import { UserType } from '../types/kycTypes';

const secret = process.env.JWT_SECRET || 'test-secret';

/** Valid Bearer token for compliance-ms `authenticate` middleware. */
export function testBearer(userId: string, userType: UserType): string {
  return `Bearer ${jwt.sign({ userId, userType }, secret)}`;
}
