/**
 * SAMS (Service Authentication Microservice) Service Layer
 * Contains business logic for service management, credentials, and IP whitelisting
 */

import { 
  Service, 
  Credential, 
  IPWhitelist,
  CreateServiceRequest,
  CreateServiceResponse,
  CreateCredentialRequest,
  CreateCredentialResponse,
  ValidateCredentialRequest,
  ValidateCredentialResponse,
  VoidCredentialRequest,
  VoidCredentialResponse,
  WhitelistIPRequest,
  GetServicesResponse,
  GetServiceResponse,
  CredentialType,
  ServiceStatus,
  CredentialStatus
} from '../types/samsTypes';
import { SAMSDatabase } from '../models/SAMS';
import { logger } from '../utils/logger';
import { generateSecureToken, hashPassword } from '../utils/crypto';

/**
 * Service Management Service
 * Handles creation, discovery, and management of microservices
 */
export class ServiceService {
  /**
   * Create a new service registration
   */
  static async createService(
    serviceData: CreateServiceRequest,
    createdBy?: string
  ): Promise<CreateServiceResponse> {
    try {
      // Check if service name already exists
      const existingService = SAMSDatabase.services.findByName(serviceData.name);
      if (existingService) {
        return {
          success: false,
          message: 'Service with this name already exists',
          data: null as any
        };
      }

      // Validate URL formats if provided
      if (serviceData.endpoint_url && !this.isValidUrl(serviceData.endpoint_url)) {
        return {
          success: false,
          message: 'Invalid endpoint URL format',
          data: null as any
        };
      }

      if (serviceData.health_check_url && !this.isValidUrl(serviceData.health_check_url)) {
        return {
          success: false,
          message: 'Invalid health check URL format',
          data: null as any
        };
      }

      // Create service
      const serviceParams: Omit<Service, 'service_id' | 'created_at' | 'updated_at' | 'status'> = {
        ...serviceData,
      };
      if (createdBy !== undefined) {
        serviceParams.created_by = createdBy;
      }
      const service = SAMSDatabase.services.create(serviceParams);

      logger.info('Service created successfully', {
        serviceId: service.service_id,
        serviceName: service.name,
        createdBy
      });

      return {
        success: true,
        message: 'Service created successfully',
        data: { service }
      };

    } catch (error) {
      logger.error('Error creating service', { error, serviceData });
      return {
        success: false,
        message: 'Internal server error occurred while creating service',
        data: null as any
      };
    }
  }

  /**
   * Get all registered services
   */
  static async getAllServices(): Promise<GetServicesResponse> {
    try {
      const services = SAMSDatabase.services.findAll();
      
      return {
        success: true,
        message: 'Services retrieved successfully',
        data: {
          services,
          total: services.length
        }
      };
    } catch (error) {
      logger.error('Error retrieving services', { error });
      return {
        success: false,
        message: 'Internal server error occurred while retrieving services',
        data: { services: [], total: 0 }
      };
    }
  }

  /**
   * Get a specific service by ID
   */
  static async getServiceById(serviceId: string): Promise<GetServiceResponse> {
    try {
      const service = SAMSDatabase.services.findById(serviceId);
      if (!service) {
        return {
          success: false,
          message: 'Service not found',
          data: null as any
        };
      }

      const whitelistedIps = SAMSDatabase.ipWhitelists.findByServiceId(serviceId);
      const activeCredentials = SAMSDatabase.credentials.findActiveByServiceId(serviceId);

      return {
        success: true,
        message: 'Service retrieved successfully',
        data: {
          service,
          whitelisted_ips: whitelistedIps,
          active_credentials: activeCredentials.length
        }
      };
    } catch (error) {
      logger.error('Error retrieving service', { error, serviceId });
      return {
        success: false,
        message: 'Internal server error occurred while retrieving service',
        data: null as any
      };
    }
  }

  /**
   * Update service status
   */
  static async updateServiceStatus(
    serviceId: string, 
    status: ServiceStatus,
    updatedBy?: string
  ): Promise<{ success: boolean; message: string; service?: Service }> {
    try {
      const service = SAMSDatabase.services.findById(serviceId);
      if (!service) {
        return {
          success: false,
          message: 'Service not found'
        };
      }

      const updatedService = SAMSDatabase.services.update(serviceId, { 
        status,
        updated_at: new Date()
      });

      logger.info('Service status updated', {
        serviceId,
        oldStatus: service.status,
        newStatus: status,
        updatedBy
      });

      return {
        success: true,
        message: 'Service status updated successfully',
        service: updatedService!
      };
    } catch (error) {
      logger.error('Error updating service status', { error, serviceId, status });
      return {
        success: false,
        message: 'Internal server error occurred while updating service status'
      };
    }
  }

  /**
   * Delete/decommission a service
   */
  static async decommissionService(
    serviceId: string,
    decommissionedBy?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const service = SAMSDatabase.services.findById(serviceId);
      if (!service) {
        return {
          success: false,
          message: 'Service not found'
        };
      }

      // Update status to decommissioned instead of deleting
      SAMSDatabase.services.update(serviceId, {
        status: ServiceStatus.DECOMMISSIONED,
        updated_at: new Date()
      });

      // Deactivate all IP whitelists
      SAMSDatabase.ipWhitelists.deleteByServiceId(serviceId);

      // Revoke all credentials
      const credentials = SAMSDatabase.credentials.findByServiceId(serviceId);
      credentials.forEach(credential => {
        SAMSDatabase.credentials.void(credential.credential_id);
      });

      logger.info('Service decommissioned', {
        serviceId,
        serviceName: service.name,
        decommissionedBy
      });

      return {
        success: true,
        message: 'Service decommissioned successfully'
      };
    } catch (error) {
      logger.error('Error decommissioning service', { error, serviceId });
      return {
        success: false,
        message: 'Internal server error occurred while decommissioning service'
      };
    }
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * IP Whitelist Service
 * Handles IP address whitelisting for service access control
 */
export class WhitelistService {
  /**
   * Whitelist IP addresses for a service
   */
  static async whitelistIPs(
    serviceId: string,
    whitelistData: WhitelistIPRequest,
    createdBy?: string
  ): Promise<{ success: boolean; message: string; whitelisted?: IPWhitelist[] }> {
    try {
      // Verify service exists
      const service = SAMSDatabase.services.findById(serviceId);
      if (!service) {
        return {
          success: false,
          message: 'Service not found'
        };
      }

      if (service.status !== ServiceStatus.ACTIVE) {
        return {
          success: false,
          message: 'Cannot whitelist IPs for inactive service'
        };
      }

      const whitelistedEntries: IPWhitelist[] = [];

      // Process each IP address
      for (const ipAddress of whitelistData.ip_addresses) {
        // Validate IP address format
        if (!this.isValidIPAddress(ipAddress)) {
          return {
            success: false,
            message: `Invalid IP address format: ${ipAddress}`
          };
        }

        // Check if IP is already whitelisted
        const existing = SAMSDatabase.ipWhitelists.findByServiceId(serviceId)
          .find(entry => entry.ip_address === ipAddress && entry.is_active);

        if (existing) {
          logger.warn('IP address already whitelisted', { serviceId, ipAddress });
          continue;
        }

        // Create whitelist entry
        const whitelistParams: Omit<IPWhitelist, 'id' | 'created_at' | 'updated_at'> = {
          service_id: serviceId,
          ip_address: ipAddress,
          is_active: true
        };
        if (whitelistData.description !== undefined) {
          whitelistParams.description = whitelistData.description;
        }
        if (createdBy !== undefined) {
          whitelistParams.created_by = createdBy;
        }
        const whitelist = SAMSDatabase.ipWhitelists.create(whitelistParams);

        whitelistedEntries.push(whitelist);
      }

      logger.info('IP addresses whitelisted', {
        serviceId,
        ipAddresses: whitelistData.ip_addresses,
        createdBy
      });

      return {
        success: true,
        message: `${whitelistedEntries.length} IP address(es) whitelisted successfully`,
        whitelisted: whitelistedEntries
      };

    } catch (error) {
      logger.error('Error whitelisting IP addresses', { error, serviceId, whitelistData });
      return {
        success: false,
        message: 'Internal server error occurred while whitelisting IP addresses'
      };
    }
  }

  /**
   * Check if IP address is whitelisted for service
   */
  static async checkIPAccess(
    serviceId: string,
    ipAddress: string
  ): Promise<{ isAllowed: boolean; reason?: string }> {
    try {
      const service = SAMSDatabase.services.findById(serviceId);
      if (!service) {
        return { isAllowed: false, reason: 'Service not found' };
      }

      if (service.status !== ServiceStatus.ACTIVE) {
        return { isAllowed: false, reason: 'Service is not active' };
      }

      const isWhitelisted = SAMSDatabase.ipWhitelists.isIPWhitelisted(serviceId, ipAddress);
      
      if (!isWhitelisted) {
        logger.warn('IP access denied - not whitelisted', { serviceId, ipAddress });
        return { isAllowed: false, reason: 'IP address not whitelisted for this service' };
      }

      return { isAllowed: true };

    } catch (error) {
      logger.error('Error checking IP access', { error, serviceId, ipAddress });
      return { isAllowed: false, reason: 'Internal server error' };
    }
  }

  /**
   * Get whitelisted IPs for a service
   */
  static async getWhitelistedIPs(serviceId: string): Promise<IPWhitelist[]> {
    try {
      return SAMSDatabase.ipWhitelists.findByServiceId(serviceId);
    } catch (error) {
      logger.error('Error retrieving whitelisted IPs', { error, serviceId });
      return [];
    }
  }

  /**
   * Validate IP address format
   */
  private static isValidIPAddress(ip: string): boolean {
    // Check for CIDR notation
    if (ip.includes('/')) {
      const parts = ip.split('/');
      if (parts.length !== 2) return false;
      const address = parts[0];
      const mask = parts[1];
      if (address === undefined || mask === undefined) return false;
      const maskNum = parseInt(mask);
      if (isNaN(maskNum)) return false;
      if (maskNum < 0 || maskNum > 32) return false;
      return this.isValidIPv4(address);
    }
    
    return this.isValidIPv4(ip);
  }

  /**
   * Validate IPv4 address
   */
  private static isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    
    return parts.every(part => {
      const num = parseInt(part);
      return num >= 0 && num <= 255 && part === num.toString();
    });
  }
}

/**
 * Credential Service
 * Handles creation, validation, and management of service-to-service credentials
 */
export class CredentialService {
  /**
   * Create credentials for a service
   */
  static async createCredential(
    serviceId: string,
    credentialData: CreateCredentialRequest,
    createdBy?: string
  ): Promise<CreateCredentialResponse> {
    try {
      // Verify service exists
      const service = SAMSDatabase.services.findById(serviceId);
      if (!service) {
        return {
          success: false,
          message: 'Service not found',
          data: null as any
        };
      }

      if (service.status !== ServiceStatus.ACTIVE) {
        return {
          success: false,
          message: 'Cannot create credentials for inactive service',
          data: null as any
        };
      }

      // Verify target service exists if specified
      if (credentialData.target_service_id) {
        const targetService = SAMSDatabase.services.findById(credentialData.target_service_id);
        if (!targetService) {
          return {
            success: false,
            message: 'Target service not found',
            data: null as any
          };
        }
      }

      // Generate credential value based on type
      const credentialValue = await this.generateCredentialValue(credentialData.credential_type);
      const credentialHash = await this.hashCredential(credentialValue);

      // Calculate expiration date
      const expiresAt = credentialData.expires_in 
        ? new Date(Date.now() + credentialData.expires_in * 1000)
        : undefined;

      // Create credential
      const credentialParams: Omit<Credential, 'credential_id' | 'created_at' | 'updated_at' | 'status'> = {
        service_id: serviceId,
        credential_type: credentialData.credential_type,
        credential_value: credentialValue,
        credential_hash: credentialHash,
        permissions: credentialData.permissions || [],
      };
      if (credentialData.target_service_id !== undefined) {
        credentialParams.target_service_id = credentialData.target_service_id;
      }
      if (expiresAt !== undefined) {
        credentialParams.expires_at = expiresAt;
      }
      if (credentialData.rate_limit !== undefined) {
        credentialParams.rate_limit = credentialData.rate_limit;
      }
      if (createdBy !== undefined) {
        credentialParams.created_by = createdBy;
      }
      const credential = SAMSDatabase.credentials.create(credentialParams);

      logger.info('Credential created', {
        credentialId: credential.credential_id,
        serviceId,
        targetServiceId: credentialData.target_service_id,
        credentialType: credentialData.credential_type,
        createdBy
      });

      // Return credential without hash for security
      const { credential_hash, ...credentialResponse } = credential;

      return {
        success: true,
        message: 'Credential created successfully',
        data: { credential: credentialResponse }
      };

    } catch (error) {
      logger.error('Error creating credential', { error, serviceId, credentialData });
      return {
        success: false,
        message: 'Internal server error occurred while creating credential',
        data: null as any
      };
    }
  }

  /**
   * Validate a credential
   */
  static async validateCredential(
    validationData: ValidateCredentialRequest
  ): Promise<ValidateCredentialResponse> {
    try {
      const validation = SAMSDatabase.credentials.validate(
        validationData.credential_value,
        validationData.service_id
      );

      if (!validation.isValid) {
        logger.warn('Credential validation failed', {
          reason: validation.reason,
          serviceId: validationData.service_id
        });

        return {
          success: true,
          valid: false,
          message: validation.reason || 'Credential validation failed'
        };
      }

      const { credential } = validation;

      // Check permissions if requested
      if (validationData.requested_permissions && validationData.requested_permissions.length > 0) {
        const hasPermissions = this.checkPermissions(
          credential!.permissions || [],
          validationData.requested_permissions
        );

        if (!hasPermissions) {
          return {
            success: true,
            valid: false,
            message: 'Insufficient permissions'
          };
        }
      }

      logger.info('Credential validated successfully', {
        credentialId: credential!.credential_id,
        serviceId: credential!.service_id,
        targetServiceId: credential!.target_service_id
      });

      // Build response data object with proper handling of optional properties
      const responseData: NonNullable<ValidateCredentialResponse['data']> = {
        credential_id: credential!.credential_id,
        service_id: credential!.service_id,
        permissions: credential!.permissions || []
      };
      
      if (credential!.expires_at !== undefined) {
        responseData.expires_at = credential!.expires_at;
      }
      
      if (credential!.rate_limit !== undefined) {
        responseData.rate_limit = credential!.rate_limit;
      }

      return {
        success: true,
        valid: true,
        message: 'Credential is valid',
        data: responseData
      };

    } catch (error) {
      logger.error('Error validating credential', { error, validationData });
      return {
        success: false,
        valid: false,
        message: 'Internal server error occurred during credential validation'
      };
    }
  }

  /**
   * Void/revoke a credential
   */
  static async voidCredential(
    credentialId: string,
    voidData: VoidCredentialRequest,
    voidedBy?: string
  ): Promise<VoidCredentialResponse> {
    try {
      const credential = SAMSDatabase.credentials.findById(credentialId);
      if (!credential) {
        return {
          success: false,
          message: 'Credential not found'
        };
      }

      if (credential.status !== CredentialStatus.ACTIVE) {
        return {
          success: false,
          message: 'Credential is already inactive'
        };
      }

      const success = SAMSDatabase.credentials.void(credentialId, voidData.reason);
      if (!success) {
        return {
          success: false,
          message: 'Failed to void credential'
        };
      }

      logger.info('Credential voided', {
        credentialId,
        serviceId: credential.service_id,
        reason: voidData.reason,
        voidedBy
      });

      return {
        success: true,
        message: 'Credential voided successfully',
        data: {
          credential_id: credentialId,
          voided_at: new Date()
        }
      };

    } catch (error) {
      logger.error('Error voiding credential', { error, credentialId, voidData });
      return {
        success: false,
        message: 'Internal server error occurred while voiding credential'
      };
    }
  }

  /**
   * Get credentials for a service
   */
  static async getServiceCredentials(serviceId: string): Promise<Credential[]> {
    try {
      return SAMSDatabase.credentials.findByServiceId(serviceId);
    } catch (error) {
      logger.error('Error retrieving service credentials', { error, serviceId });
      return [];
    }
  }

  /**
   * Clean up expired credentials
   */
  static async cleanupExpiredCredentials(): Promise<number> {
    try {
      const expiredCount = SAMSDatabase.credentials.markExpired();
      logger.info('Expired credentials cleaned up', { count: expiredCount });
      return expiredCount;
    } catch (error) {
      logger.error('Error cleaning up expired credentials', { error });
      return 0;
    }
  }

  /**
   * Generate credential value based on type
   */
  private static async generateCredentialValue(type: CredentialType): Promise<string> {
    switch (type) {
      case CredentialType.API_KEY:
        return `sams_${generateSecureToken(32)}`;
      case CredentialType.JWT_TOKEN:
        return generateSecureToken(64);
      case CredentialType.CLIENT_SECRET:
        return generateSecureToken(48);
      default:
        throw new Error(`Unsupported credential type: ${type}`);
    }
  }

  /**
   * Hash credential for storage
   */
  private static async hashCredential(credential: string): Promise<string> {
    return await hashPassword(credential);
  }

  /**
   * Check if required permissions are available
   */
  private static checkPermissions(available: string[], required: string[]): boolean {
    return required.every(permission => available.includes(permission));
  }
}

/**
 * SAMS Service - Main service coordinator
 */
export class SAMSService {
  static services = ServiceService;
  static whitelist = WhitelistService;
  static credentials = CredentialService;

  /**
   * Initialize SAMS services
   */
  static async initialize(): Promise<void> {
    try {
      await SAMSDatabase.initialize();
      
      // Start cleanup job for expired credentials
      setInterval(() => {
        CredentialService.cleanupExpiredCredentials();
      }, 60 * 60 * 1000); // Run every hour

      logger.info('SAMS Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SAMS Service', { error });
      throw error;
    }
  }

  /**
   * Get system health status
   */
  static getHealthStatus() {
    const stats = SAMSDatabase.getStats();
    return {
      status: 'healthy',
      services: stats.services,
      credentials: stats.credentials,
      ip_whitelists: stats.ipWhitelists,
      timestamp: new Date().toISOString()
    };
  }
}