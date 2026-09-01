import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [service, storage, page] = await Promise.all([
  readFile("lib/portfolio/priceService.js", "utf8"),
  readFile("lib/portfolio/storage.js", "utf8"),
  readFile("app/finance/portfolio/page.jsx", "utf8"),
]);

test("US stock quotes retry alternate Yahoo/CORS routes with bounded requests", () => {
  assert.match(service, /REQUEST_TIMEOUT_MS = 8_000/);
  assert.match(service, /query2\.finance\.yahoo\.com/);
  assert.match(service, /api\.allorigins\.win/);
  assert.match(service, /corsproxy\.io/);
  assert.match(service, /api\.codetabs\.com/);
  assert.match(service, /AbortController\(\)/);
});

test("portfolio preserves owner-private last known prices during temporary provider failures", () => {
  assert.match(storage, /MARKET_PRICES: 'pt_market_prices'/);
  assert.match(storage, /getMarketPrices/);
  assert.match(storage, /setMarketPrices/);
  assert.match(service, /LAST_KNOWN_PRICE_MAX_AGE_MS/);
  assert.match(service, /source: `\$\{known\.source \|\| 'Market'\} · last known`/);
  assert.match(page, /withLastKnownPrices\(newPrices, storedPrices, assets\)/);
  assert.match(page, /setMarketPrices\(\{ \.\.\.storedPrices, \.\.\.marketPriceSnapshot\(newPrices\) \}\)/);
});
