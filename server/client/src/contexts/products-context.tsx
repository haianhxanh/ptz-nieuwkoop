"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { productsApi, exchangeRateApi, type Product } from "@/lib/api";

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

const CACHE_KEY = "products_cache";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CachedData {
  products: Product[];
  timestamp: number;
}

function parsePriceEur(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const str = String(value).trim().replace(",", ".");
  const n = parseFloat(str);
  return Number.isNaN(n) ? 0 : n;
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const cachedData: CachedData = JSON.parse(cached);
          const now = Date.now();

          if (now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached products");
            setProducts(cachedData.products);
            setLoading(false);
            return;
          }
        }
      }

      console.log("Fetching fresh products from API");
      const [data, { rate: exchangeRate }] = await Promise.all([productsApi.list(), exchangeRateApi.get()]);

      console.log(data.products[0]);

      if (data.products && Array.isArray(data.products)) {
        const rate = Number(exchangeRate) || 25;
        const mapped = data.products.map((product: any) => {
          const unitPriceEur = parsePriceEur(product.Salesprice ?? product.salesprice);
          const unitPrice = Math.round(unitPriceEur * rate * 100) / 100;
          return {
            id: product.Itemcode,
            title: product.Description,
            sku: product.Itemcode,
            brand: product.Tags.find((tag: any) => tag.Code === "Brand")?.Values[0]?.Description_EN || "",
            unit_price_eur: unitPriceEur,
            unit_price: unitPrice,
            price: unitPrice.toFixed(2),
            collection: product.Tags.find((tag: any) => tag.Code === "Collection")?.Values[0]?.Description_EN || "",
            image: "https://images.nieuwkoop-europe.com/images/" + product.ItemPictureName,
            dimensions: {
              height: product.Height,
              depth: product.Depth,
              diameter: product.Diameter,
              opening: product.Opening,
              length: product.Length,
            },
          };
        });

        setProducts(mapped);

        const cacheData: CachedData = {
          products: mapped,
          timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch (err) {
      console.error("Error loading products:", err);
      setError("Nepodařilo se načíst produkty");
    } finally {
      setLoading(false);
    }
  };

  const refreshProducts = async () => {
    await loadProducts(true);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return <ProductsContext.Provider value={{ products, loading, error, refreshProducts }}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}
