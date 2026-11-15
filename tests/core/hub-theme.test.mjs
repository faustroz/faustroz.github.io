import assert from "node:assert/strict";
import test from "node:test";
import { readHubTheme, resolveHubTheme, writeHubTheme, HUB_THEME_KEY } from "../../lib/hub/theme.mjs";

function memory(initial = {}) {
  const map = new Map(Object.entries(initial));
  return { getItem: (key) => (map.has(key) ? map.get(key) : null), setItem: (key, value) => map.set(key, String(value)) };
}

test("hub theme defaults to the system preference when nothing valid is stored", () => {
  assert.equal(readHubTheme(memory()), "system");
  assert.equal(readHubTheme(memory({ [HUB_THEME_KEY]: "neon" })), "system");
  assert.equal(readHubTheme(undefined), "system");
});

test("hub theme round-trips only the three known values", () => {
  const storage = memory();
  assert.equal(writeHubTheme(storage, "light"), true);
  assert.equal(readHubTheme(storage), "light");
  assert.equal(writeHubTheme(storage, "purple"), false);
  assert.equal(readHubTheme(storage), "light");
});

test("explicit choice wins over the system, system follows it", () => {
  assert.equal(resolveHubTheme("light", false), "light");
  assert.equal(resolveHubTheme("dark", true), "dark");
  assert.equal(resolveHubTheme("system", true), "light");
  assert.equal(resolveHubTheme("system", false), "dark");
});
