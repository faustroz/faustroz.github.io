import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HubHome from "@/app/hub/page";

vi.mock("@/components/hub/useTradingMonitor", () => ({
  useTradingMonitor: () => ({ loading: false, refreshing: false, authenticated: false, metrics: null, stale: false, error: "", updatedAt: null, refresh: vi.fn() }),
}));

describe("Personal Hub dashboard", () => {
  it("renders the dynamic command center and keeps the monitoring entry available", async () => {
    render(<HubHome />);

    expect(screen.getByRole("button", { name: /search finance, academic, vault/i })).toBeVisible();
    await waitFor(() => expect(screen.getByRole("heading", { name: /hubungkan sesi pribadi/i })).toBeVisible());
    expect(screen.queryByRole("link", { name: /open study/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open projects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open ai memory/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open trading system monitoring/i })).toHaveAttribute("href", "/trading");
  });

  it("keeps private summaries empty when there is no authenticated session", async () => {
    render(<HubHome />);

    await waitFor(() => expect(screen.getByText(/masuk untuk menampilkan ringkasan finance/i)).toBeVisible());
    expect(screen.queryByText(/Rp\s*[\d.]/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/[+-]\d+(\.\d+)?%/)).not.toBeInTheDocument();
  });
});
