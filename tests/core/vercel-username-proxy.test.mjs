import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("vercel-getcontact-proxy/api/username.js", "utf8");

test("username proxy targets only the username adapter with server-side credentials", () => {
  assert.match(source, /const UPSTREAM_PATH = "\/cgi-bin\/username\.py"/);
  assert.match(source, /"X-Adapter-Token": adapterToken/);
  assert.match(source, /Host: UPSTREAM_VIRTUAL_HOST/);
  assert.match(source, /const proxyToken = process\.env\.PROXY_TOKEN/);
  assert.match(source, /request\.headers\["x-proxy-token"\]/);
  assert.match(source, /upstream\.end\(body\)/);
  assert.match(source, /response\.setHeader\("Cache-Control", "no-store"\)/);
  assert.doesNotMatch(source, /console\.(?:warn|error)\([^\n]*body/);
});
