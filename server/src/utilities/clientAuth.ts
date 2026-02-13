import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

const { CLIENT_USERNAME, CLIENT_PASSWORD } = process.env;

export const clientAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader: any = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Client Authentication"');
      return res.status(401).send("401 Unauthorized: Missing or invalid authorization header.");
    }

    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
    const [username, password] = credentials.split(":");

    console.log("Client Auth attempt:", { username, providedPassword: password ? "***" : "empty" });
    console.log("Expected:", { username: CLIENT_USERNAME, expectedPassword: CLIENT_PASSWORD ? "***" : "empty" });

    if (username === CLIENT_USERNAME && password === CLIENT_PASSWORD) {
      next();
    } else {
      res.setHeader("WWW-Authenticate", 'Basic realm="Client Authentication"');
      return res.status(401).send("401 Unauthorized: Incorrect credentials.");
    }
  } catch (err) {
    console.error("Client Auth error:", err);
    res.setHeader("WWW-Authenticate", 'Basic realm="Client Authentication"');
    return res.status(401).send("401 Unauthorized: Authentication failed.");
  }
};
