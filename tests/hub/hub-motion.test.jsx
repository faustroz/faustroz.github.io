import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HubShell from "@/components/hub/HubShell";

const { state } = vi.hoisted(() => ({ state: { pathname: "/hub" } }));

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@/components/hub/HubNavigation", () => ({ default: () => <nav /> }));
vi.mock("@/components/hub/HubAuthGate", () => ({ default: ({ children }) => children }));
vi.mock("@/lib/hub/private-routes.mjs", () => ({ isPrivateHubRoute: () => false }));

describe("Hub motion", () => {
  let originalAnimate;
  let originalMatchMedia;

  beforeEach(() => {
    originalAnimate = HTMLElement.prototype.animate;
    originalMatchMedia = window.matchMedia;
    HTMLElement.prototype.animate = vi.fn(() => ({ cancel: vi.fn() }));
    window.matchMedia = vi.fn(() => ({ matches: false }));
    state.pathname = "/hub";
  });

  afterEach(() => {
    if (originalAnimate) HTMLElement.prototype.animate = originalAnimate;
    else delete HTMLElement.prototype.animate;
    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
    else delete window.matchMedia;
  });

  it("fades and shifts route content briefly after client navigation", () => {
    const { rerender } = render(<HubShell><main>content</main></HubShell>);
    state.pathname = "/finance";
    rerender(<HubShell><main>content</main></HubShell>);

    expect(HTMLElement.prototype.animate).toHaveBeenCalledWith(
      [
        { opacity: 0, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      expect.objectContaining({ duration: 175 }),
    );
  });

  it("does not animate when reduced motion is preferred", () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const { rerender } = render(<HubShell><main>content</main></HubShell>);
    state.pathname = "/finance";
    rerender(<HubShell><main>content</main></HubShell>);

    expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
  });
});
