export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
}

export interface Invitation {
  id: number;
  email: string;
  token: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  invited_by_name: string | null;
}

const BASE = "/api/auth";

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data as T;
}

export async function login(email: string, password: string): Promise<{ success: boolean; user: User }> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/logout`, { method: "POST", credentials: "include" });
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch(`${BASE}/me`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function verifyInvitation(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE}/verify-invitation/${token}`);
    return await res.json();
  } catch {
    return { valid: false, error: "Erreur de connexion" };
  }
}

export async function register(
  token: string,
  name: string,
  password: string
): Promise<{ success: boolean; user: User }> {
  const res = await fetch(`${BASE}/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, name, password }),
  });
  return handleResponse(res);
}

export async function createInvitation(email: string): Promise<{ invitationUrl: string; email: string; expiresAt: string }> {
  const res = await fetch(`${BASE}/invite`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

export async function fetchInvitations(): Promise<Invitation[]> {
  const res = await fetch(`${BASE}/invitations`, { credentials: "include" });
  const data = await handleResponse<{ invitations: Invitation[] }>(res);
  return data.invitations;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${BASE}/users`, { credentials: "include" });
  const data = await handleResponse<{ users: User[] }>(res);
  return data.users;
}
