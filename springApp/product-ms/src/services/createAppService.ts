import axios from 'axios';
import { config } from '../config/environment';

export interface AppInfo {
  id: string;
  name: string;
  merchantId: string;
  status: string;
  createdAt: string;
}

class CreateAppService {
  async getAppInfo(appId: string): Promise<AppInfo | null> {
    const id = appId.trim();
    const base = config.createAppServiceUrl.trim();
    if (!id || !base) {
      return null;
    }

    try {
      const response = await axios.get<{ success?: boolean; data?: AppInfo }>(
        `${base.replace(/\/+$/, '')}/api/v1/apps/${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${config.complianceServiceToken}`
          },
          timeout: config.clientAuthUserTimeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success && response.data.data?.name) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('create-app-ms app lookup failed', {
        appId: id,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return null;
  }
}

export default new CreateAppService();
