"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createGlobalSearchService } from "@/lib/hub/search.mjs";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export default function GlobalSearch({ open, onClose }) {
  const router = useRouter();
  const service = useMemo(() => (supabase ? createGlobalSearchService(supabase) : null), []);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ loading: false, error: "", authenticated: null, groups: [] });

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const term = query.trim();
    if (term.length < 2 || !service) {
      setState({ loading: false, error: "", authenticated: null, groups: [] });
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setState((current) => ({ ...current, loading: true, error: "" }));
      try {
        const result = await service.search(term);
        if (active) setState({ loading: false, error: "", ...result });
      } catch (error) {
        if (active) setState({ loading: false, error: error.message || "Search channel unavailable.", authenticated: null, groups: [] });
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query, service]);

  if (!open) return null;

  const selectResult = (href) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="hub-search-backdrop" onMouseDown={onClose}>
      <section className="hub-search-dialog" role="dialog" aria-modal="true" aria-label="Global private search" onMouseDown={(event) => event.stopPropagation()}>
        <header className="hub-search-heading">
          <div><span>GLOBAL RETRIEVAL / PRIVATE</span><h2>Search operations.</h2></div>
          <button type="button" aria-label="Close search" onClick={onClose}><X aria-hidden="true" /></button>
        </header>
        <label className="hub-search-input">
          <Search aria-hidden="true" />
          <input ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search finance, study, projects, documents" autoComplete="off" />
          {state.loading && <LoaderCircle className="hub-spin" aria-label="Searching" />}
        </label>
        <p className="hub-search-hint">TYPE AT LEAST 2 CHARACTERS · OWNER-ONLY RESULTS</p>
        {!isSupabaseConfigured ? <p className="hub-search-state">PRIVATE SEARCH UNAVAILABLE / SUPABASE NOT CONFIGURED</p>
          : query.trim().length < 2 ? <p className="hub-search-state">READY FOR A PARTIAL, CASE-INSENSITIVE SEARCH.</p>
          : state.authenticated === false ? <p className="hub-search-state">IDENTIFY OPERATOR TO SEARCH PRIVATE RECORDS.</p>
          : state.error ? <p className="hub-data-error" role="alert">{state.error}</p>
          : !state.loading && state.authenticated && state.groups.length === 0 ? <p className="hub-search-state">NO PRIVATE RECORDS MATCH THIS QUERY.</p>
          : <div className="hub-search-groups">
            {state.groups.map(({ group, results }) => (
              <section key={group} className="hub-search-group" aria-label={`${group} results`}>
                <h3>{group}<span>{String(results.length).padStart(2, "0")}</span></h3>
                {results.map((result) => (
                  <button key={result.id} type="button" onClick={() => selectResult(result.href)}>
                    <span className="hub-search-source">{result.source}</span>
                    <strong>{result.title}</strong>
                    {result.detail && <small>{result.detail}</small>}
                    <ArrowUpRight aria-hidden="true" />
                  </button>
                ))}
              </section>
            ))}
          </div>}
      </section>
    </div>
  );
}
