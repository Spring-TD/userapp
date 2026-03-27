// Product API helper functions with authentication

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const productApi = {
  // Create a new product
  // P2-005 fix: always include isActive:true and status:'active' to prevent type mismatch
  async createProduct(productData: {
    name: string;
    description: string;
    type: string;
    appId: string;
    status?: string;
    isActive?: boolean;
    [key: string]: any;
  }) {
    const payload = {
      ...productData,
      // Normalize field names — some backends use isActive, others use status
      isActive: productData.isActive !== false, // default true
      status: productData.status || 'active',   // default 'active' (some backends use 'incomplete'/'complete')
    };

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create product');
    }

    return data;
  },

  // Get products by app ID
  async getProductsByAppId(appId: string) {
    const response = await fetch(`/api/products?appId=${appId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch products');
    }

    return data;
  },

  // Get product by ID
  async getProductById(productId: string) {
    const response = await fetch(`/api/product/${productId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch product');
    }

    return data;
  },

  // Update product
  async updateProduct(productId: string, updates: any) {
    const response = await fetch(`/api/product/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update product');
    }

    return data;
  },

  // Delete product
  async deleteProduct(productId: string) {
    const response = await fetch(`/api/product/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete product');
    }

    return data;
  },

  // Get product configuration
  async getProductConfiguration(productId: string) {
    const response = await fetch(`/api/product/${productId}/configuration`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    // Don't throw error for 404 - configuration might not exist yet
    if (!response.ok && response.status !== 404) {
      throw new Error(data.error || 'Failed to fetch configuration');
    }

    return data;
  },

  // Create or update product configuration
  async saveProductConfiguration(productId: string, productType: string, configuration: any) {
    const response = await fetch(`/api/product/${productId}/configuration`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        productId,
        productType,
        configuration,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save configuration');
    }

    return data;
  },

  // Toggle product active status
  async toggleProductStatus(productId: string, isActive: boolean) {
    return this.updateProduct(productId, { isActive });
  },

  // Get all products (no appId filter)
  async getAllProducts() {
    const response = await fetch('/api/products', {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch products');
    }

    return data;
  },

  // Get all products from Product Builder (global pool)
  async getAllProductsFromBuilder() {
    const response = await fetch('/api/product-builder/all', {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch products from Product Builder');
    }

    return data;
  },

  // Get app-product activations for a specific app
  async getAppProductActivations(appId: string) {
    const response = await fetch(`/api/apps/${appId}/products`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch app product activations');
    }

    return data;
  },

  // Toggle product activation for an app
  async toggleAppProductActivation(appId: string, productId: string, isActive: boolean) {
    const response = await fetch(`/api/apps/${appId}/products/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to toggle product activation');
    }

    return data;
  },
};
