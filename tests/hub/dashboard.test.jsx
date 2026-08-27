import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("@/components/hub/YouTubeSummaryCard", () => ({
  default: () => (
    <a aria-label="Open YouTube" href="/youtube">
      YouTube summary
    </a>
  ),
}));

describe("Personal Hub dashboard", () => {
  it("renders the approved route-first module dashboard", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /personal command center/i })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /open finance/i })).toHaveAttribute(
      "href",
      "/finance/portfolio"
    );
    expect(screen.getByRole("link", { name: /open youtube/i })).toHaveAttribute(
      "href",
      "/youtube"
    );
    expect(screen.getByRole("link", { name: /open projects/i })).toHaveAttribute(
      "href",
      "/projects"
    );
    expect(screen.getByRole("link", { name: /open about/i })).toHaveAttribute(
      "href",
      "/about"
    );
  });

  it("keeps the Finance summary locked and free of private values", () => {
    render(<Home />);

    const finance = screen.getByTestId("finance-summary");
    expect(within(finance).getByText("LOCKED")).toBeVisible();
    expect(within(finance).queryByText(/net worth/i)).not.toBeInTheDocument();
    expect(within(finance).queryByText(/Rp\s*[\d.]/i)).not.toBeInTheDocument();
    expect(within(finance).queryByText(/[+-]\d+(\.\d+)?%/)).not.toBeInTheDocument();
  });
});
