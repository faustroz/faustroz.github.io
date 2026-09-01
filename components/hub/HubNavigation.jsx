"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChartNoAxesCombined, Home, Search, Settings, WalletCards, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { HUB_MODULES, resolveActiveNav } from "@/lib/hub/navigation.mjs";
import GlobalSearch from "@/components/hub/GlobalSearch";
import QuickAdd from "@/components/hub/QuickAdd";
import NotificationCenter from "@/components/hub/NotificationCenter";

const mobileSections = [
  { id: "workspace", label: "Workspace", heading: "Workspace routes", ids: ["finance", "academic", "vault", "osint", "insights"], icon: WalletCards },
  { id: "system", label: "System", heading: "System routes", ids: ["trash", "settings"], icon: Settings },
];

const desktopSections = [
  { label: "HOME", ids: ["home"] },
  { label: "WORKSPACE", ids: ["finance", "academic", "vault", "osint", "insights"] },
  { label: "SYSTEM", ids: ["trash", "settings"] },
];

const secondaryIcons = {
  finance: WalletCards,
  settings: Settings,
  insights: ChartNoAxesCombined,
  vault: WalletCards,
  academic: ChartNoAxesCombined,
  trash: X,
  osint: Search,
};

export default function HubNavigation() {
  const pathname = usePathname();
  const active = resolveActiveNav(pathname);
  const [mobileSheet, setMobileSheet] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const triggerRefs = useRef({});
  const closeRef = useRef(null);
  const open = Boolean(mobileSheet);

  const closeSheet = (restoreFocus = false) => {
    if (restoreFocus && mobileSheet) triggerRefs.current[mobileSheet]?.focus();
    setMobileSheet(null);
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) closeRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        if (mobileSheet) triggerRefs.current[mobileSheet]?.focus();
        setMobileSheet(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, mobileSheet]);

  useEffect(() => {
    setMobileSheet(null);
  }, [pathname]);

  useEffect(() => {
    const openSearch = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMobileSheet(null);
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  return (
    <>
      <header className="hub-header">
        <Link className="hub-brand" href="/hub" aria-label="Ferdy personal hub home">
          <span className="hub-brand-mark">4a</span>
          <span>llx</span>
        </Link>

        <nav className="hub-desktop-nav" aria-label="Primary navigation">
          {desktopSections.map((section) => (
            <section className="hub-nav-section" key={section.label} aria-label={section.label}>
              <span className="hub-nav-section-label">{section.label}</span>
              {section.ids.map((id) => {
                const item = HUB_MODULES.find((module) => module.id === id);
                if (!item) return null;
                return <Link key={item.id} href={item.href} aria-current={active === item.id || pathname === item.href ? "page" : undefined}>
                  <span>{item.number}</span>
                  {item.label}
                </Link>;
              })}
            </section>
          ))}
        </nav>

        <div className="hub-system-status" aria-label="System controls">
          <QuickAdd />
          <NotificationCenter />
          <button type="button" className="hub-search-trigger" aria-label="Search private records" onClick={() => { setMobileSheet(null); setSearchOpen(true); }}>
            <Search aria-hidden="true" /><span>SEARCH</span>
          </button>
          <i aria-hidden="true" />
          <span className="hub-status-long">All systems online</span>
          <span className="hub-status-short">Online</span>
        </div>
      </header>

      <nav className="hub-mobile-dock" aria-label="Mobile navigation">
        <Link href="/hub" aria-current={active === "home" ? "page" : undefined}>
          <Home aria-hidden="true" />
          <span>Home</span>
        </Link>
        {mobileSections.map((section) => {
          const Icon = section.icon;
          const isActive = section.ids.includes(active);
          return <button
            key={section.id}
            ref={(node) => { triggerRefs.current[section.id] = node; }}
            type="button"
            className={isActive ? "is-active" : undefined}
            aria-label={`Open ${section.label} navigation`}
            aria-current={isActive ? "page" : undefined}
            aria-expanded={mobileSheet === section.id}
            onClick={() => setMobileSheet(section.id)}
          >
            <Icon aria-hidden="true" />
            <span>{section.label}</span>
          </button>;
        })}
      </nav>

      {open && (
        <div className="hub-sheet-backdrop" onMouseDown={() => closeSheet(true)}>
          <section
            className="hub-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`${mobileSheet === "workspace" ? "Workspace" : "System"} navigation`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="hub-sheet-heading">
              <div>
                <span>COMMAND DIRECTORY</span>
                <h2>{mobileSections.find(({ id }) => id === mobileSheet)?.heading}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close navigation"
                onClick={() => closeSheet(true)}
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="hub-sheet-links">
              {mobileSections.find(({ id }) => id === mobileSheet)?.ids.map((id) => {
                const item = HUB_MODULES.find((module) => module.id === id);
                if (!item) return null;
                const Icon = secondaryIcons[item.id];
                return (
                  <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} onClick={() => setMobileSheet(null)}>
                    <span>{item.number}</span>
                    <Icon aria-hidden="true" />
                    <strong>{item.label}</strong>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
