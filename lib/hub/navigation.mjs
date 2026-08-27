export const HUB_MODULES = Object.freeze([
  {
    id: "home",
    number: "00",
    label: "Home",
    href: "/",
    status: "ONLINE",
  },
  {
    id: "finance",
    number: "01",
    label: "Finance",
    href: "/finance/portfolio",
    status: "LOCKED",
    privacy: "private",
  },
  {
    id: "youtube",
    number: "02",
    label: "YouTube",
    href: "/youtube",
    status: "SYNC",
  },
  {
    id: "projects",
    number: "03",
    label: "Projects",
    href: "/projects",
    status: "LIVE",
  },
  {
    id: "about",
    number: "04",
    label: "About",
    href: "/about",
    status: "PROFILE",
  },
]);

export const LEGACY_ROUTES = Object.freeze({
  "/portfolio-tracker": "/finance/portfolio",
  "/youtube-tracker": "/youtube",
});

export function resolveActiveNav(pathname = "/") {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/finance/portfolio")) return "finance";
  if (pathname.startsWith("/youtube")) return "youtube";
  if (pathname.startsWith("/projects") || pathname.startsWith("/about")) {
    return "more";
  }
  return null;
}
