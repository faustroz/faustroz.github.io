import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [proxy, config] = await Promise.all([
  readFile("vercel-getcontact-proxy/api/username.js", "utf8"),
  readFile("vercel-getcontact-proxy/vercel.json", "utf8"),
]);

test("Username proxy reserves time to return a clean timeout on Vercel Hobby", () => {
  assert.match(config, /"api\/username\.js": \{\s+"maxDuration": 60/);
  assert.match(proxy, /const USERNAME_UPSTREAM_TIMEOUT_MS = 55_000/);
  assert.match(proxy, /class UpstreamTimeoutError extends Error/);
  assert.match(proxy, /response\.status\(504\)/);
  assert.doesNotMatch(proxy, /console\.(?:warn|error)\([^\n]*\{[^}]*\b(?:adapterToken:|body:|responseText:)\b/);
});
