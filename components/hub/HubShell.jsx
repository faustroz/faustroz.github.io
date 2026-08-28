"use client";

import { usePathname } from "next/navigation";
import HubNavigation from "@/components/hub/HubNavigation";
import HubAuthGate from "@/components/hub/HubAuthGate";
import { isPrivateHubRoute } from "@/lib/hub/private-routes.mjs";

export default function HubShell({ children }) {
  const pathname = usePathname();
  const portfolioLanding = pathname === "/";
  const financeRoute = pathname?.startsWith("/finance/portfolio");
  const specialistRoute = financeRoute;
  const privateRoute = isPrivateHubRoute(pathname);
  const shellClasses = ["hub-shell"];

  if (specialistRoute) shellClasses.push("hub-shell--specialist");
  if (financeRoute) shellClasses.push("hub-shell--finance");

  if (portfolioLanding) return children;

  if (specialistRoute) {
    return (
      <div className={shellClasses.join(" ")}>
        <div className="hub-content">
          {privateRoute ? <HubAuthGate>{children}</HubAuthGate> : children}
        </div>
      </div>
    );
  }

  return (
    <div className={shellClasses.join(" ")}>
      <HubNavigation />
      <div className="hub-content">
        {privateRoute ? <HubAuthGate>{children}</HubAuthGate> : children}
      </div>
      {!specialistRoute && (
        <footer className="hub-footer">
          <span>4allx / PERSONAL HUB</span>
          <span>© {new Date().getFullYear()} FERDY DIATMIKA</span>
        </footer>
      )}
    </div>
  );
}
