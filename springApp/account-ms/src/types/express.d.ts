declare global {
  namespace Express {
    interface Request {
      /** Set by plataIntegratorGatewayAuth after Plata service-auth-ms verification */
      gatewayMerchantAuth?: {
        merchantId: string;
        merchantName: string;
        apiKeyId: string;
        environment: string;
      };
    }
  }
}

export {};
