// src/utils/logger.ts
import winston from 'winston';
import { format, transports } from 'winston';
import { KYCStatus } from '../types/kycTypes';

// Create a logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    // In production, you would add a file transport
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  ],
  // Do not log during test
  silent: process.env.NODE_ENV === 'test'
});

// Helper function to log KYC status
export const logKYCStatus = (userId: string, status: KYCStatus) => {
  logger.info(`KYC status updated for user ${userId} to ${status}`);
};

// Helper function to log document upload
export const logDocumentUpload = (userId: string, fileName: string, fileSize: number) => {
  logger.info(`Document uploaded for user ${userId}: ${fileName} (${fileSize} bytes)`);
};

// Helper function to log document deletion
export const logDocumentDeletion = (userId: string, fileName: string) => {
  logger.info(`Document deleted for user ${userId}: ${fileName}`);
};

// Helper function to log KYC submission
export const logKYCSubmission = (userId: string, documentCount: number) => {
  logger.info(`KYC submitted for user ${userId} with ${documentCount} documents`);
};

// Helper function to log KYC review
export const logKYCReview = (userId: string, reviewedBy: string, status: KYCStatus) => {
  logger.info(`KYC reviewed for user ${userId} by ${reviewedBy} with status ${status}`);
};

// Helper function to log KYC search
export const logKYCSearch = (requesterId: string, filters: any) => {
  logger.info(`KYC search executed by ${requesterId} with filters: ${JSON.stringify(filters)}`);
};