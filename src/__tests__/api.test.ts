import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
import {
  fetchMonthData,
  fetchAvailableMonths,
  fetchOpsCosts,
  updateOpsCostApi,
  uploadFile,
  fetchRangeData,
} from "../lib/api";

beforeEach(() => {
  mockFetch.mockClear();
});

describe("fetchMonthData", () => {
  it("calls correct endpoint with month parameter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rows: [{ date: "2026-01-01", spend: 100 }] }),
    });

    const result = await fetchMonthData("2026-01");
    expect(mockFetch).toHaveBeenCalledWith("/api/data?month=2026-01", expect.objectContaining({ credentials: "include" }));
    // encodeURIComponent("2026-01") === "2026-01" for valid month strings
    expect(result).toHaveLength(1);
    expect(result[0].spend).toBe(100);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchMonthData("2026-01")).rejects.toThrow("Failed to fetch data");
  });
});

describe("fetchAvailableMonths", () => {
  it("returns array of month strings", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ months: ["2026-02", "2026-01"] }),
    });

    const result = await fetchAvailableMonths();
    expect(result).toEqual(["2026-02", "2026-01"]);
    expect(mockFetch).toHaveBeenCalledWith("/api/data/months", expect.objectContaining({ credentials: "include" }));
  });
});

describe("fetchOpsCosts", () => {
  it("returns costs object", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ costs: { Ondoxa: 50 } }),
    });

    const result = await fetchOpsCosts("2026-01");
    expect(result).toEqual({ Ondoxa: 50 });
  });
});

describe("updateOpsCostApi", () => {
  it("sends PUT request with correct body", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await updateOpsCostApi("Ondoxa", "2026-01", 75);
    expect(mockFetch).toHaveBeenCalledWith("/api/ops", expect.objectContaining({
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_label: "Ondoxa", month: "2026-01", cost: 75 }),
    }));
  });

  it("throws on failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(updateOpsCostApi("x", "2026-01", 0)).rejects.toThrow();
  });
});

describe("uploadFile", () => {
  it("sends file via FormData", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ upserted: 100, message: "OK" }),
    });

    const file = new File(["data"], "test.json", { type: "application/json" });
    const result = await uploadFile(file);
    expect(result.upserted).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith("/api/upload", expect.objectContaining({ method: "POST", credentials: "include" }));
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Invalid file" }),
    });

    const file = new File(["bad"], "bad.json", { type: "application/json" });
    await expect(uploadFile(file)).rejects.toThrow("Invalid file");
  });
});

describe("fetchRangeData", () => {
  it("calls range endpoint with from/to params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rows: [{ month: "2026-01", spend: 100 }] }),
    });

    const result = await fetchRangeData("2025-06", "2026-01");
    expect(mockFetch).toHaveBeenCalledWith("/api/data/range?from=2025-06&to=2026-01", expect.objectContaining({ credentials: "include" }));
    expect(result).toHaveLength(1);
  });
});

