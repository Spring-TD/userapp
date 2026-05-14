// src/middleware/audit.ts
import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../utils/audit';

// Middleware to log audit trails for requests
export const auditLog = (req: Request, res: Response, next: NextFunction) => {
  // Log the request
  auditLogger(
    `${req.method} ${req.path}`,
    (req as any).user?.userId || 'anonymous',
    {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.body
    },
    req
  );
  
  next();
};

// Export the middleware as default as well
export default auditLog;