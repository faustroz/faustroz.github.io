"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ChevronRight, Download, File, FileImage, FileSpreadsheet, FileText, Folder, FolderOpen, FolderPlus, Grid2X2, Home, List, MoreHorizontal, Pencil, Search, Trash2, Upload, X } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import { prepareVaultUpload } from "@/lib/hub/vault-upload.mjs";

const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "-");
const cleanName = (value) => value.trim().replace(/\s+/g, " ").slice(0, 80);
const formatSize = (bytes) => bytes < 1048576 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
const shortDate = (value) => value ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const SEARCH_TEXT_LIMIT = 32768;
const searchableFile = (file) => file.type.startsWith("text/") || /\.(txt|md|markdown)$/i.test(file.name);
const extractSearchText = async (file) => searchableFile(file) ? (await file.text()).slice(0, SEARCH_TEXT_LIMIT) : "";

function iconFor(document) {
  if (document.mime_type?.startsWith("image/")) return FileImage;
  if (document.mime_type?.includes("spreadsheet") || /\.(csv|xlsx|xls)$/i.test(document.file_name)) return FileSpreadsheet;
  if (document.mime_type?.includes("zip") || /\.(zip|rar|7z)$/i.test(document.file_name)) return Archive;
  if (document.mime_type?.startsWith("text/") || /\.(pdf|docx?|md)$/i.test(document.file_name)) return FileText;
  return File;
}

export default function VaultPanel() {
  const [docs, setDocs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("grid");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [menuId, setMenuId] = useState(null);
  const [folderDialog, setFolderDialog] = useState(null);
  const [folderName, setFolderName] = useState("");

  const load = useCallback(async () => {
    try {
      const client = requireSupabase();
      const [{ data: documents, error: documentError }, { data: folderRows, error: folderError }] = await Promise.all([
        client.from("vault_documents").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        client.from("vault_folders").select("id,name,parent_id,created_at").order("name"),
      ]);
      if (documentError) throw documentError;
      if (folderError) throw folderError;
      setDocs(documents || []); setFolders(folderRows || []);
    } catch (error) { setStatus(error.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const path = useMemo(() => {
    const ancestors = [];
    let cursor = activeFolderId ? folderById.get(activeFolderId) : null;
    while (cursor) { ancestors.unshift(cursor); cursor = cursor.parent_id ? folderById.get(cursor.parent_id) : null; }
    return ancestors;
  }, [activeFolderId, folderById]);
  const needle = query.trim().toLowerCase();
  const searching = Boolean(needle);
  const currentFolders = folders.filter((folder) => folder.parent_id === activeFolderId);
  const currentDocs = docs.filter((document) => document.folder_id === activeFolderId);
  const visibleFolders = searching ? folders.filter((folder) => folder.name.toLowerCase().includes(needle)) : currentFolders;
  const visibleDocs = searching ? docs.filter((document) => `${document.file_name} ${document.folder || ""} ${(document.tags || []).join(" ")} ${document.search_text || ""}`.toLowerCase().includes(needle)) : currentDocs;
  const usedBytes = docs.reduce((total, document) => total + Number(document.byte_size || 0), 0);

  const openFolder = (id) => { setActiveFolderId(id); setQuery(""); setMenuId(null); };
  const beginFolder = (folder = null) => { setFolderDialog(folder || "new"); setFolderName(folder?.name || ""); setMenuId(null); };
  const saveFolder = async (event) => {
    event.preventDefault();
    const name = cleanName(folderName);
    if (!name) return setStatus("Folder name is required.");
    setStatus("");
    const client = requireSupabase();
    const editing = folderDialog !== "new";
    const payload = editing ? { name } : { name, parent_id: activeFolderId };
    const { error } = editing ? await client.from("vault_folders").update(payload).eq("id", folderDialog.id) : await client.from("vault_folders").insert(payload);
    if (error) return setStatus(error.message);
    setFolderDialog(null); await load();
  };
  const deleteFolder = async (folder) => {
    if (folders.some((item) => item.parent_id === folder.id) || docs.some((item) => item.folder_id === folder.id)) return setStatus("Move or remove this folder’s files and subfolders first.");
    if (!window.confirm(`Delete empty folder “${folder.name}”?`)) return;
    const { error } = await requireSupabase().from("vault_folders").delete().eq("id", folder.id);
    if (error) return setStatus(error.message);
    if (activeFolderId === folder.id) setActiveFolderId(folder.parent_id || null);
    await load();
  };
  const upload = async (event, fromFolder = false) => {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    setUploading(true); setUploadProgress(`0/${files.length}`); setStatus("");
    let uploadedCount = 0;
    const failures = [];
    try {
      const supabase = requireSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required.");

      const folderCache = new Map();
      const ensureFolderPath = async (segments) => {
        let parentId = activeFolderId;
        let leafName = parentId ? folderById.get(parentId)?.name || "" : "";
        for (const name of segments) {
          const cacheKey = `${parentId || "root"}\u0000${name}`;
          let folder = folderCache.get(cacheKey) || folders.find((item) => item.parent_id === parentId && item.name === name);
          if (!folder) {
            const { data, error } = await supabase.from("vault_folders").insert({ name, parent_id: parentId }).select("id,name,parent_id").single();
            if (error) throw error;
            folder = data;
          }
          folderCache.set(cacheKey, folder);
          parentId = folder.id;
          leafName = folder.name;
        }
        return { folderId: parentId, folderName: leafName };
      };

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        let storagePath = "";
        try {
          const { folderSegments, fileName } = prepareVaultUpload(file, { fromFolder });
          const destination = await ensureFolderPath(folderSegments);
          storagePath = `${user.id}/${crypto.randomUUID()}-${safeName(fileName)}`;
          const searchText = await extractSearchText(file);
          const { error: storageError } = await supabase.storage.from("document-vault").upload(storagePath, file, { contentType: file.type, upsert: false });
          if (storageError) throw storageError;
          const payload = { storage_path: storagePath, file_name: fileName, mime_type: file.type || "application/octet-stream", byte_size: file.size, folder_id: destination.folderId, folder: destination.folderName };
          if (searchText) payload.search_text = searchText;
          let { error } = await supabase.from("vault_documents").insert(payload);
          // Keep uploads working during a staggered GitHub Pages / migration rollout.
          if (error && searchText && /search_text/i.test(`${error.message || ""} ${error.details || ""}`)) {
            delete payload.search_text;
            ({ error } = await supabase.from("vault_documents").insert(payload));
          }
          if (error) { await supabase.storage.from("document-vault").remove([storagePath]); storagePath = ""; throw error; }
          uploadedCount += 1;
        } catch (error) {
          if (storagePath) await supabase.storage.from("document-vault").remove([storagePath]);
          failures.push(`${file.name}: ${error.message || "upload gagal"}`);
        }
        setUploadProgress(`${index + 1}/${files.length}`);
      }

      await load();
      setStatus(failures.length
        ? `${uploadedCount} file berhasil diunggah; ${failures.length} gagal. ${failures.slice(0, 2).join(" · ")}`
        : `${uploadedCount} file berhasil diunggah.`);
    } catch (error) {
      setStatus(error.message || "Upload gagal.");
    } finally {
      setUploading(false); setUploadProgress(""); input.value = "";
    }
  };
  const move = async (document, folderId) => {
    const destination = folderId ? folderById.get(folderId) : null;
    const { error } = await requireSupabase().from("vault_documents").update({ folder_id: folderId || null, folder: destination?.name || "" }).eq("id", document.id);
    if (error) return setStatus(error.message);
    setMenuId(null); await load();
  };
  const open = async (document) => {
    const { data, error } = await requireSupabase().storage.from("document-vault").createSignedUrl(document.storage_path, 60);
    if (error) return setStatus(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const remove = async (document) => {
    if (!window.confirm(`Move “${document.file_name}” to Trash?`)) return;
    const { error } = await requireSupabase().from("vault_documents").update({ deleted_at: new Date().toISOString() }).eq("id", document.id);
    if (error) return setStatus(error.message);
    setMenuId(null); await load();
  };

  return <section className="hub-vault-drive">
    <header className="hub-vault-drive-head"><div><span>PRIVATE CLOUD DRIVE</span><h2>My Vault</h2><p>{docs.length} files · {formatSize(usedBytes)} used · private by default</p></div><div className="hub-vault-drive-actions"><button type="button" className="hub-vault-new" onClick={() => beginFolder()}><FolderPlus /> NEW FOLDER</button><label className="hub-vault-upload"><Upload /><span>{uploading ? `UPLOADING ${uploadProgress}` : "UPLOAD FILES"}</span><input type="file" multiple aria-label="Upload multiple files" onChange={(event) => upload(event, false)} disabled={uploading} /></label><label className="hub-vault-upload hub-vault-upload--folder"><FolderPlus /><span>{uploading ? `UPLOADING ${uploadProgress}` : "UPLOAD FOLDER"}</span><input type="file" multiple webkitdirectory="" aria-label="Upload folder and its contents" onChange={(event) => upload(event, true)} disabled={uploading} /></label></div></header>
    <div className="hub-vault-toolbar"><nav aria-label="Vault path" className="hub-vault-breadcrumb"><button type="button" onClick={() => openFolder(null)} aria-label="Vault root"><Home /></button>{path.map((folder) => <span key={folder.id}><ChevronRight /><button type="button" onClick={() => openFolder(folder.id)}>{folder.name}</button></span>)}</nav><label className="hub-vault-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files and folders" /><button type="button" aria-label="Clear search" onClick={() => setQuery("")} hidden={!query}><X /></button></label><div className="hub-vault-view-switch" aria-label="View mode"><button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 /></button><button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="List view"><List /></button></div></div>
    {status && <p className="hub-data-error">{status}</p>}
    <div className={`hub-vault-browser hub-vault-browser--${view}`}>
      {visibleFolders.length > 0 && <section className="hub-vault-section"><header><span>{searching ? "FOLDERS FOUND" : "FOLDERS"}</span><small>{visibleFolders.length}</small></header><div className="hub-vault-folder-list">{visibleFolders.map((folder) => <article className="hub-vault-folder" key={folder.id}><button type="button" className="hub-vault-folder-main" onClick={() => openFolder(folder.id)}><FolderOpen /><strong>{folder.name}</strong><small>{shortDate(folder.created_at)}</small></button><div className="hub-vault-menu"><button type="button" aria-label={`Actions for ${folder.name}`} onClick={() => setMenuId(menuId === `folder-${folder.id}` ? null : `folder-${folder.id}`)}><MoreHorizontal /></button>{menuId === `folder-${folder.id}` && <div><button type="button" onClick={() => beginFolder(folder)}><Pencil /> Rename</button><button type="button" onClick={() => deleteFolder(folder)}><Trash2 /> Delete</button></div>}</div></article>)}</div></section>}
      {visibleDocs.length > 0 && <section className="hub-vault-section"><header><span>{searching ? "FILES FOUND" : "FILES"}</span><small>{visibleDocs.length}</small></header><div className="hub-vault-file-list">{visibleDocs.map((document) => { const Icon = iconFor(document); return <article className="hub-vault-file" key={document.id}><button type="button" className="hub-vault-file-main" onClick={() => open(document)}><Icon /><span><strong>{document.file_name}</strong><small>{formatSize(document.byte_size)} · {shortDate(document.created_at)}</small></span></button><div className="hub-vault-file-meta">{document.tags?.slice(0, 2).map((tag) => <i key={tag}>{tag}</i>)}</div><div className="hub-vault-menu"><button type="button" aria-label={`Actions for ${document.file_name}`} onClick={() => setMenuId(menuId === `file-${document.id}` ? null : `file-${document.id}`)}><MoreHorizontal /></button>{menuId === `file-${document.id}` && <div><button type="button" onClick={() => open(document)}><Download /> Open file</button><label><Folder /> Move to<select value={document.folder_id || ""} onChange={(event) => move(document, event.target.value)}><option value="">Vault root</option>{folders.filter((folder) => folder.id !== document.folder_id).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><button type="button" onClick={() => remove(document)}><Trash2 /> Move to Trash</button></div>}</div></article>; })}</div></section>}
      {!visibleDocs.length && !visibleFolders.length && <div className="hub-vault-empty"><Folder /><h3>{searching ? "Nothing matched that search." : "This folder is empty."}</h3><p>{searching ? "Try a file name, folder name, or tag." : "Create a folder or upload a private file to start organizing."}</p></div>}
    </div>
    {folderDialog !== null && <div className="hub-vault-dialog-backdrop" role="presentation" onMouseDown={() => setFolderDialog(null)}><form className="hub-vault-dialog" onSubmit={saveFolder} onMouseDown={(event) => event.stopPropagation()}><header><span>{folderDialog === "new" ? "NEW FOLDER" : "RENAME FOLDER"}</span><button type="button" onClick={() => setFolderDialog(null)} aria-label="Close"><X /></button></header><label>Folder name<input autoFocus value={folderName} maxLength="80" onChange={(event) => setFolderName(event.target.value)} placeholder="e.g. Academic / 2026" /></label><footer><button type="button" onClick={() => setFolderDialog(null)}>CANCEL</button><button type="submit">{folderDialog === "new" ? "CREATE" : "SAVE"}</button></footer></form></div>}
  </section>;
}
