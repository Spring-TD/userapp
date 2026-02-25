import { db } from './mongoDatabase';
import { hashPassword } from './crypto';
import { UserType, AccountStatus } from '../models/User';
import { UserModel } from '../models/UserModel';

export async function seedDatabase() {
    try {
        const userCount = await UserModel.countDocuments();

        if (userCount > 0) {
            console.log('ℹ️ Database already has data, skipping seeding.');
            return;
        }

        console.log('🌱 Seeding database...');

        const commonPassword = await hashPassword('Password123!');
        const merchantId = 'seeded-merchant-001';

        // 1. Create Admin
        await db.createUser({
            email: 'admin@example.com',
            password: commonPassword,
            first_name: 'System',
            last_name: 'Admin',
            phone: '+1234567890',
            user_type: UserType.ADMIN,
            status: AccountStatus.ACTIVE,
            email_verified: true,
            phone_verified: true,
            country: 'US',
            user_merchant_id: 'admin'
        });

        // 2. Create Merchant
        await db.createUser({
            email: 'merchant@example.com',
            password: commonPassword,
            first_name: 'Business',
            last_name: 'Owner',
            phone: '+1987654321',
            user_type: UserType.MERCHANT,
            status: AccountStatus.ACTIVE,
            email_verified: true,
            phone_verified: true,
            country: 'US',
            user_merchant_id: merchantId,
            callback_url: 'https://webhook.site/test',
            error_logs_url: 'https://webhook.site/logs'
        } as any);

        // 3. Create Merchant's User (password-based)
        await db.createUser({
            email: 'user@example.com',
            password: commonPassword,
            first_name: 'Staff',
            last_name: 'Member',
            phone: '+1555000111',
            user_type: UserType.USER,
            status: AccountStatus.ACTIVE,
            email_verified: true,
            phone_verified: true,
            country: 'US',
            user_merchant_id: merchantId
        } as any);

        // 4. Create User with user_ref (external ref, no login password)
        const placeholderPassword = await hashPassword(`__no_password_seeded-external-ref__`);
        await db.createUser({
            email: 'user-ref@example.com',
            password: placeholderPassword,
            first_name: 'External',
            last_name: 'Merchant User',
            phone: '+2348155500022',
            user_type: UserType.USER,
            status: AccountStatus.ACTIVE,
            email_verified: true,
            phone_verified: false,
            country: 'NG',
            user_merchant_id: merchantId,
            user_ref: 'seeded-external-ref'
        } as any);

        console.log('✅ Seeding complete!');
        console.log('   Admin: admin@example.com / Password123!');
        console.log('   Merchant: merchant@example.com / Password123!');
        console.log('   User (password): user@example.com / Password123!');
        console.log('   User (user_ref): user-ref@example.com / user_ref=seeded-external-ref');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    }
}
