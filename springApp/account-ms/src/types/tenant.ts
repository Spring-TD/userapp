export interface TenantContext {
  appId: string;
  appName?: string;
  merchantId: string;
  subdomain: string;
}

export interface TenantRequest {
  tenant?: TenantContext;
}
