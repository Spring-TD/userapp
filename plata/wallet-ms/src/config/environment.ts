export interface Config {
  port: number;
  nodeEnv: string;
  authServiceUrl: string;
  complianceServiceUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
  complianceServiceUrl: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3003',
  jwtSecret: process.env.JWT_SECRET || 'wallet-service-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h'
};