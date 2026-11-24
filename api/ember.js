// CancerTracker Ember relay.
// The CancerTracker app's hosting cannot reach api.meta.ai directly, so the
// app calls this function instead, and this function calls the Meta Model API
// server-to-server. The Meta API key lives only in this project's Vercel
// environment variables (META_MODEL_API_KEY) and is never sent to the app or
// to any browser. Callers must present the shared RELAY_SECRET.

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Health/reachability probe: an unauthenticated models call should come
    // back with an HTTP status from Meta (401 is expected and means the road
    // is open). A fetch throw means this host cannot reach Meta either.
    try {
      const r = await fetch("https://api.meta.ai/v1/models");
      return res.status(200).json({ ok: true, meta_status: r.status });
    } catch (e) {
      return res.status(200).json({ ok: false, error: String(e && e.message || e) });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const secret = process.env.RELAY_SECRET || "";
  if (!secret || req.headers["x-relay-secret"] !== secret) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const key = process.env.META_MODEL_API_KEY || "";
  if (!key) {
    return res.status(500).json({ error: "META_MODEL_API_KEY is not set on the relay" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "invalid JSON body" }); }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "missing JSON body" });
  }

  const payload = {
    model: typeof body.model === "string" && body.model.startsWith("muse-") ? body.model : "muse-ember-1.0",
    messages: body.messages,
    temperature: typeof body.temperature === "number" ? body.temperature : 0.3,
    max_tokens: typeof body.max_tokens === "number" ? body.max_tokens : 8000,
  };
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    const r = await fetch("https://api.meta.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: `relay could not reach Meta: ${String(e && e.message || e)}` });
  }
}
