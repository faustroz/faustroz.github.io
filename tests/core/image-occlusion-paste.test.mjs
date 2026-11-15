import assert from "node:assert/strict";
import test from "node:test";
import { getClipboardImageFiles } from "../../lib/hub/image-occlusion.mjs";

test("pasted clipboard images are taken, text and other files are ignored", () => {
  const png = { name: "shot.png", type: "image/png" };
  const clipboard = {
    items: [
      { kind: "string", type: "text/plain", getAsFile: () => null },
      { kind: "file", type: "image/png", getAsFile: () => png },
      { kind: "file", type: "application/pdf", getAsFile: () => ({ type: "application/pdf" }) },
      { kind: "file", type: "image/jpeg", getAsFile: () => null },
    ],
  };
  assert.deepEqual(getClipboardImageFiles(clipboard), [png]);
  assert.deepEqual(getClipboardImageFiles(undefined), []);
});
