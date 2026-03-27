/**
 * SAMS (Service Authentication Microservice) Models
 * Defines data models for service registration, credentials, and IP whitelisting
 */

import { 
  Service, 
  Credential, 
  IPWhitelist, 
  ServiceStatus, 
  CredentialStatus,
  ServiceStorage 
} from '../types/samsTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for SAMS data
 * In production, this would be replaced with actual database implementation
 */
class SAMSStorage implements ServiceStorage {
  public services: Map<string, Service> = new Map();
  public ipWhitelists: Map<string, IPWhitelist> = new Map();
  public credentials: Map<string, Credential> = new Map();

  /**
   * Clear all storage (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.ipWhitelists.clear();
    this.credentials.clear();
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      services: this.services.size,
      ipWhitelists: this.ipWhitelists.size,
      credentials: this.credentials.size
    };
  }
}

/**
 * Service Model - Handles service registration and management
 */
export class ServiceModel {
  private static storage = new SAMSStorage();

  /**
   * Create a new service
   */
  static create(serviceData: Omit<Service, 'service_id' | 'created_at' | 'updated_at' | 'status'>): Service {
    const service: Service = {
      service_id: uuidv4(),
      status: ServiceStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
      ...serviceData
    };

    this.storage.services.set(service.service_id, service);
    return service;
  }

  /**
   * Find service by ID
   */
  static findById(serviceId: string): Service | null {
    return this.storage.services.get(serviceId) || null;
  }

  /**
   * Find service by name
   */
  static findByName(name: string): Service | null {
    for (const service of this.storage.services.values()) {
      if (service.name === name) {
        return service;
      }
    }
    return null;
  }

  /**
   * Get all services
   */
  static findAll(): Service[] {
    return Array.from(this.storage.services.values());
  }

  /**
   * Update service
   */
  static update(serviceId: string, updates: Partial<Service>): Service | null {
    const service = this.storage.services.get(serviceId);
    if (!service) return null;

    const updatedService = {
      ...service,
      ...updates,
      updated_at: new Date()
    };

    this.storage.services.set(serviceId, updatedService);
    return updatedService;
  }

  /**
   * Delete service
   */
  static delete(serviceId: string): boolean {
    return this.storage.services.delete(serviceId);
  }

  /**
   * Check if service exists
   */
  static exists(serviceId: string): boolean {
    return this.storage.services.has(serviceId);
  }

  /**
   * Get services by status
   */
  static findByStatus(status: ServiceStatus): Service[] {
    return Array.from(this.storage.services.values()).filter(
      service => service.status === status
    );
  }

  /**
   * Clear all services (testing only)
   */
  static clear(): void {
    this.storage.services.clear();
  }
}

/**
 * IP Whitelist Model - Handles IP address whitelisting for services
 */
export class IPWhitelistModel {
  private static storage = ServiceModel['storage'] as SAMSStorage;

  /**
   * Create IP whitelist entry
   */
  static create(whitelistData: Omit<IPWhitelist, 'id' | 'created_at' | 'updated_at'>): IPWhitelist {
    const whitelist: IPWhitelist = {
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      ...whitelistData
    };

    this.storage.ipWhitelists.set(whitelist.id, whitelist);
    return whitelist;
  }

  /**
   * Find whitelist entries by service ID
   */
  static findByServiceId(serviceId: string): IPWhitelist[] {
    return Array.from(this.storage.ipWhitelists.values()).filter(
      entry => entry.service_id === serviceId && entry.is_active
    );
  }

  /**
   * Check if IP is whitelisted for service
   */
  static isIPWhitelisted(serviceId: string, ipAddress: string): boolean {
    const entries = this.findByServiceId(serviceId);
    return entries.some(entry => 
      entry.ip_address === ipAddress || 
      (entry.ip_range && this.isIPInRange(ipAddress, entry.ip_range))
    );
  }

  /**
   * Helper method to check if IP is in CIDR range
   */
  private static isIPInRange(ip: string, cidr: string): boolean {
    // Simple implementation - in production use a proper CIDR library
    if (!cidr.includes('/')) return ip === cidr;
    
    const parts = cidr.split('/');
    if (parts.length !== 2) return false;
    
    const range = parts[0];
    const bits = parts[1];
    
    // Check for undefined values
    if (range === undefined || bits === undefined) return false;
    
    const bitsNum = parseInt(bits);
    if (isNaN(bitsNum)) return false;
    
    const mask = ~(2 ** (32 - bitsNum) - 1);
    
    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);
    
    return (ipNum & mask) === (rangeNum & mask);
  }

  /**
   * Convert IP string to number
   */
  private static ipToNumber(ip: string): number {
    return ip.split('.').reduce((num, octet) => num * 256 + parseInt(octet), 0);
  }

  /**
   * Deactivate IP whitelist entry
   */
  static deactivate(id: string): boolean {
    const entry = this.storage.ipWhitelists.get(id);
    if (!entry) return false;

    entry.is_active = false;
    entry.updated_at = new Date();
    this.storage.ipWhitelists.set(id, entry);
    return true;
  }

  /**
   * Delete all whitelist entries for a service
   */
  static deleteByServiceId(serviceId: string): number {
    let deletedCount = 0;
    for (const [id, entry] of this.storage.ipWhitelists.entries()) {
      if (entry.service_id === serviceId) {
        this.storage.ipWhitelists.delete(id);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Clear all whitelist entries (testing only)
   */
  static clear(): void {
    this.storage.ipWhitelists.clear();
  }
}

/**
 * Credential Model - Handles service-to-service authentication credentials
 */
export class CredentialModel {
  private static storage = ServiceModel['storage'] as SAMSStorage;

  /**
   * Create new credential
   */
  static create(credentialData: Omit<Credential, 'credential_id' | 'created_at' | 'updated_at' | 'status'>): Credential {
    const credential: Credential = {
      credential_id: uuidv4(),
      status: CredentialStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
      ...credentialData
    };

    this.storage.credentials.set(credential.credential_id, credential);
    return credential;
  }

  /**
   * Find credential by ID
   */
  static findById(credentialId: string): Credential | null {
    return this.storage.credentials.get(credentialId) || null;
  }

  /**
   * Find credential by value (for validation)
   */
  static findByValue(credentialValue: string): Credential | null {
    for (const credential of this.storage.credentials.values()) {
      if (credential.credential_value === credentialValue || 
          credential.credential_hash === credentialValue) {
        return credential;
      }
    }
    return null;
  }

  /**
   * Find credentials by service ID
   */
  static findByServiceId(serviceId: string): Credential[] {
    return Array.from(this.storage.credentials.values()).filter(
      cred => cred.service_id === serviceId
    );
  }

  /**
   * Find active credentials by service ID
   */
  static findActiveByServiceId(serviceId: string): Credential[] {
    return this.findByServiceId(serviceId).filter(
      cred => cred.status === CredentialStatus.ACTIVE && 
              (!cred.expires_at || cred.expires_at > new Date())
    );
  }

  /**
   * Find credentials by merchant ID (NEW METHOD)
   */
  static findByMerchantId(merchantId: string): Credential[] {
    return Array.from(this.storage.credentials.values()).filter(
      cred => cred.user_merchant_id === merchantId
    );
  }

  /**
   * Find active credentials by merchant ID (NEW METHOD)
   */
  static findActiveByMerchantId(merchantId: string): Credential[] {
    return this.findByMerchantId(merchantId).filter(
      cred => cred.status === CredentialStatus.ACTIVE && 
              (!cred.expires_at || cred.expires_at > new Date())
    );
  }

  /**
   * Find credentials by service ID and merchant ID (NEW METHOD)
   */
  static findByServiceIdAndMerchantId(serviceId: string, merchantId: string): Credential[] {
    return Array.from(this.storage.credentials.values()).filter(
      cred => cred.service_id === serviceId && cred.user_merchant_id === merchantId
    );
  }

  /**
   * Validate credential
   */
  static validate(credentialValue: string, serviceId?: string, userMerchantId?: string): {
    isValid: boolean;
    credential?: Credential;
    reason?: string;
  } {
    const credential = this.findByValue(credentialValue);
    
    if (!credential) {
      return { isValid: false, reason: 'Credential not found' };
    }

    if (credential.status !== CredentialStatus.ACTIVE) {
      return { isValid: false, reason: 'Credential is not active', credential };
    }

    if (credential.expires_at && credential.expires_at <= new Date()) {
      return { isValid: false, reason: 'Credential has expired', credential };
    }

    // Check if credential is authorized for the specific merchant (NEW CHECK)
    if (userMerchantId && credential.user_merchant_id && credential.user_merchant_id !== userMerchantId) {
      return { isValid: false, reason: 'Credential not authorized for this merchant', credential };
    }

    if (serviceId && credential.target_service_id && credential.target_service_id !== serviceId) {
      return { isValid: false, reason: 'Credential not authorized for this service', credential };
    }

    // Update last used timestamp
    credential.last_used_at = new Date();
    this.storage.credentials.set(credential.credential_id, credential);

    return { isValid: true, credential };
  }

  /**
   * Void/revoke credential
   */
  static void(credentialId: string): boolean {
    const credential = this.storage.credentials.get(credentialId);
    if (!credential) return false;

    credential.status = CredentialStatus.REVOKED;
    credential.updated_at = new Date();
    this.storage.credentials.set(credentialId, credential);
    return true;
  }

  /**
   * Check if credential is expired and mark it
   */
  static markExpired(): number {
    let expiredCount = 0;
    const now = new Date();

    for (const credential of this.storage.credentials.values()) {
      if (credential.expires_at && 
          credential.expires_at <= now && 
          credential.status === CredentialStatus.ACTIVE) {
        credential.status = CredentialStatus.EXPIRED;
        credential.updated_at = now;
        this.storage.credentials.set(credential.credential_id, credential);
        expiredCount++;
      }
    }
    return expiredCount;
  }

  /**
   * Delete credentials by service ID
   */
  static deleteByServiceId(serviceId: string): number {
    let deletedCount = 0;
    for (const [id, credential] of this.storage.credentials.entries()) {
      if (credential.service_id === serviceId) {
        this.storage.credentials.delete(id);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Clear all credentials (testing only)
   */
  static clear(): void {
    this.storage.credentials.clear();
  }
}

/**
 * SAMS Database - Main interface for all SAMS operations
 */
export class SAMSDatabase {
  static services = ServiceModel;
  static ipWhitelists = IPWhitelistModel;
  static credentials = CredentialModel;

  /**
   * Initialize database with sample data (for development)
   */
  static async initialize(): Promise<void> {
    // This could load initial data or run migrations
    console.log('SAMS Database initialized');
  }

  /**
   * Clear all data (testing only)
   */
  static clearAll(): void {
    ServiceModel.clear();
    IPWhitelistModel.clear();
    CredentialModel.clear();
  }

  /**
   * Get database statistics
   */
  static getStats() {
    return (ServiceModel['storage'] as SAMSStorage).getStats();
  }
}

// Export storage instance for external access if needed
export const samsStorage = ServiceModel['storage'] as SAMSStorage;