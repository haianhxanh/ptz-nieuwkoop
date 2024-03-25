import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();
const { APP_USERNAME, APP_PASSWORD } = process.env;

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth: any = req.headers.authorization;

    const base64Credentials = auth.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "ascii"
    );
    const [username, password] = credentials.split(":");

    if (username === APP_USERNAME! && password === APP_PASSWORD!) {
      next();
    } else {
      res.setHeader(
        "WWW-Authenticate",
        'Basic realm="Authentication Required"'
      );
      return res.status(401).send("401 Unauthorized: Incorrect credentials.");
    }
  } catch (err) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Authentication Required"');
    return res.status(401).send("401 Unauthorized: Incorrect credentials.");
  }
};
