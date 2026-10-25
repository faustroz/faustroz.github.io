export const MAX_VAULT_FILE_BYTES = 25 * 1024 * 1024;

const cleanFolderName = (value) => String(value || "").trim().replace(/[\\/]/g, "-").replace(/\s+/g, " ").slice(0, 80);

export function prepareVaultUpload(file, { fromFolder = false } = {}) {
  if (!file || typeof file.name !== "string" || !file.name) throw new Error("File tidak valid.");
  if (Number(file.size) > MAX_VAULT_FILE_BYTES) throw new Error("Ukuran file melebihi batas 25 MB.");

  if (!fromFolder) return { folderSegments: [], fileName: file.name };

  const relativePath = typeof file.webkitRelativePath === "string" ? file.webkitRelativePath : "";
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length < 2 || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Folder upload tidak didukung browser ini. Coba pilih beberapa file secara langsung atau perbarui Safari/iPadOS.");
  }

  const fileName = segments.pop();
  const folderSegments = segments.map(cleanFolderName);
  if (!fileName || folderSegments.some((segment) => !segment)) throw new Error("Struktur folder tidak valid.");
  return { folderSegments, fileName };
}
