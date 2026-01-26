
export interface Invitation {
    id: string;
    email: string;
    roleId: string;
    merchantId: string;
    token: string;
    status: 'pending' | 'accepted' | 'expired';
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateInvitationRequest {
    email: string;
    roleId: string;
}

export interface AcceptInvitationRequest {
    token: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
}
