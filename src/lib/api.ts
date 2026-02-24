const BASE = "/api";

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
  const res = await fetch(`${BASE}/data?month=${month}`);
  if (!res.ok) throw new Error("Failed to fetch data");
  const json = await res.json();
  return json.rows;
}

export async function fetchAvailableMonths(): Promise<string[]> {
  const res = await fetch(`${BASE}/data/months`);
  if (!res.ok) throw new Error("Failed to fetch months");
  const json = await res.json();
  return json.months;
}

export async function fetchOpsCosts(month: string): Promise<Record<string, number>> {
  const res = await fetch(`${BASE}/ops?month=${month}`);
  if (!res.ok) throw new Error("Failed to fetch ops costs");
  const json = await res.json();
  return json.costs;
}

export async function updateOpsCostApi(accountLabel: string, month: string, cost: number): Promise<void> {
  const res = await fetch(`${BASE}/ops`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_label: accountLabel, month, cost }),
  });
  if (!res.ok) throw new Error("Failed to update ops cost");
}

export async function postData(rows: RawRow[]): Promise<{ upserted: number }> {
  const res = await fetch(`${BASE}/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error("Failed to post data");
  return res.json();
}

export async function uploadFile(file: File): Promise<{ upserted: number; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

export async function refreshFromWindsor(month?: string): Promise<{ success: boolean; upserted: number; dateRange?: { from: string; to: string }; accounts?: number }> {
  const url = month ? `${BASE}/refresh?month=${month}` : `${BASE}/refresh`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Refresh failed");
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
  const res = await fetch(`${BASE}/data/range?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("Failed to fetch range data");
  const json = await res.json();
  return json.rows;
}

export async function healthCheck(): Promise<{ status: string; db: string }> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
