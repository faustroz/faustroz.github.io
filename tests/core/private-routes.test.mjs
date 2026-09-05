import assert from "node:assert/strict";
import test from "node:test";
import { isPrivateHubRoute } from "../../lib/hub/private-routes.mjs";

test("Phase 4 module routes are private while public pages stay open", () => {
  for (const route of [
    "/finance",
    "/finance/portfolio",
    "/settings",
    "/insights",
    "/osint",
    "/phone-lookup",
    "/trading",
  ]) {
    assert.equal(isPrivateHubRoute(route), true, route);
  }

  for (const route of ["/", "/hub", "/about"]) {
    assert.equal(isPrivateHubRoute(route), false, route);
  }
});
