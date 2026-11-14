# JB STAR Cricket API proxy

This Worker keeps the CricketLiveAPI Bearer token on the server. Never put the provider token in website JavaScript, an Android APK, GitHub source, or chat.

## Routes

- `GET /live` → `/api/v1/cricket/matches/live` (10-second edge cache)
- `GET /recent` → `/api/v1/cricket/matches/recent` (120-second edge cache)
- `GET /upcoming` → `/api/v1/cricket/matches/upcoming` (300-second edge cache)

The Worker uses the confirmed API host `https://cricketliveapi.com` and Bearer authentication. It returns the provider JSON without reshaping it.

## Deploy

1. In Cloudflare, create a Worker named `jb-star-cricket-proxy`.
2. Deploy this folder using Wrangler (`cd workers/cricket-proxy && npx wrangler deploy`) or paste `index.js` into the Worker editor.
3. In Worker Settings → Variables and Secrets, add a **secret** named `CRICKETLIVEAPI_TOKEN` with a newly regenerated CricketLiveAPI token. Do not use the token exposed in earlier screenshots.
4. Set a custom Worker domain or use its `workers.dev` URL.
5. Test `GET https://YOUR-WORKER-HOST/live`, then `/recent` and `/upcoming`. A successful provider response should be HTTP 200 with JSON data.

## CORS

The initial allowlist includes the JB STAR GitHub Pages origin. If the production site uses another domain, add that exact origin to the allowlist in `index.js` before deployment.

## Important

This is a data API proxy, not a video streaming service. It does not provide broadcast video. The API plan's quota and entitlement limits still apply.
