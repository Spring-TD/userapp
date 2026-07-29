import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

function requireMerchantOrAdmin(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return false;
  }
  if (req.user.userType !== 'merchant' && req.user.userType !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Only merchants and admins can manage Teams'
    });
    return false;
  }
  return true;
}

function merchantIdFrom(req: Request): string {
  return req.user!.userMerchantId || req.user!.userId;
}

/**
 * Teams: invited staff (role_id) under a merchant — list, change role, suspend/activate.
 */
export class TeamController {
  static async listMembers(req: Request, res: Response): Promise<void> {
    try {
      if (!requireMerchantOrAdmin(req, res)) return;

      const result = await AuthService.getTeamMembers(merchantIdFrom(req));
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: { members: result.members }
      });
    } catch (error) {
      console.error('Error listing team members:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      if (!requireMerchantOrAdmin(req, res)) return;

      const userId = req.params.userId;
      const roleId = typeof req.body?.roleId === 'string' ? req.body.roleId.trim() : '';
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }
      if (!roleId) {
        res.status(400).json({ success: false, error: 'roleId is required' });
        return;
      }

      const result = await AuthService.updateStaffUserRole(req.user!.userId, userId, roleId);
      if (!result.success) {
        const err = result.error || 'Request failed';
        if (err === 'User not found' || err === 'Role not found') {
          res.status(404).json({ success: false, error: err });
          return;
        }
        if (err.startsWith('Insufficient permissions')) {
          res.status(403).json({ success: false, error: err });
          return;
        }
        res.status(400).json({ success: false, error: err });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Team member role updated',
        data: { member: result.member }
      });
    } catch (error) {
      console.error('Error updating team member role:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async suspendMember(req: Request, res: Response): Promise<void> {
    try {
      if (!requireMerchantOrAdmin(req, res)) return;

      const userId = req.params.userId;
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      const result = await AuthService.suspendStaffUser(req.user!.userId, userId);
      if (!result.success) {
        const err = result.error || 'Request failed';
        if (err === 'User not found') {
          res.status(404).json({ success: false, error: err });
          return;
        }
        if (err.startsWith('Insufficient permissions')) {
          res.status(403).json({ success: false, error: err });
          return;
        }
        res.status(400).json({ success: false, error: err });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Team member suspended',
        data: { member: result.user }
      });
    } catch (error) {
      console.error('Error suspending team member:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async activateMember(req: Request, res: Response): Promise<void> {
    try {
      if (!requireMerchantOrAdmin(req, res)) return;

      const userId = req.params.userId;
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      const result = await AuthService.activateStaffUser(req.user!.userId, userId);
      if (!result.success) {
        const err = result.error || 'Request failed';
        if (err === 'User not found') {
          res.status(404).json({ success: false, error: err });
          return;
        }
        if (err.startsWith('Insufficient permissions')) {
          res.status(403).json({ success: false, error: err });
          return;
        }
        res.status(400).json({ success: false, error: err });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Team member activated',
        data: { member: result.user }
      });
    } catch (error) {
      console.error('Error activating team member:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
