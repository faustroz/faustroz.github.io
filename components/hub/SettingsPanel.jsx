"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut, Save, ShieldCheck, Webhook } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function SettingsPanel() {
  const [user, setUser] = useState(null);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!active) return;
      setUser(userData.user);

      const { data, error } = await supabase
        .from("user_settings")
        .select("privacy_mode")
        .maybeSingle();
      if (error) throw error;
      if (active && data) setPrivacyMode(data.privacy_mode);
    };

    load()
      .catch((error) => active && setStatus(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const save = async () => {
    setStatus("WRITING SETTINGS…");
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, privacy_mode: privacyMode }, { onConflict: "user_id" });
    setStatus(error ? error.message : "SETTINGS COMMITTED");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/hub");
  };

  if (loading) return <div className="hub-data-state">READING OPERATOR PROFILE</div>;

  return (
    <div className="hub-settings-grid">
      <section className="hub-settings-card">
        <span>ACCOUNT / AUTHENTICATED</span>
        <ShieldCheck aria-hidden="true" />
        <h2>Operator account</h2>
        <dl><div><dt>Email</dt><dd>{user?.email || "—"}</dd></div><div><dt>User ID</dt><dd>{user?.id || "—"}</dd></div></dl>
        <button type="button" className="hub-danger-action" onClick={signOut}><LogOut /> SIGN OUT</button>
      </section>

      <section className="hub-settings-card">
        <span>PRIVACY / OWNER ONLY</span>
        <KeyRound aria-hidden="true" />
        <h2>Privacy controls</h2>
        <label className="hub-privacy-toggle">
          <input type="checkbox" checked={privacyMode} onChange={(event) => setPrivacyMode(event.target.checked)} />
          <span><strong>Private mode</strong><small>Keep module data behind Supabase Auth and owner-scoped RLS.</small></span>
        </label>
        <button type="button" onClick={save}><Save /> SAVE PRIVACY</button>
        {status && <p className="hub-settings-status">{status}</p>}
      </section>

      <section className="hub-settings-card hub-settings-card--wide">
        <span>INTEGRATIONS / PLACEHOLDERS</span>
        <Webhook aria-hidden="true" />
        <h2>Future API channels</h2>
        <div className="hub-integration-list">
          <div><strong>AI Memory API</strong><span>NOT CONNECTED</span><code>/api/memory — future authenticated access</code></div>
          <div><strong>Calendar Sync</strong><span>NOT CONNECTED</span><code>OAuth provider placeholder</code></div>
          <div><strong>Finance Import</strong><span>NOT CONNECTED</span><code>Read-only provider placeholder</code></div>
        </div>
      </section>
    </div>
  );
}
