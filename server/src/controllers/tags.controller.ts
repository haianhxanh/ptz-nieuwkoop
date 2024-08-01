import { Request, Response } from "express";
import { products } from "../data_storage/sample_data";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { NIEUWKOOP_USERNAME, NIEUWKOOP_PASSWORD, NIEUWKOOP_API_TAGS } =
  process.env;

export const tags = async (req: Request, res: Response) => {
  try {
    const tags = await getNieukoopTags(req.params.sku);
    return res.status(200).json(tags);
  } catch (error) {
    return res.status(500).json({ error });
  }
};

async function getNieukoopTags(sku: any) {
  const auth = Buffer.from(
    `${NIEUWKOOP_USERNAME}:${NIEUWKOOP_PASSWORD}`
  ).toString("base64");

  let url: string = NIEUWKOOP_API_TAGS as string;

  const data = await axios.get(url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    timeout: 15000,
  });

  let tags = data.data;

  let tags_EN = tags.map((tag: any) => {
    return {
      TagCode: tag.TagCode,
      Description_DE: tag.Description_DE,
      WebDescription_DE: tag.WebDescription_DE,
      Values: tag.Values.map((value: any) => {
        let filteredValue: any = {};
        for (let key in value) {
          if (key.endsWith("_EN")) {
            filteredValue[key] = value[key];
          }
        }
        return filteredValue;
      }).map((value: any) => value.Description_EN),
    };
  });

  return tags_EN;
}
