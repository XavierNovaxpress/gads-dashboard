import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "../components/KpiCard";

describe("KpiCard", () => {
  it("renders title and value", () => {
    render(<KpiCard title="Spend MTD" value="1 234,56 €" />);
    expect(screen.getByText("Spend MTD")).toBeInTheDocument();
    expect(screen.getByText("1 234,56 €")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<KpiCard title="Test" value="100" subtitle="Some context" />);
    expect(screen.getByText("Some context")).toBeInTheDocument();
  });

  it("renders trend badge when provided", () => {
    render(
      <KpiCard
        title="Test"
        value="100"
        trend={{ label: "+10.5%", positive: true }}
      />
    );
    expect(screen.getByText("+10.5%")).toBeInTheDocument();
  });

  it("renders negative trend with red styling", () => {
    render(
      <KpiCard
        title="Test"
        value="100"
        trend={{ label: "-5.2%", positive: false }}
      />
    );
    const badge = screen.getByText("-5.2%");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-red-500");
  });

  it("renders positive trend with emerald styling", () => {
    render(
      <KpiCard
        title="Test"
        value="100"
        trend={{ label: "+5.2%", positive: true }}
      />
    );
    const badge = screen.getByText("+5.2%");
    expect(badge.className).toContain("text-emerald-500");
  });

  it("renders icon when provided", () => {
    render(
      <KpiCard
        title="Test"
        value="100"
        icon={<span data-testid="test-icon">icon</span>}
      />
    );
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("applies accent bar when provided", () => {
    const { container } = render(
      <KpiCard title="Test" value="100" accent="#3b82f6" />
    );
    const bar = container.querySelector('[style*="background-color"]');
    expect(bar).toBeTruthy();
  });

  it("applies animation delay", () => {
    const { container } = render(
      <KpiCard title="Test" value="100" delay={200} />
    );
    const card = container.firstElementChild;
    expect(card?.getAttribute("style")).toContain("200ms");
  });
});
