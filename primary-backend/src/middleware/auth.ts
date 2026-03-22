import type { ApiScope } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticateApiKeyRaw } from "../services/apiKeyService";

const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable must be set in production");
  }
  return "autochain-secret-key";
})();

export interface AuthRequest extends Request {
  userId?: string;
  /** Set when authenticated via `ak_...` API key. */
  authMethod?: "jwt" | "api_key";
  apiKeyId?: string;
  /** When set, key is restricted to this workspace only. */
  apiKeyWorkspaceId?: string | null;
  apiKeyScopes?: ApiScope[];
}

export const DEV_USER_ID = "dev-user-00000000";

/** True if key has ADMIN or any of the required scopes (OR semantics). */
function scopesAllow(userScopes: ApiScope[], required: ApiScope[]): boolean {
  if (userScopes.includes("ADMIN")) {
    return true;
  }
  if (required.length === 0) {
    return true;
  }
  return required.some((r) => userScopes.includes(r));
}

/** Attach user from JWT / dev token. Returns false if invalid. */
export function attachJwtUser(req: AuthRequest, token: string): boolean {
  const t = token.trim();
  if (t === "dev-demo-token" && process.env.NODE_ENV !== "production") {
    req.userId = DEV_USER_ID;
    req.authMethod = "jwt";
    return true;
  }
  try {
    const decoded = jwt.verify(t, JWT_SECRET) as { id: string };
    req.userId = decoded.id;
    req.authMethod = "jwt";
    return true;
  } catch {
    return false;
  }
}

/**
 * Accepts either:
 * - `Authorization: Bearer <JWT>` (same as authMiddleware; no scope check)
 * - `X-Api-Key: ak_...` or `Authorization: Bearer ak_...` (requires listed scopes)
 */
export function dualAuthMiddleware(requiredScopes: ApiScope[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const headerVal = req.headers["x-api-key"];
    const xApiKey =
      typeof headerVal === "string"
        ? headerVal
        : Array.isArray(headerVal)
          ? headerVal[0]
          : undefined;
    const authRaw = req.headers.authorization;
    const bearer =
      authRaw?.startsWith("Bearer ") ? authRaw.slice(7).trim() : authRaw?.trim() || "";

    const rawKey =
      (xApiKey && xApiKey.trim()) || (bearer.startsWith("ak_") ? bearer : "");

    if (rawKey) {
      const auth = await authenticateApiKeyRaw(rawKey);
      if (!auth) {
        return res.status(401).json({ error: "Invalid or expired API key" });
      }
      if (!scopesAllow(auth.scopes, requiredScopes)) {
        return res.status(403).json({
          error: "Insufficient API key scope",
          required: requiredScopes,
          hint: "Add READ and/or EXECUTE (or ADMIN) when creating the API key.",
        });
      }
      req.userId = auth.userId;
      req.authMethod = "api_key";
      req.apiKeyId = auth.apiKeyId;
      req.apiKeyWorkspaceId = auth.workspaceId;
      req.apiKeyScopes = auth.scopes;
      return next();
    }

    if (!authRaw) {
      return res.status(401).json({
        error: "Authentication required",
        hint: "Use Authorization: Bearer <JWT>, X-Api-Key: ak_..., or Authorization: Bearer ak_...",
      });
    }

    const jwtToken = authRaw.startsWith("Bearer ")
      ? authRaw.slice(7).trim()
      : authRaw.trim();
    if (!attachJwtUser(req, jwtToken)) {
      return res.status(401).json({ error: "Invalid token" });
    }
    return next();
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const raw = req.headers.authorization;

  if (!raw) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;

  if (!attachJwtUser(req, token)) {
    return res.status(401).json({ error: "Invalid token" });
  }
  next();
};

export const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

export { JWT_SECRET };
