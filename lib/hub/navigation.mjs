export const HUB_MODULES = Object.freeze([
  {
    id: "home",
    number: "00",
    label: "Home",
    href: "/hub",
    status: "ONLINE",
  },
  {
    id: "finance",
    number: "01",
    label: "Finance",
    href: "/finance",
    status: "LOCKED",
    privacy: "private",
  },
  {
    id: "study",
    number: "02",
    label: "Study",
    href: "/study",
    status: "PRIVATE",
    privacy: "private",
  },
  {
    id: "projects",
    number: "03",
    label: "Projects",
    href: "/projects",
    status: "PRIVATE",
    privacy: "private",
  },
  {
    id: "settings",
    number: "04",
    label: "Settings",
    href: "/settings",
    status: "PRIVATE",
    privacy: "private",
  },
  {
    id: "insights",
    number: "05",
    label: "Insights",
    href: "/insights",
    status: "LIVE",
    privacy: "private",
  },
  { id: "vault", number: "06", label: "Vault", href: "/vault", status: "PRIVATE", privacy: "private" },
  { id: "academic", number: "07", label: "Academic", href: "/academic", status: "PRIVATE", privacy: "private" },
  { id: "trash", number: "08", label: "Trash", href: "/trash", status: "PRIVATE", privacy: "private" },
  {
    id: "osint",
    number: "09",
    label: "OSINT",
    status: "PRIVATE",
    privacy: "private",
    children: Object.freeze([
      { id: "phone-lookup", label: "Phone Lookup", href: "/phone-lookup", status: "PRIVATE", privacy: "private" },
    ]),
  },
]);

export const LEGACY_ROUTES = Object.freeze({
  "/portfolio-tracker": "/finance/portfolio",
});

export function resolveActiveNav(pathname = "/") {
  if (pathname === "/hub" || pathname.startsWith("/hub/")) return "home";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/study")) return "study";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/settings") || pathname.startsWith("/insights") || pathname.startsWith("/vault") || pathname.startsWith("/academic") || pathname.startsWith("/trash") || pathname.startsWith("/phone-lookup")) {
    return "more";
  }
  return null;
}
