import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { marked } from "marked";
import PriceChart from "../components/PriceChart";
import TradePanel from "../components/TradePanel";

export default function Stock(props) {
  const { ticker } = useParams();
  const normalizeShares = (value) => {
    if (!Number.isFinite(value)) return 0;
    const rounded = Number(value.toFixed(2));
    return Math.abs(rounded) < 0.005 ? 0 : rounded;
  };
  const normalizeHoldings = (raw) => {
    const safe = raw && typeof raw === 'object' ? raw : {};
    const next = {};
    Object.entries(safe).forEach(([sym, val]) => {
      const shares = normalizeShares(val?.shares ?? 0);
      const avgPrice = Number.isFinite(val?.avgPrice) ? Number(val.avgPrice) : 0;
      if (shares > 0) {
        next[sym.toUpperCase()] = { shares, avgPrice };
      }
    });
    return next;
  };

  const [validTicker, setValidTicker] = useState(false);
  const [error, setError] = useState(null);

  const [info, setInfo] = useState(null);
  const [quotes, setQuotes] = useState(null);
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [holdings, setHoldings] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem('paperHoldings');
      const parsed = saved ? JSON.parse(saved) : {};
      return normalizeHoldings(parsed);
    } catch (err) {
      console.error('bad holdings cache', err);
      return {};
    }
  });
  const [watchlist, setWatchlist] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem('watchlist');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('bad watchlist cache', err);
      return [];
    }
  });

  const chatEndpoint = useMemo(() => {
    if (import.meta.env.VITE_CHAT_PROXY_URL) return import.meta.env.VITE_CHAT_PROXY_URL;
    return 'https://chatproxy-q2lidtpoma-uc.a.run.app';
  }, []);

  useEffect(() => {
    if (!ticker) return;
    
    setValidTicker(false);
    setError(null);

    setInfo();
    setQuotes(null);
    setProfile(null);
    setMetrics(null);
    setAiSummary('');
    setAiError(null);

    stockLookup();
    loadQuotes();
    loadProfile();
    loadMetrics();
  }, [ticker]);

  useEffect(() => {
    if (!validTicker) return;
    fetchAiSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validTicker, ticker]);

  function stockLookup() {
    fetch(`https://finnhublookup-q2lidtpoma-uc.a.run.app?q=${ticker}&exchange=US`)
      .then(res => {
        if (res.status !== 200) {
          console.log("error fetching metrics");
          return null;
        }
        console.log("successfully fetched metrics");
        return res.json();
      })
      .then(data => {
        if (data) setInfo(data.result[0]);
        console.log(data.result[0])
      })
      .catch(() => {});
  }

  function loadQuotes() {
    fetch(`https://finnhubquote-q2lidtpoma-uc.a.run.app?symbol=${ticker}`)
      .then(res => {
        if (res.status !== 200) {
          console.log("error fetching quotes");
          setError("Could not fetch quote for that ticker.");
          setValidTicker(false);
          return null;
        }
        setValidTicker(true);
        console.log("successfully fetched quotes");
        return res.json();
      })
      .then(data => {
        if (data) setQuotes(data);
      })
      .catch(() => {
        setError("Network error while fetching quote.");
        setValidTicker(false);
      });
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    const refreshHoldings = () => {
      if (typeof window === 'undefined') return;
      try {
        const saved = window.localStorage.getItem('paperHoldings');
        const parsed = saved ? JSON.parse(saved) : {};
        const normalized = normalizeHoldings(parsed);
        setHoldings(normalized);
        window.localStorage.setItem('paperHoldings', JSON.stringify(normalized));
      } catch (err) {
        console.error('holdings refresh error', err);
        setHoldings({});
      }
    };
    refreshHoldings();
    window.addEventListener('storage', refreshHoldings);
    window.addEventListener('portfolio-updated', refreshHoldings);
    return () => {
      window.removeEventListener('storage', refreshHoldings);
      window.removeEventListener('portfolio-updated', refreshHoldings);
    };
  }, []);

  function loadProfile() {
    fetch(`https://finnhubprofile-q2lidtpoma-uc.a.run.app?symbol=${ticker}`)
      .then(res => {
        if (res.status !== 200) {
          console.log("error fetching company profile");
          return null;
        }
        console.log("successfully fetched company profile");
        return res.json();
      })
      .then(data => {
        if (data) setProfile(data);
      })
      .catch(() => {});
  }

  function loadMetrics() {
    fetch(`https://finnhubmetrics-q2lidtpoma-uc.a.run.app?symbol=${ticker}`)
      .then(res => {
        if (res.status !== 200) {
          console.log("error fetching metrics");
          return null;
        }
        console.log("successfully fetched metrics");
        return res.json();
      })
      .then(data => {
        if (data) setMetrics(data);
      })
      .catch(() => {});
  }

  const price = quotes?.c ?? 0;
  const open = quotes?.o ?? 0;
  const high = quotes?.h ?? 0;
  const low = quotes?.l ?? 0;
  const prevClose = quotes?.pc ?? 0;
  const change = price - prevClose;
  const pct = prevClose ? (change / prevClose) * 100 : 0;
  const updated =
    quotes?.t && !Number.isNaN(quotes.t)
      ? new Date(quotes.t * 1000).toLocaleString()
      : "—";

  const dayRange = `$${low.toFixed(2)} - $${high.toFixed(2)}`;
  const fiftyTwoWLow = metrics?.metric?.["52WeekLow"] ?? 0;
  const fiftyTwoWHigh = metrics?.metric?.["52WeekHigh"] ?? 0;
  const fiftyTwoRange =
    fiftyTwoWLow && fiftyTwoWHigh
      ? `$${fiftyTwoWLow.toFixed(2)} - $${fiftyTwoWHigh.toFixed(2)}`
      : "—";
  const volumeRaw =
    metrics?.metric?.["10DayAverageTradingVolume"] ??
    metrics?.metric?.["3MonthAverageTradingVolume"] ??
    quotes?.v ??
    null;
  const volume = volumeRaw ? Number(volumeRaw).toLocaleString() : "—";
  const marketCap =
    metrics?.metric?.marketCapitalization && !Number.isNaN(metrics.metric.marketCapitalization)
      ? `$${metrics.metric.marketCapitalization.toLocaleString()}`
      : "—";

  const companySector = profile?.finnhubIndustry || "ETF";
  const companyEmployees = profile?.employeeTotal ? profile.employeeTotal.toLocaleString() : "—";
  const companyHq =
    profile?.country && profile?.city ? `${profile.city}, ${profile.country}` : profile?.country || "—";
  const companyWeb = profile?.weburl || "—";
  const companyName = info?.description || profile?.name || "—";
  const normalizedTicker = (ticker || '').toUpperCase();
  const position = holdings[normalizedTicker] || { shares: 0, avgPrice: 0 };
  const marketPrice = price ? Number(price) : 0;
  const isInWatchlist = useMemo(
    () => watchlist.some((item) => item.symbol === normalizedTicker),
    [watchlist, normalizedTicker]
  );

  const toggleWatchlist = () => {
    if (!ticker) return;
    const symbol = normalizedTicker;
    const name = companyName && companyName !== '—' ? companyName : symbol;
    setWatchlist((prev) => {
      const exists = prev.some((item) => item.symbol === symbol);
      if (exists) {
        return prev.filter((item) => item.symbol !== symbol);
      }
      return [...prev, { symbol, name }];
    });
  };

  async function fetchAiSummary() {
    setAiLoading(true);
    setAiError(null);
    setAiSummary('');
    try {
      const payload = {
        messages: [
          {
            role: "system",
            content:
              "You are an equity research assistant. Provide a concise, neutral overview (max 4 bullets) covering business, recent price move, key risks, and next thing to watch. Do not give financial advice."
          },
          {
            role: "user",
            content: `Give a quick overview for ${ticker}. Name: ${companyName}. Exchange: ${profile?.exchange || "—"}. Sector: ${companySector}. Price: ${price ? price.toFixed(2) : "—"}. Daily change: ${pct.toFixed(2)}%. Day range: ${dayRange}. 52W range: ${fiftyTwoRange}. Market cap: ${marketCap}.`
          }
        ],
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 220
      };

      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'AI overview unavailable');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Stream not supported');
      const decoder = new TextDecoder();
      let buffer = '';
      let received = false;

      const processBuffer = () => {
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const chunk of parts) {
          const line = chunk.trim();
          if (!line.startsWith('data:')) continue;
          const payloadText = line.replace(/^data:\s*/, '');
          if (payloadText === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payloadText);
            const delta = parsed?.choices?.[0]?.delta?.content || '';
            if (delta) {
              received = true;
              setAiSummary((prev) => (prev || '') + delta);
            }
          } catch (err) {
            console.error('AI stream parse error', err);
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          processBuffer();
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }
      if (!received) {
        setAiError('No overview returned.');
      } else {
        setAiError(null);
      }
    } catch (err) {
      setAiError('AI overview unavailable right now.');
      console.error('AI summary error', err);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="container pb-4">
      <section className="stock-hero rounded-4 p-3 p-lg-4 mb-3">
        <div className="d-flex justify-content-between flex-wrap align-items-start gap-3">
          <div className="d-flex flex-column gap-2">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="badge bg-info text-dark fw-semibold text-uppercase">{companySector}</span>
              <h2 className="fw-bold text-white mb-0">{ticker}</h2>
              <span className="text-white-50">{profile?.exchange || ""}</span>
            </div>
            <div className="text-white fw-semibold" style={{ fontSize: '1.1rem' }}>
              {companyName}
            </div>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div className="display-5 mb-0 text-white">
                ${price ? price.toFixed(2) : "0.00"}
              </div>
              <span
                className={`badge ${
                  change >= 0
                    ? "bg-success-subtle text-success-emphasis"
                    : "bg-danger-subtle text-danger"
                } px-3 py-2 fs-6`}
              >
                {change >= 0 ? "+" : ""}
                {pct.toFixed(2)}% ({change >= 0 ? "+" : ""}
                {change.toFixed(2)})
              </span>
            </div>
            <span className="text-white-50 small">Updated: {updated}</span>
          </div>
          <div className="d-flex flex-column align-items-end gap-2">
            <button
              className={`btn fw-semibold px-3 py-2 border-2 ${isInWatchlist ? 'btn-info text-dark' : 'btn-outline-light'}`}
              onClick={toggleWatchlist}
              disabled={!validTicker && !isInWatchlist}
            >
              {isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            </button>
            <div
              className="mt-2 p-3 rounded-3"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="d-flex flex-column gap-2 text-end">
                {[
                  { label: "Day Range", value: validTicker ? dayRange : "$0.00 - $0.00" },
                  { label: "52W Range", value: validTicker ? fiftyTwoRange : "$0.00 - $0.00" },
                  { label: "Mkt cap", value: validTicker ? marketCap : "—" }
                ].map((item) => (
                  <div key={item.label} className="text-white fw-semibold" style={{ fontSize: '0.95rem' }}>
                    <span className="text-white-50 me-2">{item.label}:</span>
                    <span className="text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            {error}
          </div>
        ) : null}
      </section>

      <div className="row g-3">
        <div className="col-lg-8 d-flex flex-column gap-3">
          <PriceChart ticker={ticker} />

          <div className="glass-panel rounded-4 p-3 p-lg-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div className="text-white-50 small text-uppercase">AI desk</div>
                <h6 className="text-white mb-0">Quick overview</h6>
              </div>
              <button
                className="btn btn-sm btn-outline-info"
                onClick={fetchAiSummary}
                disabled={aiLoading}
              >
                {aiLoading ? 'Thinking...' : 'Refresh'}
              </button>
            </div>
            {aiError ? (
              <div className="alert alert-warning text-dark py-2 mb-2">{aiError}</div>
            ) : null}
            {aiLoading ? (
              <div className="d-flex align-items-center gap-2 text-white-50">
                <div className="spinner-border spinner-border-sm text-info" role="status" />
                <span>Generating overview...</span>
              </div>
            ) : aiSummary ? (
              <div
                className="text-white-50 markdown-body"
                dangerouslySetInnerHTML={{ __html: marked.parse(aiSummary || '') }}
              />
            ) : (
              <div className="text-white-50 small">No summary yet.</div>
            )}
          </div>
        </div>

        <div className="col-lg-4 d-flex flex-column gap-3">
          <TradePanel ticker={ticker} price={marketPrice} />

          {position.shares ? (
            <div className="glass-panel rounded-4 p-3 p-lg-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <div className="text-white-50 small text-uppercase">Holding</div>
                  <h6 className="text-white mb-0">{ticker}</h6>
                </div>
                <span className="badge bg-info text-dark">Active</span>
              </div>
                <div className="d-flex flex-column gap-2 text-white-50 small">
                  <div className="d-flex justify-content-between">
                    <span>Shares</span>
                    <span className="text-white fw-semibold">
                      {Number.isFinite(position.shares)
                        ? position.shares.toFixed(2).replace(/\.?0+$/, '')
                        : '0'}
                    </span>
                  </div>
                <div className="d-flex justify-content-between">
                  <span>Avg cost</span>
                  <span className="text-white fw-semibold">${position.avgPrice.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Last price</span>
                  <span className="text-white fw-semibold">
                    {marketPrice ? `$${marketPrice.toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Position value</span>
                  <span className="text-white fw-semibold">
                    {marketPrice ? `$${(position.shares * marketPrice).toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {validTicker && (
            <div className="glass-panel rounded-4 p-3 p-lg-4">
              <div className="text-white-50 small text-uppercase mb-2">Company</div>
              <h6 className="text-white mb-3">Snapshot</h6>
              <div className="d-flex flex-column gap-2 text-white-50 small">
                <div className="d-flex justify-content-between">
                  <span>Sector</span>
                  <span>{companySector}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Employees</span>
                  <span>{companyEmployees}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Headquarters</span>
                  <span>{companyHq}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Website</span>
                  <span>
                    {companyWeb !== "—" ? (
                      <a href={companyWeb} className="text-info" target="_blank" rel="noreferrer">
                        {companyWeb}
                      </a>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {validTicker && (
        <div className="row g-3 mt-3">
          <div className="col-lg-4">
            <div className="glass-panel rounded-4 p-3 p-lg-4 h-100">
              <div className="text-white-50 small text-uppercase mb-2">Highlights</div>
              <ul className="text-white-50 small mb-0 d-flex flex-column gap-2 ps-3">
                <li>Recent catalyst or earnings call: placeholder</li>
                <li>Analyst sentiment: placeholder</li>
                <li>Notable support/resistance: placeholder</li>
              </ul>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="glass-panel rounded-4 p-3 p-lg-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <div className="text-white-50 small text-uppercase">Feeds</div>
                  <h6 className="text-white mb-0">Mentions & headlines (placeholder)</h6>
                </div>
              </div>
              <div className="list-group list-group-flush">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="list-group-item bg-transparent border-0 px-0 py-2"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="d-flex justify-content-between text-white-50 small">
                      <span>Headline placeholder #{i}</span>
                      <span>—</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
