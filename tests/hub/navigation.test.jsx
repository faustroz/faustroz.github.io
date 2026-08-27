import { describe, expect, it } from "vitest";
import {
  HUB_MODULES,
  LEGACY_ROUTES,
  resolveActiveNav,
} from "@/lib/hub/navigation.mjs";

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
