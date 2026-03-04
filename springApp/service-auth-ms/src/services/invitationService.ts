import { v4 as uuidv4 } from 'uuid';
import { CreateInvitationRequest, Invitation } from '../models/Invitation';
import { db } from '../db/database';
import { emailService } from './emailService';

import { User, UserType, AccountStatus } from '../models/User';
import { hashPassword } from '../utils/crypto';

export class InvitationService {

    /**
     * Create a new invitation
     */
    async createInvitation(merchantId: string, request: CreateInvitationRequest): Promise<Invitation> {
        // Validate role exists and belongs to merchant (or is a system role if we had any)
        const role = await db.findRoleById(request.roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        // Ensure merchant owns the role
        if (role.merchant_id !== merchantId) {
            throw new Error('Unauthorized to assign this role');
        }

        // Check if user already exists
        const existingUser = await db.findUserByEmail(request.email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const token = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

        const invitation: Invitation = {
            id: uuidv4(),
            email: request.email,
            roleId: request.roleId,
            merchantId: merchantId,
            token,
            status: 'pending',
            expiresAt,
            createdAt: now,
            updatedAt: now
        };

        await db.createInvitation(invitation);

        // Get merchant details for email
        const merchant = await db.findUserById(merchantId);
        const merchantName = merchant ? `${merchant.first_name} ${merchant.last_name}` : 'Merchant';
        const invitationUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/accept-invitation?token=${token}`;

        // Send email
        await emailService.sendInvitationEmail(
            invitation.email,
            invitationUrl,
            merchantName,
            role.name
        );

        return invitation;
    }

    /**
     * Get invitations for a merchant
     */
    async getInvitations(merchantId: string): Promise<Invitation[]> {
        return db.findInvitationsByMerchantId(merchantId);
    }

    /**
     * Accept invitation and register user
     */
    async acceptInvitation(token: string, userData: {
        firstName: string;
        lastName: string;
        password: string;
        phone?: string;
    }): Promise<User> {

        const invitation = await db.findInvitationByToken(token);

        if (!invitation) {
            throw new Error('Invalid invitation token');
        }

        if (invitation.status !== 'pending') {
            throw new Error(`Invitation is ${invitation.status}`);
        }

        if (new Date() > invitation.expiresAt) {
            await db.updateInvitation(invitation.id, { status: 'expired' });
            throw new Error('Invitation expired');
        }

        // Create the user
        const hashedPassword = await hashPassword(userData.password);

        const newUser: Omit<User, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'> = {
            email: invitation.email,
            password: hashedPassword,
            first_name: userData.firstName,
            last_name: userData.lastName,
            ...(userData.phone && { phone: userData.phone }),
            user_type: UserType.USER,
            status: AccountStatus.ACTIVE, // active immediately as they verified via invitation
            email_verified: true,
            phone_verified: false,
            user_merchant_id: invitation.merchantId,
            country: 'US', // Default or need to ask in form
            role_id: invitation.roleId
        };

        const createdUser = await db.createUser(newUser) as User;

        // Update invitation status
        await db.updateInvitation(invitation.id, { status: 'accepted' });

        return createdUser;
    }

    /**
     * Validate invitation token (for frontend to show details)
     */
    async validateInvitationToken(token: string): Promise<{ email: string, roleName: string, merchantName: string } | null> {
        const invitation = await db.findInvitationByToken(token);
        if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
            return null;
        }

        const role = await db.findRoleById(invitation.roleId);
        const merchant = await db.findUserById(invitation.merchantId);

        return {
            email: invitation.email,
            roleName: role ? role.name : 'Unknown Role',
            merchantName: merchant ? `${merchant.first_name} ${merchant.last_name}` : 'Merchant'
        };
    }
}

export const invitationService = new InvitationService();
