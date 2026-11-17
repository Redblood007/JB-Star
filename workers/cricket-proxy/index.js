const API_BASE = "https://cricketliveapi.com/api/v1";
const ROUTES = {
  live: { path: "/cricket/matches/live", ttl: 10 },
  recent: { path: "/cricket/matches/recent", ttl: 120 },
  upcoming: { path: "/cricket/matches/upcoming", ttl: 300 },
};

function corsHeaders(origin) {
  const allowed = new Set([
    "https://redblood007.github.io",
    "https://jb-star.pages.dev",
  ]);
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
  if (allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
    }
    if (!env.CRICKETLIVEAPI_TOKEN) {
      return Response.json({ error: "Cricket API is not configured" }, { status: 503, headers: cors });
    }

    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/+|\/+$/g, "");
    const route = ROUTES[key];
    if (!route) {
      return Response.json({ error: "Unknown endpoint. Use /live, /recent, or /upcoming." }, { status: 404, headers: cors });
    }

    const cache = caches.default;
    const cacheKey = new Request(new URL(url.pathname, url.origin).toString(), { method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
      response.headers.set("X-JBStar-Cache", "HIT");
      return response;
    }

    try {
      const upstream = await fetch(API_BASE + route.path, {
        headers: {
          Authorization: `Bearer ${env.CRICKETLIVEAPI_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      const body = await upstream.text();
      const headers = new Headers({
        "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${route.ttl}`,
        ...cors,
      });
      headers.set("X-JBStar-Cache", "MISS");
      const response = new Response(body, { status: upstream.status, headers });
      if (upstream.ok) ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch {
      return Response.json({ error: "Cricket data provider is temporarily unavailable" }, { status: 502, headers: cors });
    }
  },
};
