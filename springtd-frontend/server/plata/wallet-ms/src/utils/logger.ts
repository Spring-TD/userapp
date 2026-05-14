// Simple logger utility for the wallet microservice
export class Logger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
  }
}

export const logger = new Logger();