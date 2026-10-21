import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HubShell from "@/components/hub/HubShell";

vi.mock("next/navigation", () => ({ usePathname: () => "/academic/practice" }));
vi.mock("@/components/hub/HubNavigation", () => ({ default: () => <nav>GLOBAL NAVIGATION</nav> }));
vi.mock("@/components/hub/HubAuthGate", () => ({ default: ({ children }) => <div>AUTHENTICATED {children}</div> }));
vi.mock("@/lib/hub/private-routes.mjs", () => ({ isPrivateHubRoute: () => true }));

describe("standalone practice shell", () => {
  it("keeps auth but hides the global navigation and footer for practice", () => {
    const { container } = render(<HubShell><main>Practice screen</main></HubShell>);
    expect(screen.getByText("Practice screen")).toBeInTheDocument();
    expect(screen.getByText(/AUTHENTICATED/)).toBeInTheDocument();
    expect(screen.queryByText("GLOBAL NAVIGATION")).not.toBeInTheDocument();
    expect(container.querySelector(".hub-footer")).toBeNull();
    expect(container.querySelector(".hub-shell--practice")).not.toBeNull();
  });
});
