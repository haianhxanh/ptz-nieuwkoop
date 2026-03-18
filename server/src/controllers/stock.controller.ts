import { Request, Response } from "express";
import ProductStock from "../model/product_stock.model";
import { syncAllStock } from "./stock_sync.controller";

export const triggerStockSync = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ message: "Stock sync started" });
    await syncAllStock();
  } catch (error) {
    console.error("Error triggering stock sync:", error);
  }
};

export const getStock = async (_req: Request, res: Response) => {
  try {
    const stock = await ProductStock.findAll();
    const stockMap: Record<string, { stock_available: number; first_available: string | null }> = {};

    for (const s of stock) {
      const data = s.get();
      stockMap[data.itemcode] = {
        stock_available: Number(data.stock_available),
        first_available: data.first_available ? new Date(data.first_available).toISOString() : null,
      };
    }

    return res.status(200).json({ stock: stockMap });
  } catch (error) {
    console.error("Error fetching stock:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
