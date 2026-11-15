"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HubNavigation from "@/components/hub/HubNavigation";
import HubAuthGate from "@/components/hub/HubAuthGate";
import { isPrivateHubRoute } from "@/lib/hub/private-routes.mjs";
import { HUB_THEME_CHANGE_EVENT, readHubTheme, resolveHubTheme } from "@/lib/hub/theme.mjs";

export default function HubShell({ children }) {
  const pathname = usePathname();
  const contentRef = useRef(null);
  const previousPathname = useRef(pathname);
  const pageAnimation = useRef(null);
  const portfolioLanding = pathname === "/";
  const financeRoute = pathname?.startsWith("/finance/portfolio");
  const specialistRoute = financeRoute;
  const academicRoute = pathname === "/academic";
  const practiceRoute = pathname === "/academic/practice";
  const occlusionRoute = pathname === "/academic/occlusion";
  const immersiveStudyRoute = practiceRoute || occlusionRoute;
  const privateRoute = isPrivateHubRoute(pathname);
  const [theme, setTheme] = useState("dark");
  const shellClasses = ["hub-shell"];

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: light)");
    const sync = () => setTheme(resolveHubTheme(readHubTheme(window.localStorage), media?.matches));
    sync();
    window.addEventListener(HUB_THEME_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    media?.addEventListener?.("change", sync);
    return () => {
      window.removeEventListener(HUB_THEME_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
      media?.removeEventListener?.("change", sync);
    };
  }, []);

  if (specialistRoute) shellClasses.push("hub-shell--specialist");
  if (financeRoute) shellClasses.push("hub-shell--finance");
  if (immersiveStudyRoute) shellClasses.push("hub-shell--practice");
  if (academicRoute) shellClasses.push("hub-shell--academic");
  if (theme === "light") shellClasses.push("hub-theme-light");

  useEffect(() => {
    if (previousPathname.current === pathname) return undefined;
    previousPathname.current = pathname;
    if (immersiveStudyRoute || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    pageAnimation.current?.cancel();
    pageAnimation.current = contentRef.current?.animate(
      [
        { opacity: 0, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 175, easing: "cubic-bezier(.2,.7,.2,1)" },
    );

    return () => pageAnimation.current?.cancel();
  }, [pathname, immersiveStudyRoute]);

  if (portfolioLanding) return children;

  if (specialistRoute) {
    return (
      <div className={shellClasses.join(" ")}>
        <div className="hub-content" ref={contentRef}>
          {privateRoute ? <HubAuthGate>{children}</HubAuthGate> : children}
        </div>
      </div>
    );
  }

  return (
    <div className={shellClasses.join(" ")}>
      {!immersiveStudyRoute && <HubNavigation />}
      <div className="hub-content" ref={contentRef}>
        {privateRoute ? <HubAuthGate>{children}</HubAuthGate> : children}
      </div>
      {!specialistRoute && !immersiveStudyRoute && (
        <footer className="hub-footer">
          <span>4allx / Personal Hub</span>
          <span>© {new Date().getFullYear()} Ferdy Diatmika</span>
        </footer>
      )}
    </div>
  );
}
