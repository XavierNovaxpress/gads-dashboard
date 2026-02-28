import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../db.js";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required.");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "7d";

export function generateJWT(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie("auth_token", { path: "/" });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const result = await pool.query(
      "SELECT is_admin FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    console.error("adminOnly check failed:", err);
    return res.status(500).json({ error: "Authorization check failed" });
  }
}
