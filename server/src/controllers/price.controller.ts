import { Request, Response } from "express";
import DmpProductPrice from "../model/dmp_product_price.model";
import { syncAllPrices } from "./price_sync.controller";

export const triggerPriceSync = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ message: "Price sync started" });
    await syncAllPrices();
  } catch (error) {
    console.error("Error triggering price sync:", error);
  }
};

export const getPrices = async (_req: Request, res: Response) => {
  try {
    const prices = await DmpProductPrice.findAll();
    const priceMap: Record<
      string,
      {
        priceGross: number;
        discountPercentage: number;
        priceNett: number;
        sysmodified: string | null;
      }
    > = {};

    for (const p of prices) {
      const data = p.get();
      priceMap[data.itemCode] = {
        priceGross: Number(data.priceGross),
        discountPercentage: Number(data.discountPercentage),
        priceNett: Number(data.priceNett),
        sysmodified: data.sysmodified ? new Date(data.sysmodified).toISOString() : null,
      };
    }

    return res.status(200).json({ prices: priceMap });
  } catch (error) {
    console.error("Error fetching prices:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
