import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

export const delete_products_from_stores = async (
  req: Request,
  res: Response
) => {
  try {
    /*-------------Delete Products--------------*/
    const { data } = await axios.get(
      `https://${STORE}/admin/api/${API_VERSION}/products.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
        },
      }
    );

    const store_products = data.products;

    console.log(store_products);

    await Promise.all(
      store_products.map(async (del: any) => {
        await axios.delete(
          `https://${STORE}/admin/api/${API_VERSION}/products/${del.id}.json`,
          {
            headers: {
              "X-Shopify-Access-Token": ACCESS_TOKEN!,
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
