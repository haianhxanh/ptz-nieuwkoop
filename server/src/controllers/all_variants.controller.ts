import { Request, Response } from "express";
import { products } from "../data_storage/sample_data";
import axios from "axios";
import { promisify } from "util";
const sleep = promisify(setTimeout);
import dotenv from "dotenv";
import { allVariants } from "../utilities/helper";

dotenv.config();

const { PTZ_STORE_URL, PTZ_ACCESS_TOKEN } = process.env;

export const all_variants = async (req: Request, res: Response) => {
  try {
    const query = "tag:'Nieuwkoop'";
    const variants = await allVariants(
      query,
      PTZ_STORE_URL as string,
      PTZ_ACCESS_TOKEN as string
    );
    res.status(200).json({ variants });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
