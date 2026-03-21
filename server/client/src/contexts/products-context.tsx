"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { productsApi, exchangeRateApi, stockApi, type Product, type StockMap } from "@/lib/api";

interface ProductsContextType {
  products: Product[];
  stockMap: StockMap;
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
  const [stockMap, setStockMap] = useState<StockMap>({});
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
            stockApi
              .getAll()
              .then(setStockMap)
              .catch(() => {});
            setLoading(false);
            return;
          }
        }
      }

      console.log("Fetching fresh products from API");
      const [data, { rate: exchangeRate, nieuwkoopDiscount }, stock] = await Promise.all([
        productsApi.list(),
        exchangeRateApi.get(),
        stockApi.getAll().catch(() => ({}) as StockMap),
      ]);
      setStockMap(stock);

      if (data.products && Array.isArray(data.products)) {
        const rate = Number(exchangeRate) || 25;
        const discountMultiplier = 1 - (Number(nieuwkoopDiscount) || 0) / 100;
        const mapped = data.products.map((product: any) => {
          const unitCostEur = Math.round(parsePriceEur(product.Salesprice ?? product.salesprice) * discountMultiplier * 100) / 100;
          const unitCost = Math.round(unitCostEur * rate * 100) / 100;
          const vatRate = product.MainGroupDescription_EN === "Planten" ? 12 : 21;
          return {
            id: product.Itemcode,
            title: product.Description,
            sku: product.Itemcode,
            brand: product.Tags.find((tag: any) => tag.Code === "Brand")?.Values[0]?.Description_EN || "",
            unitCostEur,
            unitCost,
            price: unitCost.toFixed(2),
            collection: product.Tags.find((tag: any) => tag.Code === "Collection")?.Values[0]?.Description_EN || "",
            substrate: product.Tags.find((tag: any) => tag.Code === "SubstrateType")?.Values[0]?.Description_EN ?? null,
            image: "https://images.nieuwkoop-europe.com/images/" + product.ItemPictureName,
            vatRate,
            dimensions: {
              height: product.Height,
              depth: product.Depth,
              diameter: product.Diameter,
              opening: product.Opening,
              length: product.Length,
              potSize: product.PotSize,
            },
            deliveryTime: product.DeliveryTimeInDays,
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

  return <ProductsContext.Provider value={{ products, stockMap, loading, error, refreshProducts }}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}
