const ALLOWED_PATHS = [
  "/api/File/search",
  "/api/File/search_single",
  "/api/File/get_file",
  "/api/File/get_cif_file"
];

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, headers || {})
  });
}

export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get("Origin") || "";
    const allowed = String(env.ALLOW_ORIGINS || "https://gynb1.github.io,http://localhost:8080,http://127.0.0.1:8080")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const origin = allowed.indexOf(requestOrigin) !== -1 ? requestOrigin : allowed[0];
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (ALLOWED_PATHS.indexOf(url.pathname) === -1) {
      return json({ ok: false, error: "Path not allowed" }, 404, cors);
    }
    if (!env.CRYSTALSEEK_TOKEN) {
      return json({ ok: false, error: "CRYSTALSEEK_TOKEN is not configured" }, 500, cors);
    }

    const upstream = String(env.CRYSTALSEEK_API || "https://crystalseek.cn").replace(/\/$/, "");
    const authPrefix = String(env.CRYSTALSEEK_AUTH_PREFIX || "").trim();
    const headers = new Headers();
    headers.set("Content-Type", request.headers.get("Content-Type") || "application/json");
    headers.set("Authorization", authPrefix ? authPrefix + " " + env.CRYSTALSEEK_TOKEN : env.CRYSTALSEEK_TOKEN);
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

    let response;
    try {
      response = await fetch(upstream + url.pathname + url.search, {
        method: request.method,
        headers: headers,
        body: body
      });
      if (response.status === 401 && authPrefix !== "Bearer") {
        const retryHeaders = new Headers(headers);
        retryHeaders.set("Authorization", "Bearer " + env.CRYSTALSEEK_TOKEN);
        response = await fetch(upstream + url.pathname + url.search, {
          method: request.method,
          headers: retryHeaders,
          body: body
        });
      }
    } catch (error) {
      return json({ ok: false, error: "Upstream request failed", detail: String(error) }, 502, cors);
    }

    const outHeaders = new Headers(cors);
    outHeaders.set("Content-Type", response.headers.get("content-type") || "application/json; charset=utf-8");
    return new Response(response.body, {
      status: response.status,
      headers: outHeaders
    });
  }
};
