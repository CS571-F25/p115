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
