import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function Stock(props) {
  const { ticker } = useParams();

  const [validTicker, setValidTicker] = useState(false);
  const [error, setError] = useState(null);

  const [info, setInfo] = useState(null);
  const [quotes, setQuotes] = useState(null);
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (!ticker) return;
    
    setValidTicker(false);
    setError(null);

    setInfo();
    setQuotes(null);
    setProfile(null);
    setMetrics(null);

    stockLookup();
    loadQuotes();
    loadProfile();
    loadMetrics();
  }, [ticker]);

  function stockLookup() {
    fetch(`https://finnhublookup-q2lidtpoma-uc.a.run.app?q=${ticker}`)
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
  const volume = quotes?.v ? quotes.v.toLocaleString() : "—";
  const marketCap =
    metrics?.metric?.marketCapitalization && !Number.isNaN(metrics.metric.marketCapitalization)
      ? `$${metrics.metric.marketCapitalization.toLocaleString()}`
      : "—";

  const companySector = profile?.finnhubIndustry || "—";
  const companyEmployees = profile?.employeeTotal ? profile.employeeTotal.toLocaleString() : "—";
  const companyHq =
    profile?.country && profile?.city ? `${profile.city}, ${profile.country}` : profile?.country || "—";
  const companyWeb = profile?.weburl || "—";





  return (
    <div className="container py-4">
      <section className="stock-hero rounded-4 p-4 p-lg-5 mb-4">
        <div className="d-flex justify-content-between flex-wrap align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
              <span className="badge bg-info text-dark fw-semibold text-uppercase">
                Simulated
              </span>
              <h1 className="display-6 fw-bold text-white mb-0">{ticker}</h1>
              <span className="text-white-50">{profile?.exchange || "—"}</span>
            </div>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div className="h3 mb-0 text-white">
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
              <span className="text-white-50 small">Updated: {updated}</span>
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-info text-dark fw-semibold px-4">Trade panel</button>
            <button className="btn btn-outline-light fw-semibold px-4 border-2">
              Add to watchlist
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            {error}
          </div>
        ) : null}

        <div className="d-flex gap-3 flex-wrap mt-4">
          {[
            { label: "Day range", value: validTicker ? dayRange : "$0.00 - $0.00" },
            { label: "52W range", value: validTicker ? fiftyTwoRange : "$0.00 - $0.00" },
            { label: "Volume", value: validTicker ? volume : "—" },
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
                <div className="text-white-50 small text-uppercase">Depth</div>
                <h6 className="text-white mb-0">Order book (placeholder)</h6>
              </div>
              <span className="badge bg-info text-dark fw-semibold">Simulated</span>
            </div>
            <div className="row g-2 text-white-50 small">
              <div className="col-md-6">
                <div className="mb-1 text-white">Bids</div>
                {[1, 2, 3, 4].map((i) => (
                  <div className="orderbar bid" style={{ width: `${70 - i * 10}%` }} key={i}>
                    <span>$0.00</span>
                    <span>—</span>
                  </div>
                ))}
              </div>
              <div className="col-md-6">
                <div className="mb-1 text-white">Asks</div>
                {[1, 2, 3, 4].map((i) => (
                  <div className="orderbar ask ms-md-auto" style={{ width: `${60 + i * 8}%` }} key={i}>
                    <span>$0.00</span>
                    <span>—</span>
                  </div>
                ))}
              </div>
            </div>
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
