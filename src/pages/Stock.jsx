import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { marked } from "marked";
import PriceHistory from "../components/PriceHistory";

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
  const [cashBalance, setCashBalance] = useState(() => {
    if (typeof window === 'undefined') return 100000;
    const saved = window.localStorage.getItem('paperCash');
    const parsed = saved ? Number.parseFloat(saved) : NaN;
    return Number.isFinite(parsed) ? parsed : 100000;
  });
  const [holdings, setHoldings] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem('paperHoldings');
      return saved ? JSON.parse(saved) : {};
    } catch (err) {
      console.error('bad holdings cache', err);
      return {};
    }
  });
  const [transactions, setTransactions] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem('paperTransactions');
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error('bad transactions cache', err);
      return [];
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
  const [orderQty, setOrderQty] = useState('');
  const [tradeError, setTradeError] = useState(null);
  const [successDetails, setSuccessDetails] = useState(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [side, setSide] = useState('buy');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewDetails, setReviewDetails] = useState(null);
  const [buyIn, setBuyIn] = useState('shares'); // 'shares' | 'dollars'

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
    setTradeError(null);
    setSuccessDetails(null);
    setShowSuccessOverlay(false);

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
    window.localStorage.setItem('paperCash', cashBalance.toString());
  }, [cashBalance]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('paperHoldings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('paperTransactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    if (!tradeError) return;
    const timer = setTimeout(() => setTradeError(null), 1600);
    return () => clearTimeout(timer);
  }, [tradeError]);
  useEffect(() => {
    if (!tradeError) return;
    const timer = setTimeout(() => setTradeError(null), 1600);
    return () => clearTimeout(timer);
  }, [tradeError]);

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
  const position = holdings[ticker] || { shares: 0, avgPrice: 0 };
  const formattedCash = `$${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const marketPrice = price ? Number(price) : 0;
  const parsedQty = Number(orderQty);
  const estimatedCost =
    buyIn === 'shares'
      ? parsedQty && marketPrice
        ? parsedQty * marketPrice
        : 0
      : parsedQty || 0;
  const isInWatchlist = useMemo(
    () => watchlist.some((item) => item.symbol === (ticker || '').toUpperCase()),
    [watchlist, ticker]
  );

  const toggleWatchlist = () => {
    if (!ticker) return;
    const symbol = ticker.toUpperCase();
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

  const reviewOrder = () => {
    setTradeError(null);
    setSuccessDetails(null);
    setShowSuccessOverlay(false);
    const qtyInput = Number(orderQty);
    if (!marketPrice) {
      setTradeError('Price unavailable');
      return;
    }

    const shares =
      buyIn === 'shares'
        ? Number(qtyInput)
        : marketPrice
          ? Number((qtyInput / marketPrice).toFixed(4))
          : 0;
    const dollars = buyIn === 'shares' ? shares * marketPrice : qtyInput;

    if (!shares || shares <= 0 || !Number.isFinite(shares)) {
      setTradeError('Enter a quantity > 0');
      return;
    }

    if (side === 'sell') {
      const existing = holdings[ticker];
      if (!existing || existing.shares < shares) {
        setTradeError('Not enough shares');
        return;
      }
    }
    if (side === 'buy' && dollars > cashBalance + 1e-6) {
      setTradeError('Not enough cash');
      return;
    }
    const normalizedShares = Number(shares.toFixed(2));
    const normalizedDollars = Number(dollars.toFixed(2));
    setReviewDetails({
      side,
      qty: normalizedShares,
      ticker,
      price: marketPrice,
      est: normalizedDollars
    });
    setIsReviewing(true);
  };

  const handleTrade = (sideParam) => {
    const activeSide = sideParam || side;
    setTradeError(null);
    setSuccessDetails(null);
    setShowSuccessOverlay(false);
    const qty =
      reviewDetails?.qty ??
      (buyIn === 'shares'
        ? Number(orderQty)
        : marketPrice
          ? Number(((Number(orderQty) || 0) / marketPrice).toFixed(2))
          : 0);
    if (!qty || qty <= 0) {
      setTradeError('Enter a quantity > 0');
      return;
    }
    if (!marketPrice) {
      setTradeError('Price unavailable');
      return;
    }

    if (activeSide === 'buy') {
        const cost = marketPrice * qty;
      if (cost > cashBalance + 1e-6) {
        setTradeError('Not enough cash');
        return;
      }
      setCashBalance((prev) => Number((prev - cost).toFixed(2)));
      setHoldings((prev) => {
        const existing = prev[ticker] || { shares: 0, avgPrice: 0 };
        const newShares = existing.shares + qty;
        const newAvg =
          newShares > 0
            ? (existing.avgPrice * existing.shares + marketPrice * qty) / newShares
            : 0;
        return {
          ...prev,
          [ticker]: { shares: newShares, avgPrice: Number(newAvg.toFixed(2)) }
        };
      });
      setTransactions((prev) => [
        {
          id: crypto.randomUUID(),
          ticker,
          side: 'Buy',
          qty,
          price: Number(marketPrice.toFixed(2)),
          total: Number((marketPrice * qty).toFixed(2)),
          ts: Date.now()
        },
        ...prev
      ]);
      setSuccessDetails({ side: 'Buy', qty, ticker, price: marketPrice });
      setShowSuccessOverlay(true);
      setOrderQty('');
      setIsReviewing(false);
      setReviewDetails(null);
      setTimeout(() => {
        setShowSuccessOverlay(false);
      }, 3000);
    } else {
      const existing = holdings[ticker];
      if (!existing || existing.shares < qty) {
        setTradeError('Not enough shares');
        return;
      }
      const proceeds = marketPrice * qty;
      setCashBalance((prev) => Number((prev + proceeds).toFixed(2)));
      setHoldings((prev) => {
        const updated = { ...prev };
        const newShares = existing.shares - qty;
        if (newShares <= 0) {
          delete updated[ticker];
        } else {
          updated[ticker] = { ...existing, shares: newShares };
        }
        return updated;
      });
      setTransactions((prev) => [
        {
          id: crypto.randomUUID(),
          ticker,
          side: 'Sell',
          qty,
          price: Number(marketPrice.toFixed(2)),
          total: Number((marketPrice * qty).toFixed(2)),
          ts: Date.now()
        },
        ...prev
      ]);
      setSuccessDetails({ side: 'Sell', qty, ticker, price: marketPrice });
      setShowSuccessOverlay(true);
      setOrderQty('');
      setIsReviewing(false);
      setReviewDetails(null);
      setTimeout(() => {
        setShowSuccessOverlay(false);
      }, 3000);
    }
  };

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
          <PriceHistory ticker={ticker} />

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
          <div className="glass-panel rounded-4 p-3 p-lg-4 trade-card position-relative overflow-hidden">
            {showSuccessOverlay && successDetails ? (
              <div className="trade-success-wave d-flex flex-column justify-content-center align-items-center text-dark text-center px-3">
                <div className="display-6 fw-bold mb-2">Success</div>
                <div className="fw-semibold">
                  {successDetails.side} {successDetails.qty} {successDetails.ticker} @ ${successDetails.price.toFixed(2)}
                </div>
              </div>
            ) : null}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div className="text-white-50 small text-uppercase">Trade</div>
                <h6 className="text-white mb-0">Ticket</h6>
              </div>
              <span className="badge bg-success-subtle text-success-emphasis">Paper</span>
            </div>
            <div className="d-flex flex-column gap-3">
              <div className="trade-toggle my-1">
                <button
                  className={`toggle-pill ${side === 'buy' ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    setSide('buy');
                    setIsReviewing(false);
                    setReviewDetails(null);
                    setTradeError(null);
                  }}
                >
                  Buy
                </button>
                <button
                  className={`toggle-pill ${side === 'sell' ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    setSide('sell');
                    setIsReviewing(false);
                    setReviewDetails(null);
                    setTradeError(null);
                  }}
                >
                  Sell
                </button>
              </div>
              <div className="d-flex justify-content-between text-white-50 small">
                <span>Order type</span>
                <span className="text-white fw-semibold">Market order</span>
              </div>
              <div className="d-flex justify-content-between text-white-50 small align-items-center">
                <span>Buy In</span>
                <div className="trade-toggle small w-50">
                  <button
                    className={`toggle-pill ${buyIn === 'shares' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setBuyIn('shares')}
                  >
                    Shares
                  </button>
                  <button
                    className={`toggle-pill ${buyIn === 'dollars' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setBuyIn('dollars')}
                  >
                    Dollars
                  </button>
                </div>
              </div>
              <div className="d-flex justify-content-between">
                <label className="form-label text-white-50 small mb-1">
                  {buyIn === 'shares' ? 'Shares' : 'Amount ($)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control bg-dark text-white border-secondary trade-input w-50"
                  placeholder={buyIn === 'shares' ? '0' : '0.00'}
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                />
              </div>
              <div className="d-flex justify-content-between text-white-50 small">
                <span>Market price</span>
                <span className="text-success fw-semibold">
                  {marketPrice ? `$${marketPrice.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="d-flex justify-content-between text-white-50 small border-top border-secondary pt-2">
                <span>Estimated cost</span>
                <span className="text-white">
                  {estimatedCost ? `$${estimatedCost.toFixed(2)}` : "—"}
                </span>
              </div>
              {!isReviewing ? (
                <button
                  className={`btn fw-semibold w-100 trade-btn ${tradeError ? 'btn-danger pulse' : 'btn-gradient'}`}
                  type="button"
                  onClick={reviewOrder}
                  disabled={!validTicker}
                >
                  {tradeError ? tradeError : 'Review Order'}
                </button>
              ) : null}
              {isReviewing && reviewDetails ? (
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-light flex-grow-1"
                    type="button"
                    onClick={() => {
                      setIsReviewing(false);
                      setReviewDetails(null);
                      setTradeError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-success flex-grow-1 fw-semibold trade-btn"
                    type="button"
                    onClick={() => handleTrade(reviewDetails.side)}
                  >
                    Confirm {reviewDetails.side} {reviewDetails.qty}
                  </button>
                </div>
              ) : null}
              <div className="text-white-50 small text-center">
                {`${formattedCash} buying power available`}
              </div>
            </div>
          </div>

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
                  <span className="text-white fw-semibold">{position.shares}</span>
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
