import test from "node:test";
import assert from "node:assert/strict";
import { MAX_VAULT_FILE_BYTES, prepareVaultUpload } from "../../lib/hub/vault-upload.mjs";

test("Vault accepts a batch file as a file in the current folder", () => {
  assert.deepEqual(prepareVaultUpload({ name: "notes.pdf", size: 1024 }), { folderSegments: [], fileName: "notes.pdf" });
});

test("Vault folder upload preserves the selected folder and nested directories", () => {
  assert.deepEqual(prepareVaultUpload({ name: "report.pdf", size: 1024, webkitRelativePath: "Semester 1/Block A/Docs/report.pdf" }, { fromFolder: true }), {
    folderSegments: ["Semester 1", "Block A", "Docs"],
    fileName: "report.pdf",
  });
});

test("Vault folder upload rejects unsupported and unsafe relative paths", () => {
  assert.throws(() => prepareVaultUpload({ name: "report.pdf", size: 1024 }, { fromFolder: true }), /Folder upload tidak didukung/);
  assert.throws(() => prepareVaultUpload({ name: "report.pdf", size: 1024, webkitRelativePath: "folder/../report.pdf" }, { fromFolder: true }), /Folder upload tidak didukung/);
});

test("Vault enforces its existing 25 MB per-file limit", () => {
  assert.throws(() => prepareVaultUpload({ name: "large.bin", size: MAX_VAULT_FILE_BYTES + 1 }), /25 MB/);
});
