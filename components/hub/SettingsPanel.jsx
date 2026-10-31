"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut, Save, ShieldCheck, Volume2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_IMAGE_OCCLUSION_SOUND_SETTINGS, playImageOcclusionSound, readImageOcclusionSoundSettings, unlockImageOcclusionAudio, writeImageOcclusionSoundSettings } from "@/lib/hub/image-occlusion-sounds.mjs";

export default function SettingsPanel() {
  const [user, setUser] = useState(null);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [soundSettings, setSoundSettings] = useState({ ...DEFAULT_IMAGE_OCCLUSION_SOUND_SETTINGS });

  useEffect(() => {
    setSoundSettings(readImageOcclusionSoundSettings(window.localStorage));
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

  const updateSoundSettings = (updates) => {
    setSoundSettings((current) => {
      const next = { ...current, ...updates };
      writeImageOcclusionSoundSettings(window.localStorage, next);
      return next;
    });
  };

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

      <section className="hub-settings-card hub-settings-card--wide" aria-labelledby="occlusion-sounds-title">
        <span>ACADEMIC / IMAGE OCCLUSION</span>
        <Volume2 aria-hidden="true" />
        <h2 id="occlusion-sounds-title">Sound effects</h2>
        <label className="hub-privacy-toggle">
          <input type="checkbox" checked={soundSettings.enabled} onChange={(event) => updateSoundSettings({ enabled: event.target.checked })} />
          <span><strong>Sound Effects</strong><small>Short, subtle feedback for reveal, ratings, navigation, and saved collections. Stored on this device.</small></span>
        </label>
        <label className="hub-occlusion-sound-volume">
          <span><strong>Volume</strong><output>{soundSettings.volume}%</output></span>
          <input type="range" min="0" max="100" step="1" value={soundSettings.volume} disabled={!soundSettings.enabled} onChange={(event) => updateSoundSettings({ volume: Number(event.target.value) })} aria-label="Sound effect volume" />
        </label>
        <button type="button" disabled={!soundSettings.enabled} onClick={() => { unlockImageOcclusionAudio(window); playImageOcclusionSound("complete", window); }}><Volume2 /> PREVIEW SOUND</button>
      </section>
    </div>
  );
}
