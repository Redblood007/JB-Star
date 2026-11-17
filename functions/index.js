const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const cricketToken = defineSecret("CRICKETLIVEAPI_TOKEN");
const API_BASE = "https://cricketliveapi.com/api/v1";
const responseCache = new Map();
const inFlightRequests = new Map();

const ROUTES = {
  live: { path: "/cricket/matches/live", ttl: 10 },
  recent: { path: "/cricket/matches/recent", ttl: 120 },
  upcoming: { path: "/cricket/matches/upcoming", ttl: 300 },
};

exports.cricketApi = onRequest(
  {
    region: "us-central1",
    cors: ["https://redblood007.github.io"],
    secrets: [cricketToken],
    timeoutSeconds: 20,
    memory: "256MiB",
    maxInstances: 5,
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const routeName = String(req.path || "/").replace(/^\/+|\/+$/g, "");
    const route = ROUTES[routeName];
    if (!route) {
      res.status(404).json({ error: "Unknown endpoint. Use /live, /recent, or /upcoming." });
      return;
    }

    const token = cricketToken.value();
    if (!token) {
      res.status(503).json({ error: "Cricket API token is not configured." });
      return;
    }

    const cached = responseCache.get(routeName);
    if (cached && cached.expiresAt > Date.now()) {
      res.set("Cache-Control", `public, max-age=${route.ttl}`);
      res.set("Content-Type", cached.contentType);
      res.set("X-JBStar-Cache", "HIT");
      res.status(cached.status).send(cached.body);
      return;
    }
    if (cached) responseCache.delete(routeName);

    let request = inFlightRequests.get(routeName);
    const cacheStatus = request ? "COALESCED" : "MISS";
    if (!request) {
      request = fetch(API_BASE + route.path, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12000),
      }).then(async (upstream) => ({
        status: upstream.status,
        contentType: upstream.headers.get("content-type") || "application/json; charset=utf-8",
        body: await upstream.text(),
      }));
      inFlightRequests.set(routeName, request);
    }

    try {
      const result = await request;
      if (result.status >= 200 && result.status < 300) {
        responseCache.set(routeName, {
          ...result,
          expiresAt: Date.now() + route.ttl * 1000,
        });
        res.set("Cache-Control", `public, max-age=${route.ttl}`);
      } else {
        res.set("Cache-Control", "no-store");
      }
      res.set("Content-Type", result.contentType);
      res.set("X-JBStar-Cache", cacheStatus);
      res.status(result.status).send(result.body);
    } catch (error) {
      console.error("Cricket provider request failed", error?.message || error);
      res.set("Cache-Control", "no-store");
      res.status(502).json({ error: "Cricket data provider is temporarily unavailable." });
    } finally {
      if (inFlightRequests.get(routeName) === request) {
        inFlightRequests.delete(routeName);
      }
    }
  }
);
