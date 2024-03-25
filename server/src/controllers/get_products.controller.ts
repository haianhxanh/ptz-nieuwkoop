import { Request, Response } from "express";
import { products } from "../data_storage/sample_data";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { NIEUWKOOP_API_ENDPOINT, NIEUWKOOP_USERNAME, NIEUWKOOP_PASSWORD } =
  process.env;

export const get_products = async (req: Request, res: Response) => {
  try {
    /*---------------Getting Products from other stores---------------------*/

    // Get products from Nieuwkoop API
    console.log(req.headers.origin);

    // check origin

    const auth = Buffer.from(
      `${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`
    ).toString("base64");

    const api_products = await axios.get(NIEUWKOOP_API_ENDPOINT || "", {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      timeout: 15000,
    });

    let products = api_products.data.filter(
      (product: any) => product.ProductGroupDescription_EN == "Planters"
    );

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error downloading products:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
