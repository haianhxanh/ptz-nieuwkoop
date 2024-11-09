import { Request, Response } from "express";
import { products } from "../data_storage/sample_data";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { PTZ_ACCESS_TOKEN, PTZ_STORE_URL, API_VERSION } = process.env;

export const get_app_metaobject = async (req: Request, res: Response) => {
  try {
    const query = `
        query {
          metaobjectByHandle(handle: {handle: "nieuwkoop-data", type: "nieuwkoop"}) {
            id
            fields {
              key
              value
            }
          }
        }
      `;

    const response = await axios({
      url: `https://${PTZ_STORE_URL}/admin/api/${API_VERSION}/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": PTZ_ACCESS_TOKEN,
      },
      data: {
        query: query,
      },
    });
    console.log(response.data.data.metaobjectByHandle);

    return res.status(200).json(response.data.data.metaobjectByHandle);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
