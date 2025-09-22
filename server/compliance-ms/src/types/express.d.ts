// src/types/express.d.ts
import { UserType } from './kycTypes';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: UserType;
        email?: string;
      };
    }
  }
}

export {};