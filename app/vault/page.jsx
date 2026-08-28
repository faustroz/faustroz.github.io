import VaultPanel from "@/components/hub/VaultPanel";
export const metadata = { title: "Document Vault — Personal Hub" };
export default function VaultPage() { return <main className="hub-private-page"><header className="hub-private-heading"><span>07 / DOCUMENT VAULT</span><h1>Private files, indexed.</h1><p>Encrypted-in-transit objects in a private Supabase Storage bucket, searchable only through owner-scoped policies.</p></header><VaultPanel /></main>; }
