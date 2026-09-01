import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestPath = new URL("../../public/hub-manifest.webmanifest", import.meta.url);
const workerPath = new URL("../../public/sw.js", import.meta.url);
const cssPath = new URL("../../app/hub.css", import.meta.url);

test("Hub manifest is installable as a dark standalone web app", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.start_url, "/hub");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#07100d");
  assert.equal(manifest.background_color, "#07100d");
  assert.ok(manifest.icons.some(({ src }) => src === "/icons/fd-os-icon.svg"));
});

test("service worker keeps API traffic and non-GET requests out of cache", async () => {
  const worker = await readFile(workerPath, "utf8");
  assert.match(worker, /request\.method !== "GET"/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /Never cache Supabase/);
  assert.match(worker, /SKIP_WAITING/);
  assert.match(worker, /4allx-shell-v2/);
  assert.match(worker, /then\(\(\) => self\.skipWaiting\(\)\)/);
});

test("Hub mobile polish protects safe areas, dock, and form keyboard behavior", async () => {
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /body:has\(.hub-auth-form input:focus/);
  assert.match(css, /font-size: 1rem/);
  assert.match(css, /iOS Safari zooms focused form controls below 16px/);
  assert.match(css, /\.hub-crud-modal input:not\(\[type="checkbox"\]\):not\(\[type="color"\]\)/);
  assert.match(css, /font-size: 16px !important/);
});
