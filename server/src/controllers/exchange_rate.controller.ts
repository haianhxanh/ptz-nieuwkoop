import { Request, Response } from "express";
import { configService } from "../services/config.service";
import axios from "axios";

export const exchangeRate = async (req: Request, res: Response) => {
  try {
    const todayFormatted = new Date().toISOString().split("T")[0];

    const lastUpdateDate = await configService.getExchangeRateLastUpdated();

    if (lastUpdateDate !== todayFormatted) {
      console.log("Exchange rate not from today, fetching fresh rate...");

      try {
        const url = "https://data.kurzy.cz/json/meny/b[6].json";
        const response = await axios.get(url);
        const jsonResponse = await response.data;
        const eurRate = jsonResponse?.kurzy?.EUR?.dev_stred || 25.0;

        if (eurRate) {
          await configService.setExchangeRate(parseFloat(eurRate));
          return res.status(200).json({
            success: true,
            data: {
              rate: parseFloat(eurRate),
              source: "ČNB",
              updated: true,
            },
          });
        }

        throw new Error("Could not parse exchange rate");
      } catch (fetchError) {
        console.log("Could not fetch fresh rate, using stored rate");
      }
    }

    const rate = await configService.getExchangeRate();

    return res.status(200).json({
      success: true,
      data: {
        rate,
        source: "ČNB",
        updated: false,
      },
    });
  } catch (error) {
    console.error("Error getting exchange rate:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get exchange rate",
    });
  }
};
