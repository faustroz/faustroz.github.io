const PRIVATE_PREFIXES = Object.freeze([
  "/finance",
  "/study",
  "/projects",
  "/memory",
  "/settings",
  "/insights",
  "/vault",
  "/academic",
  "/trash",
]);

export function isPrivateHubRoute(pathname = "/") {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export { PRIVATE_PREFIXES };
