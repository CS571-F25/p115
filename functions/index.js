import { onRequest } from "firebase-functions/v2/https";

export const finnhubNews = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    console.error("Missing Finnhub API key");
    return res.status(500).json({ error: "Missing API key" });
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Finnhub error:", err);
    res.status(500).json({ error: "Finnhub API failed" });
  }
});

export const finnhubQuote = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.FINNHUB_API_KEY;
  const symbol = req.query.symbol || req.query.ticker;

  if (!apiKey) {
    console.error("Missing Finnhub API key");
    return res.status(500).json({ error: "Missing API key" });
  }

  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol" });
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Finnhub quote error:", err);
    res.status(500).json({ error: "Finnhub quote failed" });
  }
});

export const finnhubMetrics = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.FINNHUB_API_KEY;
  const symbol = req.query.symbol || req.query.ticker;

  if (!apiKey) {
    console.error("Missing Finnhub API key");
    return res.status(500).json({ error: "Missing API key" });
  }

  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol" });
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey}`
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Finnhub metrics error:", err);
    res.status(500).json({ error: "Finnhub metrics failed" });
  }
});

export const finnhubProfile = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.FINNHUB_API_KEY;
  const symbol = req.query.symbol || req.query.ticker;

  if (!apiKey) {
    console.error("Missing Finnhub API key");
    return res.status(500).json({ error: "Missing API key" });
  }

  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol" });
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Finnhub profile error:", err);
    res.status(500).json({ error: "Finnhub profile failed" });
  }
});

// Symbol lookup (name/symbol/ISIN/CUSIP)
export const finnhubLookup = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.FINNHUB_API_KEY;
  const query = req.query.q;
  const exchange = req.query.exchange;

  if (!apiKey) {
    console.error("Missing Finnhub API key");
    return res.status(500).json({ error: "Missing API key" });
  }

  if (!query) {
    return res.status(400).json({ error: "Missing query parameter q" });
  }

  try {
    const url = new URL("https://finnhub.io/api/v1/search");
    url.searchParams.set("q", query);
    if (exchange) url.searchParams.set("exchange", exchange);
    url.searchParams.set("token", apiKey);

    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("finnhub lookup error:", err);
    res.status(500).json({ error: "Finnhub lookup failed" });
  }
});

export const redditTopPosts = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const timeframe = req.query.t || "day";

  try {
    const url = new URL("https://www.reddit.com/r/stocks/top.json");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("t", timeframe);
    url.searchParams.set("raw_json", "1");

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Reddit API error:", response.status, errorBody);
      return res.status(502).json({ error: "Reddit API failed", status: response.status });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("Reddit fetch error:", err);
    return res.status(500).json({ error: "Reddit fetch failed" });
  }
});

// Chat proxy to keep the OpenAI API key server-side
export const chatProxy = onRequest({ secrets: ["OPENAI_API_KEY"] }, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY");
    return res.status(500).json({ error: "Api not configured" });
  }

  const body = req.body || {};
  const messagesInput = Array.isArray(body.messages) ? body.messages : [];
  const trimmedMessages = messagesInput
    .map((m) => ({
      role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content.slice(0, 2000) : ""
    }))
    .filter((m) => m.content)
    .slice(-12); // keep last 12 turns to limit payload

  if (!trimmedMessages.length) {
    trimmedMessages.push({
      role: "user",
      content: "Hello, can you assist me with trading questions?"
    });
  }

  const model = body.model || "gpt-4o-mini";
  const temperature = Number.isFinite(body.temperature) ? body.temperature : 0.4;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: trimmedMessages,
        max_tokens: body.max_tokens || 400
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", response.status, errText);
      return res.status(response.status).json({ error: "OpenAI API failed" });
    }

    const data = await response.json();
    const firstChoice = data?.choices?.[0]?.message;

    return res.status(200).json({
      reply: firstChoice,
      usage: data?.usage
    });
  } catch (err) {
    console.error("Chat proxy error:", err);
    return res.status(500).json({ error: "Failed to reach OpenAI" });
  }
});
