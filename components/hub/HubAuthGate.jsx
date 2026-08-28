"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { createAuthService } from "@/lib/hub/auth.mjs";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export default function HubAuthGate({ children }) {
  const auth = useMemo(
    () => (supabase ? createAuthService(supabase) : null),
    []
  );
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth) {
      setChecking(false);
      return undefined;
    }

    let active = true;
    auth
      .getSession()
      .then((nextSession) => {
        if (active) setSession(nextSession);
      })
      .catch((nextError) => {
        if (active) setError(nextError.message);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    const unsubscribe = auth.subscribe((nextSession) => {
      setSession(nextSession);
      setChecking(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const nextSession = await auth.signIn(email, password);
      setSession(nextSession);
    } catch (nextError) {
      setError(nextError.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="hub-auth-state" role="status">
        <Radio aria-hidden="true" /> VERIFYING PRIVATE CHANNEL
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <section className="hub-auth-terminal">
        <div className="hub-auth-mark"><ShieldCheck aria-hidden="true" /></div>
        <span>CONFIGURATION REQUIRED / ENV-01</span>
        <h1>Private channel offline.</h1>
        <p>Add the public Supabase URL and anon key to activate authenticated modules.</p>
        <code>NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="hub-auth-terminal">
        <div className="hub-auth-mark"><LockKeyhole aria-hidden="true" /></div>
        <span>AUTHENTICATION GATE / PRIVATE</span>
        <h1>Identify operator.</h1>
        <p>Use the owner account configured in Supabase Authentication.</p>

        <form onSubmit={handleSubmit} className="hub-auth-form">
          <label>
            <span>EMAIL IDENTIFIER</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            <span>ACCESS KEY</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="hub-auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>
            <KeyRound aria-hidden="true" />
            {submitting ? "VERIFYING…" : "OPEN PRIVATE CHANNEL"}
          </button>
        </form>
      </section>
    );
  }

  return children;
}
