"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import HubNavigation from "@/components/hub/HubNavigation";
import HubAuthGate from "@/components/hub/HubAuthGate";
import { isPrivateHubRoute } from "@/lib/hub/private-routes.mjs";

export default function HubShell({ children }) {
  const pathname = usePathname();
  const contentRef = useRef(null);
  const previousPathname = useRef(pathname);
  const pageAnimation = useRef(null);
  const portfolioLanding = pathname === "/";
  const financeRoute = pathname?.startsWith("/finance/portfolio");
  const specialistRoute = financeRoute;
  const practiceRoute = pathname === "/academic/practice";
  const privateRoute = isPrivateHubRoute(pathname);
  const shellClasses = ["hub-shell"];

  if (specialistRoute) shellClasses.push("hub-shell--specialist");
  if (financeRoute) shellClasses.push("hub-shell--finance");
  if (practiceRoute) shellClasses.push("hub-shell--practice");

  useEffect(() => {
    if (previousPathname.current === pathname) return undefined;
    previousPathname.current = pathname;
    if (pathname === "/academic/practice" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    pageAnimation.current?.cancel();
    pageAnimation.current = contentRef.current?.animate(
      [
        { opacity: 0, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 175, easing: "cubic-bezier(.2,.7,.2,1)" },
    );

    return () => pageAnimation.current?.cancel();
  }, [pathname]);

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
      {!practiceRoute && <HubNavigation />}
      <div className="hub-content" ref={contentRef}>
        {privateRoute ? <HubAuthGate>{children}</HubAuthGate> : children}
      </div>
      {!specialistRoute && !practiceRoute && (
        <footer className="hub-footer">
          <span>4allx / Personal Hub</span>
          <span>© {new Date().getFullYear()} Ferdy Diatmika</span>
        </footer>
      )}
    </div>
  );
}
