"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Github,
  ChartNoAxesCombined,
  Home,
  Mail,
  Menu,
  Search,
  Settings,
  WalletCards,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { HUB_MODULES, resolveActiveNav } from "@/lib/hub/navigation.mjs";
import GlobalSearch from "@/components/hub/GlobalSearch";
import QuickAdd from "@/components/hub/QuickAdd";
import NotificationCenter from "@/components/hub/NotificationCenter";

const primaryModules = HUB_MODULES.filter(({ id }) =>
  ["home", "finance"].includes(id)
);

const secondaryModules = HUB_MODULES.filter(({ id }) =>
  ["settings", "insights", "vault", "academic", "trash", "osint"].includes(id)
);

const desktopSections = [
  { label: "HOME", ids: ["home"] },
  { label: "WORKSPACE", ids: ["finance", "academic", "vault", "osint", "insights"] },
  { label: "SYSTEM", ids: ["trash", "settings"] },
];

const primaryIcons = {
  home: Home,
  finance: WalletCards,
};

const secondaryIcons = {
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
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  const closeSheet = (restoreFocus = false) => {
    if (restoreFocus) triggerRef.current?.focus();
    setOpen(false);
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
      if (event.key === "Escape") closeSheet(true);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const openSearch = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(false);
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
          <button type="button" className="hub-search-trigger" aria-label="Search private records" onClick={() => { setOpen(false); setSearchOpen(true); }}>
            <Search aria-hidden="true" /><span>SEARCH</span>
          </button>
          <i aria-hidden="true" />
          <span className="hub-status-long">All systems online</span>
          <span className="hub-status-short">Online</span>
        </div>
      </header>

      <nav className="hub-mobile-dock" aria-label="Mobile navigation">
        {primaryModules.map((item) => {
          const Icon = primaryIcons[item.id];
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active === item.id ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          ref={triggerRef}
          type="button"
          className={active === "more" || active === "osint" ? "is-active" : undefined}
          aria-label="Open more navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {open && (
        <div className="hub-sheet-backdrop" onMouseDown={() => closeSheet(true)}>
          <section
            className="hub-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="hub-sheet-heading">
              <div>
                <span>COMMAND DIRECTORY</span>
                <h2>More routes</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close more navigation"
                onClick={() => closeSheet(true)}
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="hub-sheet-links">
              {secondaryModules.map((item) => {
                const Icon = secondaryIcons[item.id];
                return (
                  <Link key={item.id} href={item.href} onClick={() => setOpen(false)}>
                    <span>{item.number}</span>
                    <Icon aria-hidden="true" />
                    <strong>{item.label}</strong>
                  </Link>
                );
              })}
              <a href="https://github.com/faustroz" target="_blank" rel="noreferrer">
                <span>EXT</span>
                <Github aria-hidden="true" />
                <strong>GitHub</strong>
              </a>
              <a href="mailto:ferdydiatmika171@gmail.com">
                <span>MSG</span>
                <Mail aria-hidden="true" />
                <strong>Email</strong>
              </a>
            </div>
          </section>
        </div>
      )}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
