// Server-only adapter boundary. It deliberately does not emulate the GetContact
// mobile client or include private request signing. Point this at an endpoint
// you are authorised to operate, then keep its access token in Supabase secrets.

type LookupAction = "profile" | "tags" | "quota";
type LookupRequest = { action: LookupAction; phone?: string };

const text = (value: unknown, limit = 160) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const list = (value: unknown) => Array.isArray(value) ? value.map((item) => text(item, 100)).filter(Boolean).slice(0, 50) : [];

export async function getContactLookup(request: LookupRequest) {
  const url = Deno.env.get("GETCONTACT_ADAPTER_URL");
  const token = Deno.env.get("GETCONTACT_ADAPTER_TOKEN");
  if (!url || !token) throw new Error("Phone Lookup provider is not configured.");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Adapter-Token": token,
      "Host": "lookup4allx.anjas.id",
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "Provider quota reached." : "Phone Lookup provider request failed.");
  const body = await response.json();

  if (request.action === "profile") {
    const profile = body?.profile || body?.data || body || {};
    return { kind: "profile", displayName: text(profile.displayName || profile.name), tagCount: Number(profile.tagCount || profile.tagsCount || 0) || 0, email: text(profile.email), phone: request.phone };
  }
  if (request.action === "tags") {
    const tags = list(body?.tags || body?.data?.tags || body?.data || []);
    return { kind: "tags", tags, tagCount: Number(body?.tagCount || body?.data?.tagCount || tags.length) || tags.length, phone: request.phone };
  }
  const quota = body?.quota || body?.data || body || {};
  return { kind: "quota", search: Number(quota.search || quota.searchRemaining || 0) || 0, numberDetail: Number(quota.numberDetail || quota.numberDetailRemaining || 0) || 0, resetsAt: text(quota.resetsAt || quota.resetDate, 64) };
}
