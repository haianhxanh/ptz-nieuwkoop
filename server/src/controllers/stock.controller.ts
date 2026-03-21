import { Request, Response } from "express";
import DmpProductStock from "../model/dmp_product_stock.model";
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
    const stock = await DmpProductStock.findAll();
    const stockMap: Record<string, { stockAvailable: number; firstAvailable: string | null }> = {};

    for (const s of stock) {
      const data = s.get();
      stockMap[data.itemcode] = {
        stockAvailable: Number(data.stockAvailable),
        firstAvailable: data.firstAvailable ? new Date(data.firstAvailable).toISOString() : null,
      };
    }

    return res.status(200).json({ stock: stockMap });
  } catch (error) {
    console.error("Error fetching stock:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
