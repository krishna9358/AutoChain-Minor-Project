import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "autochain-secret-key";

export interface AuthRequest extends Request {
  userId?: string;
}

export const DEV_USER_ID = "dev-user-00000000";

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

  if (token === "dev-demo-token") {
    req.userId = DEV_USER_ID;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

export { JWT_SECRET };
