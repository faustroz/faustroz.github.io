import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HubNavigation from "@/components/hub/HubNavigation";
import HubShell from "@/components/hub/HubShell";
import {
  HUB_MODULES,
  LEGACY_ROUTES,
  resolveActiveNav,
} from "@/lib/hub/navigation.mjs";

vi.mock("next/navigation", () => ({
  usePathname: () => "/finance/portfolio",
}));

describe("Hub navigation contract", () => {
  it("keeps the agreed canonical route order", () => {
    expect(HUB_MODULES.map(({ id, href }) => [id, href])).toEqual([
      ["home", "/"],
      ["finance", "/finance/portfolio"],
      ["youtube", "/youtube"],
      ["projects", "/projects"],
      ["about", "/about"],
    ]);
  });

  it.each([
    ["/", "home"],
    ["/finance/portfolio", "finance"],
    ["/finance/portfolio/history", "finance"],
    ["/youtube", "youtube"],
    ["/projects", "more"],
    ["/about", "more"],
  ])("resolves %s to %s", (pathname, expected) => {
    expect(resolveActiveNav(pathname)).toBe(expected);
  });

  it("maps both legacy routes to canonical destinations", () => {
    expect(LEGACY_ROUTES).toEqual({
      "/portfolio-tracker": "/finance/portfolio",
      "/youtube-tracker": "/youtube",
    });
  });

  it("contains no public finance value fields", () => {
    const finance = HUB_MODULES.find(({ id }) => id === "finance");

    expect(finance).toMatchObject({ status: "LOCKED", privacy: "private" });
    expect(finance).not.toHaveProperty("value");
    expect(finance).not.toHaveProperty("performance");
  });
});

describe("HubNavigation", () => {
  it("marks Finance as an isolated specialist shell", () => {
    const { container } = render(
      <HubShell>
        <main>Finance module</main>
      </HubShell>
    );

    expect(container.firstChild).toHaveClass(
      "hub-shell",
      "hub-shell--specialist",
      "hub-shell--finance"
    );
  });

  it("marks nested Finance as active in desktop and mobile navigation", () => {
    render(<HubNavigation />);

    const desktop = screen.getByRole("navigation", {
      name: /primary navigation/i,
    });
    const mobile = screen.getByRole("navigation", {
      name: /mobile navigation/i,
    });

    expect(within(desktop).getByRole("link", { name: /finance/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(mobile).getByRole("link", { name: /finance/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("opens More, closes with Escape, and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(<HubNavigation />);

    const mobile = screen.getByRole("navigation", {
      name: /mobile navigation/i,
    });
    const trigger = within(mobile).getByRole("button", {
      name: /open more navigation/i,
    });

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: /more navigation/i });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole("link", { name: /projects/i })).toHaveAttribute(
      "href",
      "/projects"
    );

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: /more navigation/i })
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
