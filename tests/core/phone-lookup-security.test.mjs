import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Phone Lookup keeps provider access server-side and limits authenticated requests", async () => {
  const [schema, handler, adapter] = await Promise.all([
    readFile(new URL("../../supabase/migrations/018-phone-lookup-rate-limit.sql", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/functions/phone-lookup/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/functions/phone-lookup/adapters/getcontact-adapter.ts", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /request_count between 0 and 5/);
  assert.match(schema, /consume_phone_lookup_rate_limit/);
  assert.match(handler, /auth\.getUser/);
  assert.match(handler, /consume_phone_lookup_rate_limit/);
  assert.match(handler, /normalizePhone/);
  assert.match(adapter, /GETCONTACT_ADAPTER_TOKEN/);
  assert.match(adapter, /"X-Adapter-Token": token/);
  assert.match(adapter, /"Host": "lookup4allx\.anjas\.id"/);
  assert.doesNotMatch(handler, /GETCONTACT_ADAPTER_TOKEN/);
});
