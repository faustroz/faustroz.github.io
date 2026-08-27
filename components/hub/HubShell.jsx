"use client";

import { usePathname } from "next/navigation";
import HubNavigation from "@/components/hub/HubNavigation";

export default function HubShell({ children }) {
  const pathname = usePathname();
  const financeRoute = pathname?.startsWith("/finance/portfolio");
  const youtubeRoute = pathname?.startsWith("/youtube");
  const specialistRoute = financeRoute || youtubeRoute;
  const shellClasses = ["hub-shell"];

  if (specialistRoute) shellClasses.push("hub-shell--specialist");
  if (financeRoute) shellClasses.push("hub-shell--finance");
  if (youtubeRoute) shellClasses.push("hub-shell--youtube");

  return (
    <div className={shellClasses.join(" ")}>
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
