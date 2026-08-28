"use client";
import { useState } from "react";
import { Webhook } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
const providers = [["github", "GitHub"], ["google_calendar", "Google Calendar"], ["ai", "AI API"]];
export default function IntegrationPanel() {
  const [status, setStatus] = useState("");
  const check = async (provider) => { setStatus(`CHECKING ${provider.toUpperCase()}…`); const { data, error } = await requireSupabase().functions.invoke("integrations", { body: { provider, action: "status" } }); setStatus(error ? error.message : data.configured ? `${provider.toUpperCase()} SECRET DETECTED / COMPLETE PROVIDER SETUP TO CONNECT` : `${provider.toUpperCase()} NOT CONFIGURED IN SUPABASE SECRETS`); };
  return <section className="hub-settings-card hub-settings-card--wide"><span>INTEGRATIONS / SERVER-SIDE ONLY</span><Webhook /><h2>Provider control plane</h2><p>Secrets never leave Supabase Edge Functions. This static PWA can only read safe connection status.</p><div className="hub-integration-list">{providers.map(([id, label]) => <div key={id}><strong>{label}</strong><span>SERVER CHECK</span><button type="button" onClick={() => check(id)}>CHECK SECRET</button></div>)}</div>{status && <p className="hub-settings-status">{status}</p>}</section>;
}
