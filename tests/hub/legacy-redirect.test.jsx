import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LegacyRedirect from "@/components/hub/LegacyRedirect";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("LegacyRedirect", () => {
  beforeEach(() => replace.mockClear());

  it.each([
    ["/portfolio-tracker", "/finance/portfolio"],
    ["/youtube-tracker", "/youtube"],
  ])("replaces %s and renders a fallback link", async (from, destination) => {
    render(<LegacyRedirect from={from} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
    expect(screen.getByRole("link", { name: /continue to/i })).toHaveAttribute(
      "href",
      destination
    );
  });
});
