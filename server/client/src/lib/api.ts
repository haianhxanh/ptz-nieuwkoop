import axios from "axios";
import { authService } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const authHeader = authService.getAuthHeader();
  if (authHeader) {
    config.headers.Authorization = authHeader;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  },
);

// Types
export type OfferStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface Customer {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
}

export interface LineItem {
  product_id?: string;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  total: number;
  image?: string;
}

export interface Offer {
  id: string;
  simple_id: number;
  customer_id: string;
  customer: Customer;
  title: string;
  description?: string;
  items?: LineItem[];
  subtotal: number;
  items_discount?: number;
  order_discount?: number;
  discount?: number;
  tax?: number;
  total: number;
  currency: string;
  status: OfferStatus;
  valid_until?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  price: string;
  image: string;
  brand: string;
  collection: string;
}

// API functions
export const offersApi = {
  list: async () => {
    const response = await apiClient.get<{ success: boolean; data: Offer[] }>("/api/offers");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<{ success: boolean; data: Offer }>(`/api/offers/${id}`);
    return response.data;
  },

  create: async (data: {
    customer: Customer;
    title: string;
    description?: string;
    items?: LineItem[];
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    currency?: string;
    status?: OfferStatus;
    notes?: string;
  }) => {
    const response = await apiClient.post<{ success: boolean; data: Offer }>("/api/offers", data);
    return response.data;
  },

  addItems: async (id: string, items: LineItem[]) => {
    const response = await apiClient.post<{ success: boolean; data: Offer }>(`/api/offers/${id}/items`, { items });
    return response.data;
  },

  update: async (id: string, data: Partial<Offer>) => {
    const response = await apiClient.put<{ success: boolean; data: Offer }>(`/api/offers/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<{ success: boolean }>(`/api/offers/${id}`);
    return response.data;
  },

  listCustomers: async () => {
    const response = await apiClient.get<{ success: boolean; data: Customer[] }>("/api/offers/customers");
    return response.data;
  },

  updateCustomer: async (id: string, data: Partial<Customer>) => {
    const response = await apiClient.put<{ success: boolean; data: Customer }>(`/api/offers/customers/${id}`, data);
    return response.data;
  },
};

export const productsApi = {
  list: async () => {
    const response = await apiClient.get<{ products: any[] }>("/get-products");
    return response.data;
  },
};

export const authApi = {
  testCredentials: async (username: string, password: string): Promise<boolean> => {
    try {
      const auth = btoa(`${username}:${password}`);
      const response = await axios.get(`${API_URL}/api/offers`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  },
};
