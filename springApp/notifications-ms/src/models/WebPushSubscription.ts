/** Browser PushSubscription JSON (Web Push API / RFC 8030). */
export interface WebPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface WebPushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: WebPushSubscriptionKeys;
}

export interface IWebPushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  expirationTime: number | null;
  keys: WebPushSubscriptionKeys;
  appId?: string;
  createdAt: Date;
  updatedAt: Date;
}
