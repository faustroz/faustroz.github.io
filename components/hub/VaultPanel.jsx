"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, FolderPlus, FolderUp, Search, Trash2 } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";

const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "-");
const cleanFolder = (value) => value.trim().replace(/\s+/g, " ").slice(0, 80);

export default function VaultPanel() {
  const [docs, setDocs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const folderNames = [...new Set([...folders.map(({ name }) => name), ...docs.map(({ folder }) => folder).filter(Boolean)])].sort((left, right) => left.localeCompare(right));
  const load = useCallback(async () => {
    try {
      const client = requireSupabase();
      const [{ data: documents, error: documentError }, { data: folderRows, error: folderError }] = await Promise.all([
        client.from("vault_documents").select("*").order("created_at", { ascending: false }),
        client.from("vault_folders").select("id,name").order("name"),
      ]);
      if (documentError) throw documentError;
      if (folderError) throw folderError;
      setDocs(documents || []); setFolders(folderRows || []);
    } catch (loadError) { setStatus(loadError.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const createFolder = async () => {
    const name = cleanFolder(window.prompt("Folder name") || "");
    if (!name) return;
    setStatus("");
    const { error } = await requireSupabase().from("vault_folders").insert({ name });
    if (error) return setStatus(error.message);
    setSelectedFolder(name); await load();
  };
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 26214400) return setStatus("Maximum file size is 25 MB.");
    setUploading(true); setStatus("");
    try {
      const supabase = requireSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required.");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error: storageError } = await supabase.storage.from("document-vault").upload(path, file, { contentType: file.type, upsert: false });
      if (storageError) throw storageError;
      const { error } = await supabase.from("vault_documents").insert({ storage_path: path, file_name: file.name, mime_type: file.type || "application/octet-stream", byte_size: file.size, folder: selectedFolder });
      if (error) { await supabase.storage.from("document-vault").remove([path]); throw error; }
      await load();
    } catch (uploadError) { setStatus(uploadError.message); } finally { setUploading(false); event.target.value = ""; }
  };
  const move = async (doc, folder) => {
    const { error } = await requireSupabase().from("vault_documents").update({ folder }).eq("id", doc.id);
    if (error) return setStatus(error.message);
    await load();
  };
  const open = async (doc) => {
    const { data, error } = await requireSupabase().storage.from("document-vault").createSignedUrl(doc.storage_path, 60);
    if (error) return setStatus(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const remove = async (doc) => {
    if (!window.confirm(`Delete ${doc.file_name}?`)) return;
    const client = requireSupabase();
    const { error: storageError } = await client.storage.from("document-vault").remove([doc.storage_path]);
    if (storageError) return setStatus(storageError.message);
    const { error } = await client.from("vault_documents").delete().eq("id", doc.id);
    if (error) return setStatus(error.message);
    await load();
  };
  const visible = docs.filter((doc) => `${doc.file_name} ${doc.folder} ${(doc.tags || []).join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  return <section className="hub-crud-panel hub-vault"><header className="hub-crud-heading"><div><span>STORAGE / OWNER-ONLY</span><h2>Document Vault</h2><p>Files are never public; previews use short-lived signed URLs.</p></div><div className="hub-vault-controls"><button type="button" className="hub-vault-upload" onClick={createFolder}><FolderPlus /> CREATE FOLDER</button><label className="hub-vault-upload"><FolderUp /><span>{uploading ? "UPLOADING…" : "UPLOAD FILE"}</span><input type="file" onChange={upload} disabled={uploading} /></label></div></header><label className="hub-vault-folder-picker"><span>UPLOAD TO FOLDER</span><select value={selectedFolder} onChange={(event) => setSelectedFolder(event.target.value)}><option value="">Vault root</option>{folderNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label className="hub-search-input"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter files, folders, or tags" /></label>{status && <p className="hub-data-error">{status}</p>}<div className="hub-record-grid">{visible.map((doc, index) => <article className="hub-record" key={doc.id}><div className="hub-record-index">{String(index + 1).padStart(2, "0")}</div><div className="hub-record-values"><div><span>FILE</span><strong>{doc.file_name}</strong></div><div><span>FOLDER</span><select aria-label={`Folder for ${doc.file_name}`} value={doc.folder || ""} onChange={(event) => move(doc, event.target.value)}><option value="">Vault root</option>{folderNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></div><div><span>SIZE</span><strong>{Math.ceil(doc.byte_size / 1024)} KB</strong></div></div><div className="hub-record-actions"><button type="button" onClick={() => open(doc)} aria-label={`Preview ${doc.file_name}`}><FileText /></button><button type="button" onClick={() => remove(doc)} aria-label={`Delete ${doc.file_name}`}><Trash2 /></button></div></article>)}</div>{!visible.length && <div className="hub-data-state">NO PRIVATE DOCUMENTS / VAULT READY</div>}</section>;
}
