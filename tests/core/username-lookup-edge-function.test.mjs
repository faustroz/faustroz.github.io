import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("supabase/functions/username-lookup/index.ts", "utf8");

test("Username Intelligence is authenticated, validated, and proxied server-side", () => {
  assert.match(source, /api\/username/);
  assert.match(source, /Deno\.env\.get\("GETCONTACT_PROXY_TOKEN"\)/);
  assert.match(source, /"X-Proxy-Token": proxyToken/);
  assert.match(source, /userClient\.auth\.getUser\(\)/);
  assert.match(source, /Math\.min\(200, Math\.max\(5, Math\.trunc\(value\)\)\)/);
  assert.match(source, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(source, /console\.(?:warn|error)\([^\n]*\{[^}]*\b(?:username|proxyToken|responseText)\b/);
});
