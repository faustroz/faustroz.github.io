import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("components/hub/UsernameLookupDeveloperTest.jsx", "utf8");

test("temporary Username Intelligence developer test uses the signed-in client without exposing secrets", () => {
  assert.match(source, /functions\.invoke\("username-lookup"/);
  assert.match(source, /body: \{ username: "4allx", topSites: 20 \}/);
  assert.match(source, /window\.__usernameLookupDeveloperTest = run/);
  assert.match(source, /console\.info\("username-lookup developer test", \{ status, json: returnedJson \}\)/);
  assert.doesNotMatch(source, /GETCONTACT_PROXY_TOKEN|X-Proxy-Token/);
});
