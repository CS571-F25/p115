import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";

export default function Stock(props) {
  const { ticker } = useParams();

  const [validTicker, setValidTicker] = useState(false);
  const [error, setError] = useState(null);

  const [info, setInfo] = useState(null);
  const [quotes, setQuotes] = useState(null);
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

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

  const companySector = profile?.finnhubIndustry || "—";
  const companyEmployees = profile?.employeeTotal ? profile.employeeTotal.toLocaleString() : "—";
  const companyHq =
    profile?.country && profile?.city ? `${profile.city}, ${profile.country}` : profile?.country || "—";
  const companyWeb = profile?.weburl || "—";
  const companyName = info?.description || profile?.name || "—";

  const renderAiSummary = (text) => {
    if (!text) return null;
    const bullets = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const cleaned = line.replace(/^-\s*/, "");
        const match = cleaned.match(/^\*\*(.+?)\*\*:\s*(.*)/);
        const title = match ? match[1] : null;
        const body = match ? match[2] : cleaned;
        return (
          <li key={idx} className="d-flex flex-column">
            {title ? <span className="fw-semibold text-white">{title}</span> : null}
            <span className="text-white-50">{body}</span>
          </li>
        );
      });
    return <ul className="list-unstyled d-flex flex-column gap-2 mb-0">{bullets}</ul>;
  };

  async function fetchAiSummary() {
    setAiLoading(true);
    setAiError(null);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'AI overview unavailable');
      }
      const data = await res.json();
      const content = data?.reply?.content;
      if (content) {
        setAiSummary(content);
      } else {
        setAiError('No overview returned.');
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
        <div className="d-flex justify-content-between flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <span className="badge bg-info text-dark fw-semibold text-uppercase">Simulated</span>
            <h2 className="fw-bold text-white mb-0">{ticker}</h2>
            <span className="text-white-50">{profile?.exchange || "—"}</span>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-info text-dark fw-semibold px-3 py-2">Trade</button>
            <button className="btn btn-outline-light fw-semibold px-3 py-2 border-2">
              Add to watchlist
            </button>
          </div>
        </div>
        <div className="d-flex align-items-center gap-3 flex-wrap mt-2">
          <div className="h4 mb-0 text-white">
            ${price ? price.toFixed(2) : "0.00"}
          </div>
          <span
            className={`badge ${
              change >= 0
                ? "bg-success-subtle text-success-emphasis"
                : "bg-danger-subtle text-danger"
            } px-3 py-2`}
          >
            {change >= 0 ? "+" : ""}
            {pct.toFixed(2)}% ({change >= 0 ? "+" : ""}
            {change.toFixed(2)})
          </span>
          <span className="text-white-50 small">{companyName}</span>
          <span className="text-white-50 small">Updated: {updated}</span>
        </div>

        {error ? (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            {error}
          </div>
        ) : null}

        <div className="d-flex gap-3 flex-wrap mt-3">
          {[
            { label: "Day range", value: validTicker ? dayRange : "$0.00 - $0.00" },
            { label: "52W range", value: validTicker ? fiftyTwoRange : "$0.00 - $0.00" },
            { label: "1D Volume", value: validTicker ? volume : "—" },
            { label: "Market cap", value: validTicker ? marketCap : "—" }
          ].map((item) => (
            <div className="stock-chip" key={item.label}>
              <div className="text-white-50 small">{item.label}</div>
              <div className="fw-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="row g-3">
        <div className="col-lg-8 d-flex flex-column gap-3">
          <div className="glass-panel rounded-4 p-3 p-lg-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div className="text-white-50 small text-uppercase">Price action</div>
                <h5 className="text-white mb-0">Live chart (placeholder)</h5>
              </div>
              <div className="d-flex gap-2">
                {["1D", "1W", "1M", "1Y", "ALL"].map((r) => (
                  <button key={r} className="btn btn-sm btn-outline-info">
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-placeholder rounded-3 mb-3" />
            <div className="d-flex justify-content-between text-white-50 small flex-wrap gap-2">
              <span>OHLC: — / — / — / —</span>
              <span>Indicators: EMA | RSI | Volume (placeholder)</span>
            </div>
          </div>

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
              <div>{renderAiSummary(aiSummary)}</div>
            ) : (
              <div className="text-white-50 small">No summary yet.</div>
            )}
          </div>
        </div>

        <div className="col-lg-4 d-flex flex-column gap-3">
          <div className="glass-panel rounded-4 p-3 p-lg-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div className="text-white-50 small text-uppercase">Trade</div>
                <h6 className="text-white mb-0">Ticket (placeholder)</h6>
              </div>
              <span className="badge bg-success-subtle text-success-emphasis">Paper</span>
            </div>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex gap-2">
                <button className="btn btn-danger flex-grow-1 fw-semibold">Sell</button>
                <button className="btn btn-success flex-grow-1 fw-semibold">Buy</button>
              </div>
              <div className="d-flex flex-column gap-2">
                <label className="form-label text-white-50 small mb-1">Order type</label>
                <div className="d-flex gap-2">
                  {["Market", "Limit", "Stop"].map((type) => (
                    <button key={type} className="btn btn-sm btn-outline-info flex-grow-1">
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label text-white-50 small mb-1">Qty</label>
                <input
                  type="number"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="100"
                />
              </div>
              <div className="d-flex justify-content-between text-white-50 small">
                <span>Est. cost</span>
                <span>$0.00</span>
              </div>
              <div className="d-flex justify-content-between text-white-50 small">
                <span>Stop / Target</span>
                <span>— / —</span>
              </div>
              <button className="btn btn-info text-dark fw-semibold w-100">Submit (placeholder)</button>
            </div>
          </div>

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
