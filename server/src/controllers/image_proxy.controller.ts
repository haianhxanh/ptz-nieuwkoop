import { Request, Response } from "express";
import axios from "axios";

const ALLOWED_HOSTS = ["images.nieuwkoop-europe.com", "cdn.shopify.com", "dmp.cz"];

export const imageProxy = async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`))) {
    return res.status(400).json({ error: "Host not allowed" });
  }

  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
    const contentType = response.headers["content-type"] || "image/jpeg";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    return res.send(response.data);
  } catch {
    return res.status(404).send();
  }
};
