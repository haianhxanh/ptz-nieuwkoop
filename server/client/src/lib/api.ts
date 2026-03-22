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
      console.error("Unauthorized API request", {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        status: error.response?.status,
        data: error.response?.data,
      });
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

export interface Client {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  companyName?: string;
  companyIco?: string;
  companyDic?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LineItem {
  productId?: string;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unitCost: number;
  unitCostEur?: number;
  total: number;
  image?: string;
  vatRate?: number;
  dimensions?: {
    height?: number;
    depth?: number;
    diameter?: number;
    opening?: number;
    length?: number;
    potSize?: string;
  };
}

export interface ItemGroup {
  id: string;
  name: string;
  notes?: string;
  discount: number;
  discountType?: "fixed" | "percent";
  items: LineItem[];
}

export interface AdditionalItem {
  title: string;
  cost: number;
  price?: number;
}

export interface CompanyProfile {
  companyName: string;
  companyIco: string;
  companyDic: string;
  logoUrl?: string;
  fakturoidSlug?: string;
}

export interface Offer {
  id: string;
  simpleId: number;
  clientId: string;
  client: Client;
  title: string;
  description?: string;
  items?: ItemGroup[];
  additionalItems?: AdditionalItem[];
  subtotal: number;
  totalCost?: number;
  itemsDiscount?: number;
  orderDiscount?: number;
  discount?: number;
  tax?: number;
  total: number;
  totalRounded?: number | null;
  currency: string;
  exchangeRate?: number;
  status: OfferStatus;
  validUntil?: string;
  notes?: string;
  sellMultiplier?: number;
  companyProfile?: CompanyProfile | null;
  proformaUrl?: string;
  proformaId?: number;
  userId?: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  price: string;
  unitCost: number;
  unitCostEur: number;
  dimensions: {
    height: number;
    depth: number;
    diameter: number;
    opening: number;
    length: number;
    potSize: string;
  };
  image: string;
  brand: string;
  collection: string;
  substrate: string | null;
  vatRate: number;
  deliveryTime?: number;
}

export interface AppConfig {
  id?: string;
  key: string;
  value: string;
  description?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
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
    client: Client;
    title: string;
    description?: string;
    items?: ItemGroup[];
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    currency?: string;
    exchangeRate?: number;
    status?: OfferStatus;
    notes?: string;
  }) => {
    const response = await apiClient.post<{ success: boolean; data: Offer }>("/api/offers", data);
    return response.data;
  },

  addItems: async (id: string, items: LineItem[], groupId?: string) => {
    const response = await apiClient.post<{ success: boolean; data: Offer }>(`/api/offers/${id}/items`, { items, groupId });
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

  listClients: async () => {
    const response = await apiClient.get<{ success: boolean; data: Client[] }>("/api/offers/clients");
    return response.data;
  },

  createClient: async (data: Partial<Client>) => {
    const response = await apiClient.post<{ success: boolean; data: Client }>("/api/offers/clients", data);
    return response.data;
  },

  updateClient: async (id: string, data: Partial<Client>) => {
    const response = await apiClient.put<{ success: boolean; data: Client }>(`/api/offers/clients/${id}`, data);
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
  send_email?: boolean;
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

export const configsApi = {
  list: async () => {
    const response = await apiClient.get<{ success: boolean; data: AppConfig[] }>("/api/offers/configs");
    return response.data;
  },

  create: async (data: { key: string; value: string; description?: string }) => {
    const response = await apiClient.post<{ success: boolean; data: AppConfig }>("/api/offers/configs", data);
    return response.data;
  },

  update: async (key: string, data: { value: string; description?: string }) => {
    const response = await apiClient.put<{ success: boolean; data: AppConfig }>(`/api/offers/configs/${encodeURIComponent(key)}`, data);
    return response.data;
  },
};

export type StockMap = Record<string, { stockAvailable: number; firstAvailable: string | null }>;

export const stockApi = {
  getAll: async (): Promise<StockMap> => {
    const response = await apiClient.get<{ stock: StockMap }>("/api/stock");
    return response.data.stock;
  },
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let exchangeRateCache: {
  rate: number;
  nieuwkoopDiscount: number;
  company?: { name: string; ico: string; dic: string };
  companies?: CompanyProfile[];
  date: string | null;
  fetchedAt: number;
} | null = null;

export const exchangeRateApi = {
  get: async (): Promise<{
    rate: number;
    nieuwkoopDiscount: number;
    date: string | null;
    company: { name: string; ico: string; dic: string };
    companies: CompanyProfile[];
  }> => {
    const now = Date.now();
    if (exchangeRateCache && now - exchangeRateCache.fetchedAt < CACHE_TTL_MS) {
      return {
        rate: exchangeRateCache.rate,
        nieuwkoopDiscount: exchangeRateCache.nieuwkoopDiscount,
        date: exchangeRateCache.date,
        company: exchangeRateCache.company ?? { name: "", ico: "", dic: "" },
        companies: exchangeRateCache.companies ?? [],
      };
    }
    const response = await apiClient.get<{
      success: boolean;
      data: { rate: number; nieuwkoopDiscount: number; company: { name: string; ico: string; dic: string }; companies: CompanyProfile[]; date: string | null };
    }>("/api/offers/exchange-rate");
    const { rate, nieuwkoopDiscount, company, companies, date } = response.data.data;
    exchangeRateCache = {
      rate,
      nieuwkoopDiscount: nieuwkoopDiscount ?? 0,
      company: company ?? { name: "", ico: "", dic: "" },
      companies: companies ?? [],
      date,
      fetchedAt: now,
    };
    return { rate, nieuwkoopDiscount: nieuwkoopDiscount ?? 0, company: company ?? { name: "", ico: "", dic: "" }, companies: companies ?? [], date };
  },
};
