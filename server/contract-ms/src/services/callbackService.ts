import axios, { AxiosError } from 'axios';
import { config } from '../config/environment';

export interface CallbackPayload {
  contractOrderId: string;
  contractFormId: string;
  status: 'success' | 'failed';
  contractType: string;
  timestamp: string;
  data?: any;
}

export class CallbackService {
  /**
   * Send a callback to the redirect_url after contract signing
   * @param redirectUrl - The URL to send the callback to
   * @param payload - The data to send in the callback
   * @returns Promise<boolean> - true if callback was successful, false otherwise
   */
  async sendCallback(redirectUrl: string, payload: CallbackPayload): Promise<boolean> {
    if (!redirectUrl) {
      console.log('[CallbackService] No redirect_url provided, skipping callback');
      return false;
    }

    try {
      console.log(`[CallbackService] Sending callback to: ${redirectUrl}`);
      
      const response = await axios.post(redirectUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Contract-MS/1.0'
        },
        timeout: config.callbackTimeout || 5000, // 5 second timeout by default
        validateStatus: (status) => status >= 200 && status < 300
      });

      console.log(`[CallbackService] Callback successful. Status: ${response.status}`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(`[CallbackService] Callback failed to ${redirectUrl}:`, {
          message: axiosError.message,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data
        });
      } else {
        console.error(`[CallbackService] Unexpected error sending callback:`, error);
      }
      return false;
    }
  }

  /**
   * Send a callback with retry mechanism
   * @param redirectUrl - The URL to send the callback to
   * @param payload - The data to send in the callback
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns Promise<boolean> - true if callback was successful, false otherwise
   */
  async sendCallbackWithRetry(
    redirectUrl: string,
    payload: CallbackPayload,
    maxRetries: number = 3
  ): Promise<boolean> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      console.log(`[CallbackService] Attempt ${attempt}/${maxRetries} for ${redirectUrl}`);
      
      const success = await this.sendCallback(redirectUrl, payload);
      
      if (success) {
        return true;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[CallbackService] Retrying in ${waitTime}ms...`);
        await this.delay(waitTime);
      }
    }
    
    console.error(`[CallbackService] All ${maxRetries} attempts failed for ${redirectUrl}`);
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
