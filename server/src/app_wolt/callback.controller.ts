import { Request, Response } from "express";
import { getWoltAccessToken } from "./wolt.service";

export const wolt_callback = async (req: Request, res: Response) => {
  console.log("Wolt callback received:", {
    query: req.query,
    headers: req.headers,
    method: req.method,
    url: req.url,
  });

  const { code } = req.query;

  if (!code || typeof code !== "string") {
    console.log("Missing or invalid authorization code");
    return res.status(400).send("Missing authorization code");
  }

  try {
    console.log("Received code from Wolt:", code);

    const accessToken = await getWoltAccessToken(code);
    console.log("Access token obtained:", accessToken);

    // TODO: Save accessToken securely (DB/session) for future API calls

    res.send("Authorization successful! You can close this window.");
  } catch (error) {
    console.error("Wolt callback error:", error);
    res.status(500).send("Authorization failed");
  }
};
