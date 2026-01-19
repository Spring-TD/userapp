/**
 * SAMS (Service Authentication Microservice) Type Definitions
 * Defines interfaces and types for service management, credentials, and IP whitelisting
 */

/**
 * Status enumeration for services
 */
export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DECOMMISSIONED = 'decommissioned'
}

/**
 * Status enumeration for credentials
 */
export enum CredentialStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

/**
 * Types of credentials that can be generated
 */
export enum CredentialType {
  API_KEY = 'api_key',
  JWT_TOKEN = 'jwt_token',
  CLIENT_SECRET = 'client_secret'
}

/**
 * Service interface representing a registered microservice
 */
export interface Service {
  service_id: string;
  name: string;
  description: string;
  version?: string;
  endpoint_url?: string;
  health_check_url?: string;
  status: ServiceStatus;
  owner_email?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

/**
 * Request interface for creating a new service
 */
export interface CreateServiceRequest {
  name: string;
  description: string;
  version?: string;
  endpoint_url?: string;
  health_check_url?: string;
  owner_email?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Response interface for service creation
 */
export interface CreateServiceResponse {
  success: boolean;
  message: string;
  data: {
    service: Service;
  };
}

/**
 * IP Whitelist entry interface
 */
export interface IPWhitelist {
  id: string;
  service_id: string;
  ip_address: string;
  ip_range?: string; // CIDR notation for IP ranges
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

/**
 * Request interface for whitelisting IP addresses
 */
export interface WhitelistIPRequest {
  ip_addresses: string[];
  description?: string;
}

/**
 * Credential interface for service-to-service authentication
 */
export interface Credential {
  credential_id: string;
  service_id: string;
  target_service_id?: string; // Service this credential can access (null = any service)
  credential_type: CredentialType;
  credential_value: string; // The actual API key, token, or secret
  credential_hash?: string; // Hashed version for validation
  status: CredentialStatus;
  expires_at?: Date;
  permissions?: string[]; // List of permissions/scopes
  rate_limit?: number; // Requests per minute
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

/**
 * Request interface for creating credentials
 */
export interface CreateCredentialRequest {
  target_service_id?: string;
  credential_type: CredentialType;
  expires_in?: number; // Expiration in seconds
  permissions?: string[];
  rate_limit?: number;
  description?: string;
}

/**
 * Response interface for credential creation
 */
export interface CreateCredentialResponse {
  success: boolean;
  message: string;
  data: {
    credential: Omit<Credential, 'credential_hash'>;
  };
}

/**
 * Request interface for credential validation
 */
export interface ValidateCredentialRequest {
  credential_value: string;
  service_id?: string; // The service requesting validation
  requested_permissions?: string[];
}

/**
 * Response interface for credential validation
 */
export interface ValidateCredentialResponse {
  success: boolean;
  valid: boolean;
  message?: string;
  data?: {
    credential_id: string;
    service_id: string;
    permissions: string[];
    expires_at?: Date;
    rate_limit?: number;
  };
}

/**
 * Request interface for voiding credentials
 */
export interface VoidCredentialRequest {
  reason?: string;
}

/**
 * Response interface for credential voiding
 */
export interface VoidCredentialResponse {
  success: boolean;
  message: string;
  data?: {
    credential_id: string;
    voided_at: Date;
  };
}

/**
 * Service discovery response interface
 */
export interface GetServicesResponse {
  success: boolean;
  message: string;
  data: {
    services: Service[];
    total: number;
  };
}

/**
 * Single service response interface
 */
export interface GetServiceResponse {
  success: boolean;
  message: string;
  data: {
    service: Service;
    whitelisted_ips: IPWhitelist[];
    active_credentials: number;
  };
}

/**
 * Database/Storage interfaces for in-memory implementation
 */
export interface ServiceStorage {
  services: Map<string, Service>;
  ipWhitelists: Map<string, IPWhitelist>;
  credentials: Map<string, Credential>;
}

/**
 * Credential validation result interface (internal use)
 */
export interface CredentialValidationResult {
  isValid: boolean;
  credential?: Credential;
  service?: Service;
  reason?: string;
}

/**
 * IP validation result interface (internal use)
 */
export interface IPValidationResult {
  isAllowed: boolean;
  whitelistEntry?: IPWhitelist;
  reason?: string;
}

/**
 * Service metrics interface (for future monitoring)
 */
export interface ServiceMetrics {
  service_id: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  last_health_check: Date;
  uptime_percentage: number;
}