import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [panel, page] = await Promise.all([
  readFile("components/hub/UsernameLookupPanel.jsx", "utf8"),
  readFile("app/osint/page.jsx", "utf8"),
]);

test("Username Intelligence is private-session UI backed by the authenticated Edge Function", () => {
  assert.match(page, /<UsernameLookupPanel \/>/);
  assert.match(panel, /functions\.invoke\("username-lookup"/);
  assert.match(panel, /username, topSites: Number\(topSites\)/);
  assert.match(panel, /Possible \/ Found/);
  assert.match(panel, /Rate-limited, blocked, or uncertain — verify manually/);
  assert.match(panel, /target="_blank" rel="noreferrer"/);
  assert.doesNotMatch(panel, /\.from\(|\.insert\(|\.update\(/);
});
