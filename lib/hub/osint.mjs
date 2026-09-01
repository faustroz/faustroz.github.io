const number = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const text = (value, limit = 240) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const resultsFrom = (value) => Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : Array.isArray(value?.sites) ? value.sites : Array.isArray(value?.data) ? value.data : [];
const tagsFrom = (value) => Array.isArray(value) ? value.map((tag) => text(typeof tag === "string" ? tag : tag?.name || tag?.tag, 64)).filter(Boolean) : [];

export function normalizeUsernameResult(item, index = 0) {
  const source = item && typeof item === "object" ? item : {};
  const statusValue = source.status ?? source.state ?? source.result ?? source.found ?? source.exists;
  const rawStatus = typeof statusValue === "boolean" ? (statusValue ? "found" : "not found") : text(statusValue, 80).toLowerCase();
  const httpStatus = number(source.httpStatus ?? source.http_status ?? source.statusCode ?? source.status_code);
  const suspicious = httpStatus === 429 || /block|rate|captcha|uncertain|unknown|error|fail/.test(rawStatus);
  const possible = Boolean(source.found ?? source.exists ?? source.isFound ?? source.is_found) || /found|claimed|available|possible|exists/.test(rawStatus);
  return {
    id: text(source.id || source.site || source.name || source.site_name, 100) || `site-${index}`,
    site: text(source.site || source.name || source.site_name || source.platform, 100) || "Unnamed site",
    url: text(source.url || source.profileUrl || source.profile_url || source.link, 500),
    httpStatus,
    tags: tagsFrom(source.tags || source.categories),
    suspicious,
    possible,
    confidence: suspicious ? "uncertain" : "possible",
    label: suspicious ? "Needs review" : possible ? "Possible / Found" : rawStatus ? rawStatus : "Not reported",
  };
}

export function normalizeUsernameResponse(data) {
  const payload = data?.result || data?.data || data || {};
  return {
    username: text(payload.username || payload.query || payload.handle, 64),
    foundCount: number(payload.foundCount ?? payload.found_count ?? payload.found ?? payload.matches),
    checkedCount: number(payload.checkedCount ?? payload.checked_count ?? payload.checked ?? payload.total),
    results: resultsFrom(payload).map(normalizeUsernameResult),
  };
}

export function generateUsernameVariations(input, now = new Date()) {
  const original = text(input, 64).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,62}[a-z0-9]$|^[a-z0-9]$/i.test(original)) return [];
  const tokens = original.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[._-]+/).filter(Boolean);
  const compact = tokens.join("") || original.replace(/[._-]/g, "");
  const values = new Set([original, compact]);
  if (tokens.length > 1) {
    for (const separator of [".", "_", "-"]) values.add(tokens.join(separator));
    values.add(`${tokens[0][0]}${tokens.slice(1).join("")}`);
    values.add(`${tokens[0]}${tokens.at(-1)[0]}`);
    values.add([...tokens].reverse().join(""));
  }
  const year = String(now.getFullYear());
  for (const base of [...values].slice(0, 4)) {
    for (const suffix of ["1", "01", year.slice(-2), year]) values.add(`${base}${suffix}`);
  }
  if (compact.length > 10) values.add(compact.slice(0, 10));
  return [...values].filter((value) => value.length >= 2 && value.length <= 64 && /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/i.test(value)).slice(0, 24);
}

export function usernameFinding(username, result) {
  return {
    finding_type: "profile",
    label: `${result.site} / @${username}`,
    value: result.url || `@${username}`,
    source: "username_lookup",
    confidence: result.confidence || "possible",
    url: result.url || "",
    tags: result.tags || [],
    metadata: { username, platform: result.site, http_status: result.httpStatus, provider_label: result.label },
  };
}

export function pivotHref(finding) {
  const type = finding?.finding_type;
  const value = text(finding?.value, 320);
  const username = text(finding?.metadata?.username, 64);
  if (type === "phone") return `/phone-lookup?phone=${encodeURIComponent(value)}`;
  if (type === "username") return `/osint?username=${encodeURIComponent(value.replace(/^@/, ""))}`;
  if (type === "profile" && username) return `/osint?username=${encodeURIComponent(username)}`;
  if (finding?.url) return finding.url;
  return "";
}
