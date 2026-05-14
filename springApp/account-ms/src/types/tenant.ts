export interface TenantContext {
  appId: string;
  merchantId: string;
  subdomain: string;
}

export interface TenantRequest {
  tenant?: TenantContext;
}
