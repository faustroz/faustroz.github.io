"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Github,
  Home,
  Mail,
  Menu,
  UserRound,
  WalletCards,
  X,
  Youtube,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { HUB_MODULES, resolveActiveNav } from "@/lib/hub/navigation.mjs";

const primaryModules = HUB_MODULES.filter(({ id }) =>
  ["home", "finance", "youtube"].includes(id)
);

const secondaryModules = HUB_MODULES.filter(({ id }) =>
  ["projects", "about"].includes(id)
);

const primaryIcons = {
  home: Home,
  finance: WalletCards,
  youtube: Youtube,
};

const secondaryIcons = {
  projects: FolderKanban,
  about: UserRound,
};

export default function HubNavigation() {
  const pathname = usePathname();
  const active = resolveActiveNav(pathname);
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <header className="hub-header">
        <Link className="hub-brand" href="/" aria-label="Ferdy personal hub home">
          <span className="hub-brand-mark">FD</span>
          <span>_OS</span>
        </Link>

        <nav className="hub-desktop-nav" aria-label="Primary navigation">
          {HUB_MODULES.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={
                active === item.id || pathname === item.href ? "page" : undefined
              }
            >
              <span>{item.number}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hub-system-status" aria-label="All systems online">
          <i aria-hidden="true" />
          <span className="hub-status-long">ALL SYSTEMS ONLINE</span>
          <span className="hub-status-short">ONLINE</span>
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
          className={active === "more" ? "is-active" : undefined}
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
    </>
  );
}
