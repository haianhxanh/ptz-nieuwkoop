import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { NIEUWKOOP_API_ENDPOINT, NIEUWKOOP_USERNAME, NIEUWKOOP_PASSWORD } = process.env;

export const get_products = async (req: Request, res: Response) => {
  try {
    /*---------------Getting Products from other stores---------------------*/

    // Get products from Nieuwkoop API
    console.log(req.headers.origin);

    const auth = Buffer.from(`${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`).toString("base64");

    const api_products = await axios.get(NIEUWKOOP_API_ENDPOINT || "", {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      timeout: 60000,
    });

    let products = api_products.data.filter(
      (product: any) =>
        product.IsStockItem == true &&
        product.ItemStatus != "E" &&
        product.DeliveryTimeInDays != 999 &&
        product.ShowOnWebsite == true &&
        product.IsOffer == true,
    );

    console.log(products.length);

    // map through all products and update all values of ProductGroupDescription_EN if contains "Artificial" to "Artificial"
    products = products.map((product: any) => {
      if (product.ProductGroupDescription_EN?.includes("Artificial")) {
        product.ProductGroupDescription_EN = "Artificial";
      }
      return product;
    });

    products.sort((a: any, b: any) => {
      const dateA = a.Sysmodified ? new Date(a.Sysmodified).getTime() : 0;
      const dateB = b.Sysmodified ? new Date(b.Sysmodified).getTime() : 0;
      return dateB - dateA;
    });

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error downloading products:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
