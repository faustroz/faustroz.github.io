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
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Hub navigation contract", () => {
  it("keeps the current canonical route order", () => {
    expect(HUB_MODULES.map(({ id, href }) => [id, href])).toEqual([
      ["home", "/hub"],
      ["finance", "/finance"],
      ["settings", "/settings"],
      ["insights", "/insights"],
      ["vault", "/vault"],
      ["academic", "/academic"],
      ["trash", "/trash"],
      ["osint", "/osint"],
    ]);
  });

  it.each([
    ["/", null],
    ["/hub", "home"],
    ["/finance/portfolio", "finance"],
    ["/finance/portfolio/history", "finance"],
    ["/study", null],
    ["/projects", null],
    ["/settings", "settings"],
    ["/insights", "insights"],
    ["/osint", "osint"],
    ["/phone-lookup", "osint"],
    ["/about", null],
  ])("resolves %s to %s", (pathname, expected) => {
    expect(resolveActiveNav(pathname)).toBe(expected);
  });

  it("maps the Portfolio legacy route to its canonical destination", () => {
    expect(LEGACY_ROUTES).toEqual({
      "/portfolio-tracker": "/finance/portfolio",
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
    expect(
      screen.queryByRole("navigation", { name: /primary navigation/i })
    ).not.toBeInTheDocument();
  });

  it("marks nested Finance as active in desktop and the Workspace mobile control", () => {
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
    expect(within(mobile).getByRole("button", { name: /open workspace navigation/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("groups desktop links into the requested sidebar sections", () => {
    render(<HubNavigation />);
    const desktop = screen.getByRole("navigation", { name: /primary navigation/i });

    expect(within(desktop).getByLabelText("HOME")).toHaveTextContent(/Home/);
    expect(within(desktop).getByLabelText("WORKSPACE")).toHaveTextContent(/Finance.*Academic.*Vault.*OSINT.*Insights/);
    expect(within(desktop).getByLabelText("SYSTEM")).toHaveTextContent(/Trash.*Settings/);
  });

  it("opens Workspace, highlights its current route, and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(<HubNavigation />);

    const mobile = screen.getByRole("navigation", {
      name: /mobile navigation/i,
    });
    const trigger = within(mobile).getByRole("button", {
      name: /open workspace navigation/i,
    });

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: /workspace navigation/i });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole("link", { name: /osint/i })).toBeVisible();
    expect(within(dialog).getByRole("link", { name: /finance/i })).toHaveAttribute("aria-current", "page");

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: /workspace navigation/i })
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
