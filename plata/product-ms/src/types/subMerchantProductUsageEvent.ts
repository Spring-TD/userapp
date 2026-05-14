export type SubMerchantUsageEventType = 'started_using_product';

export interface SubMerchantProductUsageEvent {
  id: string;
  plataMerchantId: string;
  apiKeyId?: string;
  gatewayEnvironment?: string;
  appId: string;
  productId: string;
  productNameSnapshot?: string;
  merchantId: string;
  merchantName: string;
  subMerchantId: string;
  subMerchantName: string;
  subMerchantEmail: string;
  subMerchantPhone: string;
  externalUserId: string;
  externalUserName: string;
  externalUserEmail: string;
  externalUserPhone: string;
  eventType: SubMerchantUsageEventType;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
