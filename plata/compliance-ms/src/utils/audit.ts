// src/utils/audit.ts
import { randomUUID } from 'crypto';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  timestamp: Date;
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

// In-memory audit log storage
const auditLogs: AuditLog[] = [];

export const auditLogger = (action: string, userId: string, details: any, req?: any) => {
  const auditEntry: AuditLog = {
    id: randomUUID(),
    action,
    userId,
    timestamp: new Date(),
    details,
    ipAddress: req?.ip || req?.connection?.remoteAddress,
    userAgent: req?.get('User-Agent')
  };

  auditLogs.push(auditEntry);
  
  // In a real implementation, this would be persisted to a database
  console.log('Audit Log:', JSON.stringify(auditEntry, null, 2));
  
  return auditEntry;
};

export const getAuditLogs = (filters: any = {}) => {
  return auditLogs.filter(log => {
    if (filters.userId && log.userId !== filters.userId) return false;
    if (filters.action && log.action !== filters.action) return false;
    if (filters.startDate && log.timestamp < filters.startDate) return false;
    if (filters.endDate && log.timestamp > filters.endDate) return false;
    return true;
  });
};

export const clearAuditLogs = () => {
  auditLogs.length = 0;
};

// Get audit statistics
export const getAuditStats = () => {
  const actions = auditLogs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const users = auditLogs.reduce((acc, log) => {
    acc[log.userId] = (acc[log.userId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalLogs: auditLogs.length,
    actions,
    users,
    lastActivity: auditLogs.length > 0 ? auditLogs[auditLogs.length - 1].timestamp : null
  };
};