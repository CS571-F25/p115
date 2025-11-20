import { onRequest } from "firebase-functions/v2/https";
import fetch from "node-fetch";

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
