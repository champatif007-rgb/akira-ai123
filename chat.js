/**
 * Netlify serverless function — same pattern as the public Akira demo.
 * Set site env var: GEMINI_API_KEY (free from https://aistudio.google.com/app/apikey)
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server is missing GEMINI_API_KEY. In Netlify: Site settings → Environment variables → add GEMINI_API_KEY.",
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const system = String(body.system || "");
  const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];

  const contents = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i] || {};
    const role = m.role === "model" || m.role === "assistant" ? "model" : "user";
    const parts = [{ text: String(m.text || m.content || "") }];
    if (m.image && typeof m.image === "string") {
      const match = m.image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
      }
    }
    contents.push({ role, parts });
  }
  if (!contents.length) {
    contents.push({ role: "user", parts: [{ text: "Hello" }] });
  }

  const payload = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };
  if (system) payload.system_instruction = { parts: [{ text: system }] };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = (data.error && data.error.message) || `Upstream error ${res.status}`;
      const status = res.status === 429 ? 429 : res.status >= 500 ? 502 : 400;
      return {
        statusCode: status,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: msg }),
      };
    }

    const text = (data.candidates || [])
      .map((c) => ((c.content && c.content.parts) || []).map((p) => p.text || "").join(""))
      .join("\n")
      .trim();

    if (!text) {
      return {
        statusCode: 502,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Empty reply from model" }),
      };
    }

    // Plain text so the frontend can treat it like a simple stream body
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: e.message || "Upstream request failed" }),
    };
  }
};
