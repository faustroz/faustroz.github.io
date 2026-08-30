const http = require("node:http");
const { timingSafeEqual } = require("node:crypto");

const UPSTREAM_HOST = "194.15.36.113";
const UPSTREAM_PATH = "/cgi-bin/username.py";
const UPSTREAM_VIRTUAL_HOST = "lookup4allx.anjas.id";
const MAX_BODY_BYTES = 1024 * 1024;

function isAuthorized(value, secret) {
  if (typeof value !== "string" || !secret) return false;
  const provided = Buffer.from(value);
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function proxyTokenHeader(headers) {
  const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === "x-proxy-token");
  const value = entry?.[1];
  return typeof value === "string" ? value : Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        request.resume();
        reject(Object.assign(new Error("Request body too large"), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function requestUpstream(body, adapterToken) {
  return new Promise((resolve, reject) => {
    const upstream = http.request({
      hostname: UPSTREAM_HOST,
      path: UPSTREAM_PATH,
      method: "POST",
      headers: {
        Host: UPSTREAM_VIRTUAL_HOST,
        "X-Adapter-Token": adapterToken,
        "Content-Type": "application/json",
        "Content-Length": body.length,
      },
      timeout: 10_000,
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode || 502,
        contentType: response.headers["content-type"] || "application/json",
        body: Buffer.concat(chunks),
      }));
    });

    upstream.on("timeout", () => upstream.destroy(new Error("Upstream request timed out")));
    upstream.on("error", reject);
    upstream.end(body);
  });
}

async function username(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });

  const proxyToken = process.env.PROXY_TOKEN;
  const suppliedToken = proxyTokenHeader(request.headers);
  const tokenMatch = isAuthorized(suppliedToken, proxyToken);
  if (!tokenMatch) {
    console.warn("getcontact username proxy authorization failed", {
      envPresent: Boolean(proxyToken),
      headerPresent: Boolean(suppliedToken),
      tokenMatch,
    });
    return response.status(401).json({ error: "Unauthorized" });
  }

  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/json")) return response.status(415).json({ error: "Content-Type must be application/json" });

  let body;
  try {
    body = await readBody(request);
    JSON.parse(body.toString("utf8"));
  } catch (error) {
    const status = error && error.statusCode ? error.statusCode : 400;
    return response.status(status).json({ error: status === 413 ? "Request body too large" : "Invalid JSON" });
  }

  const adapterToken = process.env.GETCONTACT_ADAPTER_TOKEN;
  if (!adapterToken) return response.status(500).json({ error: "Proxy is not configured" });

  try {
    const upstream = await requestUpstream(body, adapterToken);
    if (upstream.status >= 400) console.warn("getcontact username proxy upstream error", { status: upstream.status });
    response.status(upstream.status);
    response.setHeader("Content-Type", upstream.contentType);
    return response.send(upstream.body);
  } catch (error) {
    console.error("getcontact username proxy upstream network error", { message: error instanceof Error ? error.message : "Unknown network error" });
    return response.status(502).json({ error: "Upstream adapter request failed" });
  }
}

module.exports = username;
module.exports.config = { api: { bodyParser: false } };
