import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Cloudflare Access will handle re-authentication
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

// Types
export type OfferStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface User {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
}

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
  company_name?: string;
  company_ico?: string;
  company_dic?: string;
}

export interface LineItem {
  product_id?: string;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  unit_price_eur?: number;
  total: number;
  image?: string;
  vat_rate?: number;
}

export interface ItemGroup {
  id: string;
  name: string;
  discount: number;
  discount_type?: "fixed" | "percent";
  items: LineItem[];
}

export interface AdditionalItem {
  title: string;
  price: number;
  sell_price?: number;
}

export interface CompanyProfile {
  company_name: string;
  company_ico: string;
  company_dic: string;
  logo_url?: string;
  fakturoid_slug?: string;
}

export interface Offer {
  id: string;
  simple_id: number;
  customer_id: string;
  customer: Customer;
  title: string;
  description?: string;
  items?: ItemGroup[];
  additional_items?: AdditionalItem[];
  subtotal: number;
  items_discount?: number;
  order_discount?: number;
  discount?: number;
  tax?: number;
  total: number;
  total_sell?: number;
  total_rounded?: number | null;
  currency: string;
  exchange_rate?: number;
  status: OfferStatus;
  valid_until?: string;
  notes?: string;
  sell_multiplier?: number;
  company_profile?: CompanyProfile | null;
  proforma_url?: string;
  proforma_id?: number;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  price: string;
  unit_price: number;
  unit_price_eur: number;
  dimensions: {
    height: number;
    depth: number;
    diameter: number;
    opening: number;
    length: number;
  };
  image: string;
  brand: string;
  collection: string;
  substrate: string | null;
  vat_rate: number;
  delivery_time?: number;
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
    items?: ItemGroup[];
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    currency?: string;
    exchange_rate?: number;
    status?: OfferStatus;
    notes?: string;
  }) => {
    const response = await apiClient.post<{ success: boolean; data: Offer }>("/api/offers", data);
    return response.data;
  },

  addItems: async (id: string, items: LineItem[], group_id?: string) => {
    const response = await apiClient.post<{ success: boolean; data: Offer }>(`/api/offers/${id}/items`, { items, group_id });
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

  duplicate: async (id: string) => {
    const response = await apiClient.post<{ success: boolean; data: Offer }>(`/api/offers/${id}/duplicate`);
    return response.data;
  },

  listCustomers: async () => {
    const response = await apiClient.get<{ success: boolean; data: Customer[] }>("/api/offers/customers");
    return response.data;
  },

  createCustomer: async (data: Partial<Customer>) => {
    const response = await apiClient.post<{ success: boolean; data: Customer }>("/api/offers/customers", data);
    return response.data;
  },

  updateCustomer: async (id: string, data: Partial<Customer>) => {
    const response = await apiClient.put<{ success: boolean; data: Customer }>(`/api/offers/customers/${id}`, data);
    return response.data;
  },
};

type ProformaPayload = {
  slug: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_street?: string;
  client_city?: string;
  client_zip?: string;
  client_country?: string;
  client_ico?: string;
  client_dic?: string;
  items: { name: string; quantity: number; unit_price: number; vat_rate: number }[];
  note?: string;
  due?: number;
};

type ProformaResponse = {
  success: boolean;
  invoice_id: number;
  invoice_number: string;
  html_url: string;
  public_html_url: string;
  pdf_url: string;
  data: any;
};

export const fakturoidApi = {
  createProforma: async (data: ProformaPayload) => {
    const response = await apiClient.post<ProformaResponse>("/api/fakturoid/invoice", data);
    return response.data;
  },
  updateProforma: async (id: number, data: ProformaPayload) => {
    const response = await apiClient.patch<ProformaResponse>(`/api/fakturoid/invoice/${id}`, data);
    return response.data;
  },
};

export const usersApi = {
  getMe: async () => {
    const response = await apiClient.get<{ success: boolean; data: User }>("/api/offers/me");
    return response.data;
  },
};

export const productsApi = {
  list: async () => {
    const response = await apiClient.get<{ products: any[] }>("/get-products");
    return response.data;
  },
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let exchangeRateCache: {
  rate: number;
  nieuwkoop_discount: number;
  company?: { name: string; ico: string; dic: string };
  companies?: CompanyProfile[];
  date: string | null;
  fetchedAt: number;
} | null = null;

export const exchangeRateApi = {
  get: async (): Promise<{ rate: number; nieuwkoop_discount: number; date: string | null; company: { name: string; ico: string; dic: string }; companies: CompanyProfile[] }> => {
    const now = Date.now();
    if (exchangeRateCache && now - exchangeRateCache.fetchedAt < CACHE_TTL_MS) {
      return {
        rate: exchangeRateCache.rate,
        nieuwkoop_discount: exchangeRateCache.nieuwkoop_discount,
        date: exchangeRateCache.date,
        company: exchangeRateCache.company ?? { name: "", ico: "", dic: "" },
        companies: exchangeRateCache.companies ?? [],
      };
    }
    const response = await apiClient.get<{
      success: boolean;
      data: { rate: number; nieuwkoop_discount: number; company: { name: string; ico: string; dic: string }; companies: CompanyProfile[]; date: string | null };
    }>("/api/offers/exchange-rate");
    const { rate, nieuwkoop_discount, company, companies, date } = response.data.data;
    exchangeRateCache = { rate, nieuwkoop_discount: nieuwkoop_discount ?? 0, company: company ?? { name: "", ico: "", dic: "" }, companies: companies ?? [], date, fetchedAt: now };
    return { rate, nieuwkoop_discount: nieuwkoop_discount ?? 0, company: company ?? { name: "", ico: "", dic: "" }, companies: companies ?? [], date };
  },
};
