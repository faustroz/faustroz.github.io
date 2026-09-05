import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HubHome from "@/app/hub/page";

vi.mock("@/components/hub/useTradingMonitor", () => ({
  useTradingMonitor: () => ({ loading: false, refreshing: false, authenticated: false, metrics: null, stale: false, error: "", updatedAt: null, refresh: vi.fn() }),
}));

describe("Personal Hub dashboard", () => {
  it("renders the approved route-first module dashboard", () => {
    render(<HubHome />);

    expect(
      screen.getByRole("heading", { name: /personal command center/i })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /open finance/i })).toHaveAttribute(
      "href",
      "/finance"
    );
    expect(screen.queryByRole("link", { name: /open study/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open projects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open ai memory/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open settings/i })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: /open trading system monitoring/i })).toHaveAttribute("href", "/trading");
    expect(screen.queryByRole("link", { name: /open about/i })).not.toBeInTheDocument();
  });

  it("keeps the Finance summary locked and free of private values", () => {
    render(<HubHome />);

    const finance = screen.getByTestId("finance-summary");
    expect(within(finance).getByText("LOCKED")).toBeVisible();
    expect(within(finance).queryByText(/net worth/i)).not.toBeInTheDocument();
    expect(within(finance).queryByText(/Rp\s*[\d.]/i)).not.toBeInTheDocument();
    expect(within(finance).queryByText(/[+-]\d+(\.\d+)?%/)).not.toBeInTheDocument();
  });
});
