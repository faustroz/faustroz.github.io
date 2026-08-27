"use client";

import { usePathname } from "next/navigation";
import HubNavigation from "@/components/hub/HubNavigation";

export default function HubShell({ children }) {
  const pathname = usePathname();
  const specialistRoute =
    pathname?.startsWith("/finance/portfolio") || pathname?.startsWith("/youtube");

  return (
    <div className={`hub-shell${specialistRoute ? " hub-shell--specialist" : ""}`}>
      <HubNavigation />
      <div className="hub-content">{children}</div>
      {!specialistRoute && (
        <footer className="hub-footer">
          <span>FD_OS / PERSONAL HUB</span>
          <span>© {new Date().getFullYear()} FERDY DIATMIKA</span>
        </footer>
      )}
    </div>
  );
}
