# cancertracker-relay

A single Vercel serverless function that relays CancerTracker's Muse Ember
calls to the Meta Model API. The app's own hosting cannot reach api.meta.ai;
this function runs on Vercel and calls Meta server-to-server.

- `GET /api/ember` — reachability probe (returns Meta's HTTP status for an
  unauthenticated models call; 401 means the road is open).
- `POST /api/ember` — requires header `x-relay-secret` matching the
  `RELAY_SECRET` env var; forwards the chat-completions body to
  `https://api.meta.ai/v1/chat/completions` with
  `Authorization: Bearer META_MODEL_API_KEY` and returns Meta's response.

Environment variables (Vercel project settings):
- `META_MODEL_API_KEY` — the Meta Model API key (set by the account owner).
- `RELAY_SECRET` — a shared secret the CancerTracker app presents on each call.
