const http = require("node:http");
const { timingSafeEqual } = require("node:crypto");

const UPSTREAM_HOST = "194.15.36.113";
const UPSTREAM_PATH = "/cgi-bin/username-job.py";
const UPSTREAM_VIRTUAL_HOST = "lookup4allx.anjas.id";
const MAX_BODY_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const jobIdPattern = /^[A-Za-z0-9_-]{32,64}$/;

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

function requestUpstream({ method, path, body, adapterToken }) {
  return new Promise((resolve, reject) => {
    const upstream = http.request({
      hostname: UPSTREAM_HOST,
      path,
      method,
      headers: {
        Host: UPSTREAM_VIRTUAL_HOST,
        "X-Adapter-Token": adapterToken,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json", "Content-Length": body.length } : {}),
      },
      timeout: REQUEST_TIMEOUT_MS,
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
    if (body) upstream.end(body); else upstream.end();
  });
}

async function usernameJob(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (!["POST", "GET"].includes(request.method)) return response.status(405).json({ error: "Method not allowed" });

  if (!isAuthorized(proxyTokenHeader(request.headers), process.env.PROXY_TOKEN)) return response.status(401).json({ error: "Unauthorized" });
  const adapterToken = process.env.GETCONTACT_ADAPTER_TOKEN;
  if (!adapterToken) return response.status(500).json({ error: "Proxy is not configured" });

  let method = request.method;
  let path = UPSTREAM_PATH;
  let body;
  if (method === "POST") {
    const contentType = request.headers["content-type"] || "";
    if (!contentType.toLowerCase().startsWith("application/json")) return response.status(415).json({ error: "Content-Type must be application/json" });
    try {
      body = await readBody(request);
      JSON.parse(body.toString("utf8"));
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 400;
      return response.status(status).json({ error: status === 413 ? "Request body too large" : "Invalid JSON" });
    }
  } else {
    const jobId = Array.isArray(request.query?.id) ? request.query.id[0] : request.query?.id;
    if (typeof jobId !== "string" || !jobIdPattern.test(jobId)) return response.status(400).json({ error: "Invalid job ID" });
    path = `${UPSTREAM_PATH}?id=${encodeURIComponent(jobId)}`;
  }

  try {
    const upstream = await requestUpstream({ method, path, body, adapterToken });
    if (upstream.status >= 500) console.warn("getcontact username job proxy upstream error", { status: upstream.status });
    response.status(upstream.status);
    response.setHeader("Content-Type", upstream.contentType);
    return response.send(upstream.body);
  } catch (error) {
    console.error("getcontact username job proxy network error", { message: error instanceof Error ? error.message : "Unknown network error" });
    return response.status(502).json({ error: "Upstream adapter request failed" });
  }
}

module.exports = usernameJob;
module.exports.config = { api: { bodyParser: false } };
