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
  equityContribution?: number; // Equity contribution for mortgage products
  propertyValue?: number; // Property value for mortgage products
  // Commodity-specific fields
  price?: number; // Product price
  minimumQuantity?: number; // Minimum quantity
  unitOfMeasure?: string; // Unit of measurement
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
  equityContribution?: number; // Equity contribution for mortgage products
  propertyValue?: number; // Property value for mortgage products
  // Commodity-specific fields
  price?: number; // Product price
  minimumQuantity?: number; // Minimum quantity
  unitOfMeasure?: string; // Unit of measurement
}

export interface ProductResponse {
  success: boolean;
  message?: string;
  data?: Product;
  error?: string;
}

// New interface for selecting product type after receiving create-app ID
export interface SelectProductTypeRequest {
  appId: string;
  type: string;
}

// New interface for creating product after type selection
export interface CreateProductAfterTypeRequest {
  productId: string;
  name: string;
  description: string;
}