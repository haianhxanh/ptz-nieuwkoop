import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { createRemoteJWKSet, jwtVerify } from "jose";

dotenv.config();

const { CF_TEAM_DOMAIN, CF_AUTH_ENABLED, CF_ACCESS_AUD } = process.env;

function getTeamDomainUrl(): URL | null {
  if (!CF_TEAM_DOMAIN) return null;
  const rawValue = CF_TEAM_DOMAIN.startsWith("http") ? CF_TEAM_DOMAIN : `https://${CF_TEAM_DOMAIN}`;
  return new URL(rawValue);
}

const TEAM_DOMAIN_URL = getTeamDomainUrl();
const JWKS = TEAM_DOMAIN_URL ? createRemoteJWKSet(new URL("/cdn-cgi/access/certs", TEAM_DOMAIN_URL)) : null;

declare global {
  namespace Express {
    interface Request {
      userEmail?: string;
    }
  }
}

function getCFToken(req: Request): string | undefined {
  const jwtAssertion = req.headers["cf-access-jwt-assertion"];
  if (typeof jwtAssertion === "string" && jwtAssertion.trim()) {
    return jwtAssertion.trim();
  }

  const cookieHeader = req.headers["cookie"] || "";
  const cfCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("CF_Authorization="))
    ?.split("=")[1];

  if (cfCookie) {
    return cfCookie;
  }

  return undefined;
}

export const clientAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (CF_AUTH_ENABLED !== "true") {
    req.userEmail = process.env.DEV_USER_EMAIL || "dev@local";
    return next();
  }

  if (!TEAM_DOMAIN_URL || !JWKS || !CF_ACCESS_AUD) {
    console.error("Cloudflare Access auth is misconfigured");
    return res.status(500).json({ error: "Auth misconfiguration" });
  }

  const token = getCFToken(req);

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing Cloudflare Access token" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: TEAM_DOMAIN_URL.origin,
      audience: CF_ACCESS_AUD,
    });
    req.userEmail = (payload.email as string) || (payload.sub as string);
    next();
  } catch (err) {
    let decodedPayload: unknown = null;

    try {
      decodedPayload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    } catch {
      decodedPayload = "Unable to decode token payload";
    }

    console.error("CF JWT verification failed:", err);
    console.error("CF auth debug", {
      host: req.headers.host,
      hasJwtAssertion: !!req.headers["cf-access-jwt-assertion"],
      issuerExpected: TEAM_DOMAIN_URL.origin,
      audienceExpected: CF_ACCESS_AUD,
      payload: decodedPayload,
    });
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
