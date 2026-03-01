import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import pool from "../db.js";
import {
  authMiddleware,
  adminOnly,
  generateJWT,
  setAuthCookie,
  clearAuthCookie,
  type AuthUser,
} from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

export const authRouter = Router();

const INVITATION_EXPIRY_HOURS = 48;
const BCRYPT_ROUNDS = 12;

// Rate limit: 10 attempts per 15 minutes on auth endpoints
const authRateLimit = rateLimit(10, 15 * 60 * 1000);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
authRouter.post("/login", authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const result = await pool.query(
      "SELECT id, email, name, password_hash, is_admin FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
    };

    const token = generateJWT(authUser);
    setAuthCookie(res, token);
    res.json({ success: true, user: authUser });
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
authRouter.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ─── GET /api/auth/verify-invitation/:token ───────────────────────────────────
authRouter.get("/verify-invitation/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      "SELECT email FROM invitations WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.json({ valid: false, error: "Invitation invalide ou expir\u00e9e" });
    }

    res.json({ valid: true, email: result.rows[0].email });
  } catch (err) {
    console.error("GET /api/auth/verify-invitation error:", err);
    res.status(500).json({ valid: false, error: "Erreur serveur" });
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
authRouter.post("/register", authRateLimit, async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, name, password } = req.body;
    if (!token || !name || !password) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ error: "Le mot de passe doit contenir entre 8 et 72 caractères" });
    }

    await client.query("BEGIN");

    // Verify invitation
    const invResult = await client.query(
      "SELECT id, email FROM invitations WHERE token = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE",
      [token]
    );

    if (invResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invitation invalide ou expir\u00e9e" });
    }

    const invitation = invResult.rows[0];

    // Check user doesn't already exist
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [invitation.email]);
    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Un compte existe d\u00e9j\u00e0 avec cet email" });
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userResult = await client.query(
      "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, is_admin",
      [invitation.email, name.trim(), passwordHash]
    );

    const user = userResult.rows[0];

    // Mark invitation as used
    await client.query(
      "UPDATE invitations SET used_at = NOW(), used_by_user_id = $1 WHERE id = $2",
      [user.id, invitation.id]
    );

    await client.query("COMMIT");

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
    };

    const jwtToken = generateJWT(authUser);
    setAuthCookie(res, jwtToken);
    res.json({ success: true, user: authUser });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/auth/register error:", err);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  } finally {
    client.release();
  }
});

// ─── POST /api/auth/invite (admin only) ───────────────────────────────────────
authRouter.post("/invite", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Un utilisateur avec cet email existe d\u00e9j\u00e0" });
    }

    // Check if there's already a pending invitation
    const pendingInv = await pool.query(
      "SELECT id FROM invitations WHERE email = $1 AND used_at IS NULL AND expires_at > NOW()",
      [normalizedEmail]
    );
    if (pendingInv.rows.length > 0) {
      return res.status(400).json({ error: "Une invitation en attente existe d\u00e9j\u00e0 pour cet email" });
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

    await pool.query(
      "INSERT INTO invitations (token, email, invited_by, expires_at) VALUES ($1, $2, $3, $4)",
      [token, normalizedEmail, req.user!.id, expiresAt]
    );

    // Build invitation URL
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const invitationUrl = `${baseUrl}?invite=${token}`;

    res.json({
      success: true,
      invitationUrl,
      email: normalizedEmail,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("POST /api/auth/invite error:", err);
    res.status(500).json({ error: "Erreur lors de la cr\u00e9ation de l'invitation" });
  }
});

// ─── GET /api/auth/invitations (admin only) ───────────────────────────────────
authRouter.get("/invitations", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.id, i.email, i.created_at, i.expires_at, i.used_at, i.token,
             u.name AS invited_by_name
      FROM invitations i
      LEFT JOIN users u ON i.invited_by = u.id
      ORDER BY i.created_at DESC
      LIMIT 50
    `);
    res.json({ invitations: result.rows });
  } catch (err) {
    console.error("GET /api/auth/invitations error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/auth/users (admin only) ─────────────────────────────────────────
authRouter.get("/users", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error("GET /api/auth/users error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
