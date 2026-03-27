import axios, { AxiosInstance, AxiosError } from 'axios'

// Spring App billing client → billing-ms.fly.dev
// Plata billing → billing-ms-plata.fly.dev
// The URL is resolved from the Spring-specific env variable to prevent cross-context pollution
const BILLING_BASE_URL = process.env.NEXT_PUBLIC_SPRING_BILLING_MS_URL || 'https://billing-ms.fly.dev';

class BillingClient {
    private client: AxiosInstance
    private static instance: BillingClient

    private constructor() {
        this.client = axios.create({
            baseURL: BILLING_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds
        })

        // Request interceptor - attach auth token
        this.client.interceptors.request.use(
            (config) => {
                if (typeof window !== 'undefined') {
                    const token = localStorage.getItem('accessToken')
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`
                    }
                }
                return config
            },
            (error) => {
                return Promise.reject(error)
            }
        )

        // Response interceptor - handle errors
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                // Log error for debugging
                console.error('Billing API Error:', {
                    url: error.config?.url,
                    status: error.response?.status,
                    data: error.response?.data,
                })

                // Handle 401 - unauthorized
                if (error.response?.status === 401) {
                    // Token might be expired, try to refresh
                    // For now, we'll let the main API client handle this
                    // You could implement token refresh logic here if needed
                }

                return Promise.reject(error)
            }
        )
    }

    public static getInstance(): BillingClient {
        if (!BillingClient.instance) {
            BillingClient.instance = new BillingClient()
        }
        return BillingClient.instance
    }

    public getClient(): AxiosInstance {
        return this.client
    }

    // Helper method to handle API responses
    public async request<T>(
        method: 'get' | 'post' | 'put' | 'delete',
        url: string,
        data?: any,
        params?: any
    ): Promise<T> {
        try {
            const response = await this.client.request<T>({
                method,
                url,
                data,
                params,
            })
            return response.data
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    error.response?.data?.message ||
                    error.message ||
                    'An error occurred while communicating with the billing service'
                )
            }
            throw error
        }
    }
}

export const billingClient = BillingClient.getInstance()
export default billingClient
