import { Request, Response } from "express";
import axios from "axios";

export const imageProxy = async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url || !url.startsWith("https://images.nieuwkoop-europe.com/")) {
    return res.status(400).json({ error: "Invalid URL" });
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
