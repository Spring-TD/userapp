/**
 * SAMS (Service Authentication Microservice) Models
 * Defines data models for service registration, credentials, and IP whitelisting
 * NOW USES MONGODB VIA MONGOOSE
 */

import {
  Service,
  Credential,
  IPWhitelist,
  ServiceStatus,
  CredentialStatus
} from '../types/samsTypes';
import { v4 as uuidv4 } from 'uuid';
import { ServiceModelMongo, CredentialModelMongo, IPWhitelistModelMongo } from './mongooseModels';

/**
 * Service Model - Handles service registration and management
 */
export class ServiceModel {
  /**
   * Create a new service
   */
  static async create(serviceData: Omit<Service, 'service_id' | 'created_at' | 'updated_at' | 'status'>): Promise<Service> {
    const service = new ServiceModelMongo({
      service_id: uuidv4(),
      status: ServiceStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
      ...serviceData
    });

    const savedService = await service.save();
    return savedService.toObject() as unknown as Service;
  }

  /**
   * Find service by ID
   */
  static async findById(serviceId: string): Promise<Service | null> {
    const service = await ServiceModelMongo.findOne({ service_id: serviceId });
    return service ? (service.toObject() as unknown as Service) : null;
  }

  /**
   * Find service by name
   */
  static async findByName(name: string): Promise<Service | null> {
    const service = await ServiceModelMongo.findOne({ name });
    return service ? (service.toObject() as unknown as Service) : null;
  }

  /**
   * Get all services
   */
  static async findAll(): Promise<Service[]> {
    const services = await ServiceModelMongo.find({});
    return services.map(s => s.toObject() as unknown as Service);
  }

  /**
   * Update service
   */
  static async update(serviceId: string, updates: Partial<Service>): Promise<Service | null> {
    const service = await ServiceModelMongo.findOneAndUpdate(
      { service_id: serviceId },
      { ...updates, updated_at: new Date() },
      { new: true }
    );
    return service ? (service.toObject() as unknown as Service) : null;
  }

  /**
   * Delete service
   */
  static async delete(serviceId: string): Promise<boolean> {
    const result = await ServiceModelMongo.deleteOne({ service_id: serviceId });
    return result.deletedCount ? result.deletedCount > 0 : false;
  }

  /**
   * Check if service exists
   */
  static async exists(serviceId: string): Promise<boolean> {
    const count = await ServiceModelMongo.countDocuments({ service_id: serviceId });
    return count > 0;
  }

  /**
   * Get services by status
   */
  static async findByStatus(status: ServiceStatus): Promise<Service[]> {
    const services = await ServiceModelMongo.find({ status });
    return services.map(s => s.toObject() as unknown as Service);
  }

  /**
   * Clear all services (testing only)
   */
  static async clear(): Promise<void> {
    await ServiceModelMongo.deleteMany({});
  }
}

/**
 * IP Whitelist Model - Handles IP address whitelisting for services
 */
export class IPWhitelistModel {
  /**
   * Create IP whitelist entry
   */
  static async create(whitelistData: Omit<IPWhitelist, 'id' | 'created_at' | 'updated_at'>): Promise<IPWhitelist> {
    const whitelist = new IPWhitelistModelMongo({
      id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
      ...whitelistData
    });

    const savedWhitelist = await whitelist.save();
    return savedWhitelist.toObject() as unknown as IPWhitelist;
  }

  /**
   * Find whitelist entries by service ID
   */
  static async findByServiceId(serviceId: string): Promise<IPWhitelist[]> {
    const entries = await IPWhitelistModelMongo.find({
      service_id: serviceId,
      is_active: true
    });
    return entries.map(e => e.toObject() as unknown as IPWhitelist);
  }

  /**
   * Check if IP is whitelisted for service
   */
  static async isIPWhitelisted(serviceId: string, ipAddress: string): Promise<boolean> {
    const entries = await this.findByServiceId(serviceId);
    return entries.some(entry =>
      entry.ip_address === ipAddress ||
      (entry.ip_range && this.isIPInRange(ipAddress, entry.ip_range))
    );
  }

  /** Virtual service id for merchant-scoped gateway IP rules */
  static merchantGatewayServiceId(merchantId: string): string {
    return `merchant:${merchantId}`;
  }

  static async findByMerchantGateway(merchantId: string): Promise<IPWhitelist[]> {
    const entries = await IPWhitelistModelMongo.find({
      service_id: this.merchantGatewayServiceId(merchantId),
      is_active: true
    });
    return entries.map(e => e.toObject() as unknown as IPWhitelist);
  }

  /**
   * Gateway IP policy for a merchant: if no whitelist rows exist, all IPs allowed.
   * If rows exist, client IP must match ip_address or ip_range (CIDR).
   */
  static async isIPAllowedForMerchantGateway(merchantId: string, ipAddress: string): Promise<boolean> {
    const entries = await this.findByMerchantGateway(merchantId);
    if (entries.length === 0) {
      return true;
    }
    return entries.some(entry =>
      entry.ip_address === ipAddress ||
      (entry.ip_range && this.isIPInRange(ipAddress, entry.ip_range))
    );
  }

  /**
   * Helper method to check if IP is in CIDR range
   */
  private static isIPInRange(ip: string, cidr: string): boolean {
    if (!cidr.includes('/')) return ip === cidr;

    const parts = cidr.split('/');
    if (parts.length !== 2) return false;

    const range = parts[0];
    const bits = parts[1];

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
  static async deactivate(id: string): Promise<boolean> {
    const result = await IPWhitelistModelMongo.updateOne(
      { id: id },
      { is_active: false, updated_at: new Date() }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Delete all whitelist entries for a service
   */
  static async deleteByServiceId(serviceId: string): Promise<number> {
    const result = await IPWhitelistModelMongo.deleteMany({ service_id: serviceId });
    return result.deletedCount || 0;
  }

  /**
   * Clear all whitelist entries (testing only)
   */
  static async clear(): Promise<void> {
    await IPWhitelistModelMongo.deleteMany({});
  }
}

/**
 * Credential Model - Handles service-to-service authentication credentials
 */
export class CredentialModel {
  /**
   * Create new credential
   */
  static async create(credentialData: Omit<Credential, 'credential_id' | 'created_at' | 'updated_at' | 'status'>): Promise<Credential> {
    const credential = new CredentialModelMongo({
      credential_id: uuidv4(),
      status: CredentialStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
      ...credentialData
    });

    const savedCredential = await credential.save();
    return savedCredential.toObject() as unknown as Credential;
  }

  /**
   * Find credential by ID
   */
  static async findById(credentialId: string): Promise<Credential | null> {
    const credential = await CredentialModelMongo.findOne({ credential_id: credentialId });
    return credential ? (credential.toObject() as unknown as Credential) : null;
  }

  /**
   * Find credential by value (for validation)
   */
  static async findByValue(credentialValue: string): Promise<Credential | null> {
    // This is inefficient if credential_value is not indexed, but credential_value is just string.
    // However, if we store ONLY HASH, we can't find by value directly unless we hash the input first.
    // The original code iterated all credentials and checked `credential_value === credentialValue || credential_hash === credentialValue`.
    // We should replicate that or improve it.
    // Ideally we assume credentialValue is the raw key.
    // We query where credential_value == credentialValue OR credential_hash == credentialValue

    const credential = await CredentialModelMongo.findOne({
      $or: [
        { credential_value: credentialValue },
        { credential_hash: credentialValue }
      ]
    });

    return credential ? (credential.toObject() as unknown as Credential) : null;
  }

  /**
   * Find credentials by service ID
   */
  static async findByServiceId(serviceId: string): Promise<Credential[]> {
    const credentials = await CredentialModelMongo.find({ service_id: serviceId });
    return credentials.map(c => c.toObject() as unknown as Credential);
  }

  /**
   * Find active credentials by service ID
   */
  static async findActiveByServiceId(serviceId: string): Promise<Credential[]> {
    const credentials = await CredentialModelMongo.find({
      service_id: serviceId,
      status: CredentialStatus.ACTIVE,
      $or: [
        { expires_at: { $exists: false } },
        { expires_at: { $gt: new Date() } }
      ]
    });
    return credentials.map(c => c.toObject() as unknown as Credential);
  }

  /**
   * Find credentials by merchant ID (NEW METHOD)
   */
  static async findByMerchantId(merchantId: string): Promise<Credential[]> {
    const credentials = await CredentialModelMongo.find({ user_merchant_id: merchantId });
    return credentials.map(c => c.toObject() as unknown as Credential);
  }

  /**
   * Find active credentials by merchant ID (NEW METHOD)
   */
  static async findActiveByMerchantId(merchantId: string): Promise<Credential[]> {
    const credentials = await CredentialModelMongo.find({
      user_merchant_id: merchantId,
      status: CredentialStatus.ACTIVE,
      $or: [
        { expires_at: { $exists: false } },
        { expires_at: { $gt: new Date() } }
      ]
    });
    return credentials.map(c => c.toObject() as unknown as Credential);
  }

  /**
   * Find credentials by service ID and merchant ID (NEW METHOD)
   */
  static async findByServiceIdAndMerchantId(serviceId: string, merchantId: string): Promise<Credential[]> {
    const credentials = await CredentialModelMongo.find({
      service_id: serviceId,
      user_merchant_id: merchantId
    });
    return credentials.map(c => c.toObject() as unknown as Credential);
  }

  /**
   * Validate credential
   */
  static async validate(credentialValue: string, serviceId?: string, userMerchantId?: string): Promise<{
    isValid: boolean;
    credential?: Credential;
    reason?: string;
  }> {
    const credential = await this.findByValue(credentialValue);

    if (!credential) {
      return { isValid: false, reason: 'Credential not found' };
    }

    if (credential.status !== CredentialStatus.ACTIVE) {
      return { isValid: false, reason: 'Credential is not active', credential };
    }

    if (credential.expires_at && new Date(credential.expires_at) <= new Date()) {
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
    await CredentialModelMongo.updateOne(
      { credential_id: credential.credential_id },
      { last_used_at: new Date() }
    );
    credential.last_used_at = new Date();

    return { isValid: true, credential };
  }

  /**
   * Void/revoke credential
   */
  static async void(credentialId: string): Promise<boolean> {
    const result = await CredentialModelMongo.updateOne(
      { credential_id: credentialId },
      {
        status: CredentialStatus.REVOKED,
        updated_at: new Date()
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Check if credential is expired and mark it
   */
  static async markExpired(): Promise<number> {
    const now = new Date();
    const result = await CredentialModelMongo.updateMany(
      {
        expires_at: { $lte: now },
        status: CredentialStatus.ACTIVE
      },
      {
        status: CredentialStatus.EXPIRED,
        updated_at: now
      }
    );
    return result.modifiedCount || 0;
  }

  /**
   * Delete credentials by service ID
   */
  static async deleteByServiceId(serviceId: string): Promise<number> {
    const result = await CredentialModelMongo.deleteMany({ service_id: serviceId });
    return result.deletedCount || 0;
  }

  /**
   * Clear all credentials (testing only)
   */
  static async clear(): Promise<void> {
    await CredentialModelMongo.deleteMany({});
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
    // MongoDB connection is handled in index.ts via connectDb()
    console.log('SAMS Database initialized (MongoDB)');
  }

  /**
   * Clear all data (testing only)
   */
  static async clearAll(): Promise<void> {
    await ServiceModel.clear();
    await IPWhitelistModel.clear();
    await CredentialModel.clear();
  }

  /**
   * Get database statistics
   */
  static async getStats() {
    return {
      services: await ServiceModelMongo.countDocuments(),
      ipWhitelists: await IPWhitelistModelMongo.countDocuments(),
      credentials: await CredentialModelMongo.countDocuments()
    };
  }
}