const BASE = "/api";

// Authenticated fetch wrapper
function authFetch(url: string, opts?: RequestInit): Promise<Response> {
  return fetch(url, { ...opts, credentials: "include" });
}

export interface RawRow {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  average_cpc: number;
  ctr: number;
  account_name: string;
}

export async function fetchMonthData(month: string): Promise<RawRow[]> {
  const res = await authFetch(`${BASE}/data?month=${encodeURIComponent(month)}`);
  if (!res.ok) throw new Error("Failed to fetch data");
  const json = await res.json();
  return json.rows;
}

export async function fetchAvailableMonths(): Promise<string[]> {
  const res = await authFetch(`${BASE}/data/months`);
  if (!res.ok) throw new Error("Failed to fetch months");
  const json = await res.json();
  return json.months;
}

export async function fetchOpsCosts(month: string): Promise<Record<string, number>> {
  const res = await authFetch(`${BASE}/ops?month=${encodeURIComponent(month)}`);
  if (!res.ok) throw new Error("Failed to fetch ops costs");
  const json = await res.json();
  return json.costs;
}

export async function updateOpsCostApi(accountLabel: string, month: string, cost: number): Promise<void> {
  const res = await authFetch(`${BASE}/ops`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_label: accountLabel, month, cost }),
  });
  if (!res.ok) throw new Error("Failed to update ops cost");
}

export async function uploadFile(file: File): Promise<{ upserted: number; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authFetch(`${BASE}/upload`, { method: "POST", body: formData });
  if (!res.ok) {
    let msg = "Upload failed";
    try { const err = await res.json(); msg = err.error || msg; } catch { /* non-JSON response */ }
    throw new Error(msg);
  }
  return res.json();
}

export async function refreshFromWindsor(month?: string): Promise<{ success: boolean; upserted: number; dateRange?: { from: string; to: string }; accounts?: number }> {
  const url = month ? `${BASE}/refresh?month=${encodeURIComponent(month)}` : `${BASE}/refresh`;
  const res = await authFetch(url, { method: "POST" });
  if (!res.ok) {
    let msg = "Refresh failed";
    try { const err = await res.json(); msg = err.error || msg; } catch { /* non-JSON response */ }
    throw new Error(msg);
  }
  return res.json();
}

export interface RangeRow {
  month: string;
  account_name: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
}

export async function fetchRangeData(from: string, to: string): Promise<RangeRow[]> {
  const res = await authFetch(`${BASE}/data/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (!res.ok) throw new Error("Failed to fetch range data");
  const json = await res.json();
  return json.rows;
}

// ── MCC Account Management ───────────────────────────────────────────────────

export interface MccAccount {
  id: number;
  name: string;
  windsor_api_key_preview: string;
  created_at: string;
}

export interface ManagedAccount {
  id: number;
  mcc_id: number;
  mcc_name: string;
  label: string;
  cid: string;
  gname: string | null;
  group_name: string;
  sort_order: number;
  created_at: string;
}

export interface DiscoveredAccount {
  gname: string;
  total_spend: number;
}

export async function fetchMccs(): Promise<MccAccount[]> {
  const res = await authFetch(`${BASE}/mcc`);
  if (!res.ok) throw new Error("Failed to fetch MCCs");
  const json = await res.json();
  return json.mccs;
}

export async function createMcc(name: string, windsor_api_key: string): Promise<MccAccount> {
  const res = await authFetch(`${BASE}/mcc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, windsor_api_key }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create MCC");
  }
  const json = await res.json();
  return json.mcc;
}

export async function deleteMcc(mccId: number): Promise<void> {
  const res = await authFetch(`${BASE}/mcc/${mccId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete MCC");
}

export async function discoverMccAccounts(mccId: number): Promise<{ accounts: DiscoveredAccount[]; dateRange: { from: string; to: string } }> {
  const res = await authFetch(`${BASE}/mcc/${mccId}/discover`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Discovery failed");
  }
  return res.json();
}

export async function fetchManagedAccounts(): Promise<ManagedAccount[]> {
  const res = await authFetch(`${BASE}/mcc/accounts`);
  if (!res.ok) throw new Error("Failed to fetch managed accounts");
  const json = await res.json();
  return json.accounts;
}

export async function addManagedAccount(
  mccId: number,
  data: { label: string; cid: string; gname: string | null; group_name: string; sort_order?: number }
): Promise<ManagedAccount> {
  const res = await authFetch(`${BASE}/mcc/${mccId}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to add account");
  }
  const json = await res.json();
  return json.account;
}

export async function bulkAddManagedAccounts(
  mccId: number,
  accounts: Array<{ label: string; cid: string; gname: string | null; group_name: string; sort_order?: number }>
): Promise<{ count: number }> {
  const res = await authFetch(`${BASE}/mcc/${mccId}/accounts/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accounts }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Bulk add failed");
  }
  return res.json();
}

export async function updateManagedAccount(
  accountId: number,
  data: Partial<{ label: string; cid: string; gname: string | null; group_name: string; sort_order: number }>
): Promise<ManagedAccount> {
  const res = await authFetch(`${BASE}/mcc/accounts/${accountId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update account");
  }
  const json = await res.json();
  return json.account;
}

export async function deleteManagedAccount(accountId: number): Promise<void> {
  const res = await authFetch(`${BASE}/mcc/accounts/${accountId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete account");
}
