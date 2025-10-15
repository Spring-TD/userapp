export interface Product {
  id: string;
  referenceNumber: string; // Added reference number
  name: string;
  description: string;
  type: string; // Changed from category to type
  appId: string; // Added create-app ID
  status: 'complete' | 'incomplete'; // Changed status options
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  type: string; // Changed from category to type
  appId: string; // Added create-app ID
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  type?: string; // Changed from category to type
  status?: 'complete' | 'incomplete'; // Changed status options
}

export interface ProductResponse {
  success: boolean;
  message?: string;
  data?: Product;
  error?: string;
}