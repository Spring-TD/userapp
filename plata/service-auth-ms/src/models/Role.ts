
export enum Permission {
    CREATE_ADMIN = 'create_admin',
    GENERATE_SECRET_KEYS = 'generate_secret_keys',
    SEE_SECRET_KEYS = 'see_secret_keys',
    EDIT_PRODUCTS = 'edit_products',
    CREATE_PRODUCTS = 'create_products',
    VIEW_PRODUCTS = 'view_products',
    CHANGE_PASSWORD = 'change_password',
    SEE_BILLING = 'see_billing',
    ADD_PAYMENT_METHOD = 'add_payment_method',
    EDIT_PAYMENT_METHOD = 'edit_payment_method',
    CREATE_APP = 'create_app',
    SEE_ACTIVITY_LOG = 'see_activity_log',
    DOWNLOAD_REPORT = 'download_report'
}

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    merchant_id: string; // The merchant who created/owns this role
    created_at: Date;
    updated_at: Date;
}

export interface CreateRoleRequest {
    name: string;
    description: string;
    permissions: Permission[];
}
