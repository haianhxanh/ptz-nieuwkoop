import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

const { CF_AUTH_ENABLED } = process.env;

declare global {
  namespace Express {
    interface Request {
      userEmail?: string;
    }
  }
}

function getAuthenticatedEmail(req: Request): string | undefined {
  const emailHeader = req.headers["cf-access-authenticated-user-email"];
  if (typeof emailHeader === "string" && emailHeader.trim()) {
    return emailHeader.trim();
  }
  return undefined;
}

export const clientAuth = (req: Request, res: Response, next: NextFunction) => {
  if (CF_AUTH_ENABLED !== "true") {
    req.userEmail = process.env.DEV_USER_EMAIL || "dev@local";
    return next();
  }

  const email = getAuthenticatedEmail(req);

  if (!email) {
    return res.status(401).json({ error: "Unauthorized: Missing Cloudflare authenticated user header" });
  }

  req.userEmail = email;
  next();
};
