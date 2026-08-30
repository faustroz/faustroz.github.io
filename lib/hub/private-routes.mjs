const PRIVATE_PREFIXES = Object.freeze([
  "/finance",
  "/study",
  "/projects",
  "/settings",
  "/insights",
  "/vault",
  "/academic",
  "/trash",
  "/osint",
  "/phone-lookup",
]);

export function isPrivateHubRoute(pathname = "/") {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export { PRIVATE_PREFIXES };
