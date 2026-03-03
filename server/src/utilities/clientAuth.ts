import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { createRemoteJWKSet, jwtVerify } from "jose";

dotenv.config();

const { CF_TEAM_DOMAIN, CF_AUTH_ENABLED, CF_ACCESS_AUD } = process.env;

const JWKS = CF_TEAM_DOMAIN ? createRemoteJWKSet(new URL(`https://${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`)) : null;

// Extend Express Request to carry the authenticated user's email
declare global {
  namespace Express {
    interface Request {
      userEmail?: string;
    }
  }
}

function getCFToken(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return req.headers["cf-authorization"] as string | undefined;
}

export const clientAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (CF_AUTH_ENABLED !== "true") {
    // In dev mode, fall back to a dev email so User records still work
    req.userEmail = process.env.DEV_USER_EMAIL || "dev@local";
    return next();
  }

  if (!JWKS) {
    console.error("CF_TEAM_DOMAIN is not set but CF_AUTH_ENABLED=true");
    return res.status(500).json({ error: "Auth misconfiguration" });
  }

  const token = getCFToken(req);

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing Cloudflare Access token" });
  }

  try {
    const verifyOptions: { algorithms: string[]; audience?: string } = { algorithms: ["RS256"] };
    if (CF_ACCESS_AUD) {
      verifyOptions.audience = CF_ACCESS_AUD;
    }
    const { payload } = await jwtVerify(token, JWKS, verifyOptions);
    req.userEmail = (payload.email as string) || (payload.sub as string);
    next();
  } catch (err) {
    console.error("CF JWT verification failed:", err);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
