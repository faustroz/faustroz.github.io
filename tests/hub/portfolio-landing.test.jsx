import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Public portfolio landing", () => {
  it("restores the original portfolio experience at the root route", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Ferdy Diatmika", level: 1 })
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "About Me" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Portfolio" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: /personal command center/i })
    ).not.toBeInTheDocument();
  });
});
