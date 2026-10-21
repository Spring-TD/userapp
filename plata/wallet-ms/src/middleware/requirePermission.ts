import { Request, Response, NextFunction } from 'express';
import { actorHasAnyPermission } from '../rbac/permissions';

export function requirePermission(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (actorHasAnyPermission(req.user.permissions, req.user.isOwner, required)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      required
    });
  };
}
