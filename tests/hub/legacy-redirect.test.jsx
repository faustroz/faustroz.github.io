import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LegacyRedirect from "@/components/hub/LegacyRedirect";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("LegacyRedirect", () => {
  beforeEach(() => replace.mockClear());

  it("replaces the Portfolio legacy route and renders a fallback link", async () => {
    const from = "/portfolio-tracker";
    const destination = "/finance/portfolio";
    render(<LegacyRedirect from={from} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
    expect(screen.getByRole("link", { name: /continue to/i })).toHaveAttribute(
      "href",
      destination
    );
  });
});
