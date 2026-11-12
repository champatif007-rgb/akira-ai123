import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  }

  let body;
  try {
    body = JSON.parse((await req.text()) || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid JSON");
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
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
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }
    contents.push({ role, parts });
  }
  if (!contents.length) {
    contents.push({ role: "user", parts: [{ text: "Hello" }] });
  }

  try {
    const ai = new GoogleGenAI({});
    const data = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        ...(system ? { systemInstruction: system } : {}),
      },
    });
    const text = (data.candidates || [])
      .map((c) => (c.content?.parts || []).map((p) => p.text || "").join(""))
      .join("\n")
      .trim();
    if (!text) {
      return Response.json({ error: "Empty reply from model" }, { status: 502, headers });
    }
    return new Response(text, {
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    const upstreamStatus = Number(error.status);
    const status = upstreamStatus === 429 ? 429 : upstreamStatus >= 400 && upstreamStatus < 500 ? 400 : 502;
    // SDK error messages may include request details; return a safe public message.
    return Response.json({ error: upstreamStatus === 429 ? "AI rate limit exceeded" : "Upstream request failed" }, { status, headers });
  }
};
