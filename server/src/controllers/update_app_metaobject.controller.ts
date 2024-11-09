import { Request, Response } from "express";
import { products } from "../data_storage/sample_data";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { PTZ_ACCESS_TOKEN, PTZ_STORE_URL, API_VERSION } = process.env;

export const update_app_metaobject = async (req: Request, res: Response) => {
  let metaobject = {
    fields: req.body.fields,
    capabilities: {
      publishable: {
        status: "ACTIVE",
      },
    },
    handle: "nieuwkoop-data",
  };
  console.log(metaobject);

  try {
    const query = `
        mutation updateMetaobject($id: ID!, $metaobject: MetaobjectInput!) {
          metaobjectUpdate(id: $id, metaobject: $metaobject) {
            id
            fields {
              key
              value
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
        query,
        variables: {
          id: req.body.id,
          metaobject: metaobject,
        },
      },
    });
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
