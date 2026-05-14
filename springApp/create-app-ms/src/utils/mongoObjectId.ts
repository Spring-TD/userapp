import { ApiError } from '../middleware/errorHandler';

/** Loose Mongoose ObjectId hex shape (24 hex chars). */
export function isLikelyMongoObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id.trim());
}

export function assertLikelyMongoObjectId(id: string, label: string): void {
  if (!isLikelyMongoObjectId(id)) {
    throw new ApiError(
      400,
      `${label} must be a 24-character hex MongoDB id. In Postman, define variables such as appId and productId and use {{appId}}/{{productId}} in the path — do not wrap the raw id inside braces alone (e.g. {{paste-id}} is treated as a variable name).`
    );
  }
}
