import type { Request, Response, NextFunction } from "express";

const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = requests.get(key);

    if (!record || now > record.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({ error: "Trop de tentatives. Réessayez plus tard." });
    }

    record.count++;
    next();
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requests) {
    if (now > record.resetAt) requests.delete(key);
  }
}, 60_000);
