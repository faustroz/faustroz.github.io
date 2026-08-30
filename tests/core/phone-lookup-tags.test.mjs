import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Phone Lookup preserves adapter tag objects and maps their tag values in the PWA", async () => {
  const [handler, panel] = await Promise.all([
    readFile(new URL("../../supabase/functions/phone-lookup/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../../components/hub/PhoneLookupPanel.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(handler, /const tags = Array\.isArray\(body\?\.tags\) \? body\.tags : \[\]/);
  assert.match(handler, /reportedCount: count/);
  assert.match(handler, /phone-lookup tags response/);
  assert.match(panel, /item\?\.tag/);
  assert.match(panel, /quotaNumber\(result\.count\)/);
  assert.match(panel, /hub-phone-tags/);
  assert.match(panel, /Show all \$\{tags\.length\} tags/);
});
