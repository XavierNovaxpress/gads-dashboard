import { describe, it, expect } from "vitest";
import {
  ACCOUNTS,
  GROUP_ORDER,
  GROUP_COLORS,
  getAccountByGname,
  getLabel,
  getGroup,
  FEE_RATE,
} from "../lib/accounts";

describe("ACCOUNTS config", () => {
  it("has 18 accounts", () => {
    expect(ACCOUNTS).toHaveLength(18);
  });

  it("each account has required fields", () => {
    for (const acct of ACCOUNTS) {
      expect(acct.label).toBeTruthy();
      expect(acct.cid).toMatch(/^\d{3}-\d{3}-\d{4}$/);
      expect(acct.group).toBeTruthy();
    }
  });

  it("has unique labels", () => {
    const labels = ACCOUNTS.map((a) => a.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("has unique CIDs", () => {
    const cids = ACCOUNTS.map((a) => a.cid);
    expect(new Set(cids).size).toBe(cids.length);
  });
});

describe("GROUP_ORDER", () => {
  it("has 5 groups", () => {
    expect(GROUP_ORDER).toHaveLength(5);
  });

  it("contains expected groups", () => {
    expect(GROUP_ORDER).toContain("Ondoxa");
    expect(GROUP_ORDER).toContain("Liremia");
    expect(GROUP_ORDER).toContain("Groupe Umami / Seablue");
    expect(GROUP_ORDER).toContain("Groupe Wizorg");
    expect(GROUP_ORDER).toContain("Autres");
  });
});

describe("GROUP_COLORS", () => {
  it("has a color for every group", () => {
    for (const group of GROUP_ORDER) {
      expect(GROUP_COLORS[group]).toBeDefined();
      expect(GROUP_COLORS[group]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("FEE_RATE", () => {
  it("is 5%", () => {
    expect(FEE_RATE).toBe(0.05);
  });
});

describe("getAccountByGname", () => {
  it("returns correct account for known gname", () => {
    const acct = getAccountByGname("Ondoxa - FollowTrust");
    expect(acct).toBeDefined();
    expect(acct!.label).toBe("Ondoxa");
    expect(acct!.group).toBe("Ondoxa");
  });

  it("returns undefined for unknown gname", () => {
    expect(getAccountByGname("nonexistent")).toBeUndefined();
  });

  it("returns undefined for null gname accounts", () => {
    // Accounts with null gname won't match any string
    expect(getAccountByGname("")).toBeUndefined();
  });
});

describe("getLabel", () => {
  it("returns label for known gname", () => {
    expect(getLabel("Ondoxa - FollowTrust")).toBe("Ondoxa");
  });

  it("returns gname itself for unknown", () => {
    expect(getLabel("Unknown Account")).toBe("Unknown Account");
  });

  it("returns human-readable labels", () => {
    expect(getLabel("Liremia - tracking-colis")).toBe("Liremia");
    expect(getLabel("Umami - Headsy")).toBe("Headsy");
  });
});

describe("getGroup", () => {
  it("returns correct group for known gname", () => {
    expect(getGroup("Ondoxa - FollowTrust")).toBe("Ondoxa");
    expect(getGroup("Liremia - tracking-colis")).toBe("Liremia");
    expect(getGroup("Umami - Headsy")).toBe("Groupe Umami / Seablue");
    expect(getGroup("Wizorg - Passfly")).toBe("Groupe Wizorg");
    expect(getGroup("Cellopop - Talkto")).toBe("Autres");
  });

  it("returns Autres for unknown gname", () => {
    expect(getGroup("Unknown")).toBe("Autres");
  });
});
