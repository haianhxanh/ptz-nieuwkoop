import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { PTZ_ACCESS_TOKEN, PTZ_STORE_URL, API_VERSION } = process.env;

export const delete_products_from_stores = async (
  req: Request,
  res: Response
) => {
  try {
    /*-------------Delete Products--------------*/
    const { data } = await axios.get(
      `https://${PTZ_STORE_URL}/admin/api/${API_VERSION}/products.json`,
      {
        headers: {
          "X-Shopify-Access-Token": PTZ_ACCESS_TOKEN!,
        },
      }
    );

    const ptz_store_url_products = data.products;

    await Promise.all(
      ptz_store_url_products.map(async (del: any) => {
        await axios.delete(
          `https://${PTZ_STORE_URL}/admin/api/${API_VERSION}/products/${del.id}.json`,
          {
            headers: {
              "X-Shopify-Access-Token": PTZ_ACCESS_TOKEN!,
            },
          }
        );
      })
    );
    return res.status(200).json({
      messsage: `All products have been deleted.`,
    });
  } catch (error) {
    console.error("Error deleting products:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
