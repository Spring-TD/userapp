interface AuditLog {
    id: string;
    action: string;
    userId: string;
    timestamp: Date;
    details: any;
    ipAddress?: string;
    userAgent?: string;
}
export declare const auditLogger: (action: string, userId: string, details: any, req?: any) => AuditLog;
export declare const getAuditLogs: (filters?: any) => AuditLog[];
export declare const clearAuditLogs: () => void;
export declare const getAuditStats: () => {
    totalLogs: number;
    actions: Record<string, number>;
    users: Record<string, number>;
    lastActivity: Date | null;
};
export {};
//# sourceMappingURL=audit.d.ts.map