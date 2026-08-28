const PRIVATE_PREFIXES = Object.freeze([
  "/finance",
  "/study",
  "/projects",
  "/memory",
  "/settings",
  "/insights",
]);

export function isPrivateHubRoute(pathname = "/") {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export { PRIVATE_PREFIXES };
