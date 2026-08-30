import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [edge, proxy, config, cgi, worker] = await Promise.all([
  readFile("supabase/functions/username-lookup/index.ts", "utf8"),
  readFile("vercel-getcontact-proxy/api/username-job.js", "utf8"),
  readFile("vercel-getcontact-proxy/vercel.json", "utf8"),
  readFile("deployment/anjas/username-job.py", "utf8"),
  readFile("deployment/anjas/username-job-worker.py", "utf8"),
]);

test("Deep Scan has explicit authenticated start and polling actions", () => {
  assert.match(edge, /userClient\.auth\.getUser\(\)/);
  assert.match(edge, /action === "startDeepScan"/);
  assert.match(edge, /action === "deepScanStatus"/);
  assert.match(edge, /new Set\(\[50, 100, 200\]\)/);
  assert.match(edge, /\^\[A-Za-z0-9_-\]\{32,64\}\$/);
  assert.match(edge, /topSites !== 20/);
  assert.match(edge, /api\/username-job/);
  assert.match(edge, /"X-Proxy-Token": proxyToken/);
  assert.doesNotMatch(edge, /console\.(?:info|warn|error)\([^\n]*\{[^}]*\b(?:username|proxyToken|responseText)\b/);
});

test("Vercel Deep Scan proxy is separate, short-lived, and token protected", () => {
  assert.match(proxy, /UPSTREAM_PATH = "\/cgi-bin\/username-job\.py"/);
  assert.match(proxy, /\["POST", "GET"\]/);
  assert.match(proxy, /name\.toLowerCase\(\) === "x-proxy-token"/);
  assert.match(proxy, /"X-Adapter-Token": adapterToken/);
  assert.match(proxy, /Host: UPSTREAM_VIRTUAL_HOST/);
  assert.match(proxy, /REQUEST_TIMEOUT_MS = 10_000/);
  assert.match(proxy, /jobIdPattern\.test\(jobId\)/);
  assert.match(config, /"api\/username-job\.js"[\s\S]*"maxDuration": 15/);
  assert.doesNotMatch(proxy, /console\.(?:info|warn|error)\([^\n]*\{[^}]*\b(?:body|username|adapterToken|proxyToken)\b/);
});

test("ANJAS job implementation uses private ephemeral storage and a bounded worker", () => {
  assert.match(cgi, /\.username-deep-scan-jobs/);
  assert.match(cgi, /TTL_SECONDS = 15 \* 60/);
  assert.match(cgi, /MAX_ACTIVE_JOBS = 2/);
  assert.match(cgi, /secrets\.token_urlsafe\(24\)/);
  assert.match(cgi, /start_new_session=True/);
  assert.match(cgi, /HTTP_X_ADAPTER_TOKEN/);
  assert.match(worker, /maigret-env" \/ "bin" \/ "maigret/);
  assert.match(worker, /MAX_RUNTIME_SECONDS = 5 \* 60/);
  assert.match(worker, /TTL_SECONDS = 15 \* 60/);
  assert.match(worker, /timeout=MAX_RUNTIME_SECONDS/);
  assert.match(worker, /raw_path\.unlink\(\)/);
  assert.doesNotMatch(cgi, /public_html.*\.username-deep-scan-jobs/);
});
