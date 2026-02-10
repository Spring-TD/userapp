import axios from 'axios';

export interface AccountCreationResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface UserRegistrationData {
  name: string;
  email: string;
  password?: string;
}

export class AccountServiceClient {
  private accountServiceUrl: string;

  constructor() {
    this.accountServiceUrl = process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3010'; // Default to airsign account-ms port
  }

  /**
   * Creates a new user account in the account service
   */
  async createUserAccount(userData: UserRegistrationData): Promise<AccountCreationResponse> {
    try {
      // Generate a temporary password if none is provided
      const password = userData.password || this.generateTempPassword();
      
      // Make a request to the account service to register the user
      const response = await axios.post(
        `${this.accountServiceUrl}/api/v1/auth/register`,
        {
          name: userData.name || userData.email.split('@')[0], // Use email prefix as name if not provided
          email: userData.email,
          password: password
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Account created successfully',
          token: response.data.token,
          user: {
            id: response.data.user.id,
            email: response.data.user.email,
            name: response.data.user.name
          }
        };
      } else {
        return {
          success: false,
          message: response.data.error || 'Failed to create account'
        };
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        return {
          success: false,
          message: error.response.data.error || 'Bad request - invalid data provided'
        };
      } else if (error.response?.status === 409) {
        // User already exists
        return {
          success: true,
          message: 'User already exists, proceeding with existing account',
          user: {
            id: error.response.data.user?.id,
            email: userData.email,
            name: error.response.data.user?.name || userData.email.split('@')[0]
          }
        };
      } else {
        return {
          success: false,
          message: error.message || 'Network error occurred while creating account'
        };
      }
    }
  }

  /**
   * Generates a temporary password for account creation
   */
  private generateTempPassword(): string {
    // Generate a random temporary password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}