import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const goal = { current: 28500, target: 50000 }

export default function Dashboard() {
  const navigate = useNavigate()
  const [watchlist, setWatchlist] = useState([])
  const [watchRows, setWatchRows] = useState([])
  const [watchLoading, setWatchLoading] = useState(true)
  const [cashBalance, setCashBalance] = useState(0)
  const [holdings, setHoldings] = useState({})
  const [pricedPositions, setPricedPositions] = useState([])
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    const list = loadWatchlist()
    refreshWatchlistQuotes(list)
    loadPortfolio()
  }, [])

  useEffect(() => {
    loadHoldingQuotes()
  }, [holdings])

  function persistWatchlist(next) {
    setWatchlist(next)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('watchlist', JSON.stringify(next))
    } catch (err) {
      console.error('watchlist persist error', err)
    }
  }

  function loadWatchlist() {
    if (typeof window === 'undefined') return []
    try {
      const saved = window.localStorage.getItem('watchlist')
      const parsed = saved ? JSON.parse(saved) : []
      const normalized = Array.isArray(parsed)
        ? parsed
            .map((item) => {
              if (!item) return null
              if (typeof item === 'string') {
                const symbol = item.toUpperCase()
                return symbol ? { symbol, name: symbol } : null
              }
              const symbol = (item.symbol || '').toUpperCase()
              if (!symbol) return null
              const name = item.name || symbol
              return { symbol, name }
            })
            .filter(Boolean)
        : []
      const deduped = []
      const seen = new Set()
      normalized.forEach((item) => {
        if (!seen.has(item.symbol)) {
          seen.add(item.symbol)
          deduped.push(item)
        }
      })
      persistWatchlist(deduped)
      return deduped
    } catch (err) {
      console.error('dashboard watchlist parse error', err)
      persistWatchlist([])
      return []
    }
  }

  async function refreshWatchlistQuotes(listOverride) {
    const source = listOverride ?? watchlist
    if (!source.length) {
      setWatchRows([])
      setWatchLoading(false)
      return
    }
    setWatchLoading(true)
    try {
      const data = await Promise.all(
        source.map(async (item) => {
          try {
            const quoteRes = await fetch(`https://finnhubquote-q2lidtpoma-uc.a.run.app?symbol=${item.symbol}`)
            const quote = quoteRes.ok ? await quoteRes.json() : null
            const price = quote?.c ?? 0
            const prevClose = quote?.pc ?? 0
            const change = price - prevClose
            const pct = prevClose ? (change / prevClose) * 100 : 0
            const name = item.name || item.symbol
            return { ...item, name, price, change, pct }
          } catch (err) {
            const fallbackName = item.name || item.symbol
            return { ...item, name: fallbackName, price: 0, change: 0, pct: 0 }
          }
        })
      )
      setWatchRows(data)
    } catch (err) {
      console.error('watchlist quote fetch error', err)
      setWatchRows([])
    } finally {
      setWatchLoading(false)
    }
  }

  function handleWatchlistRefresh() {
    const latest = loadWatchlist()
    refreshWatchlistQuotes(latest)
  }

  function loadPortfolio() {
    if (typeof window === 'undefined') return
    const cash = window.localStorage.getItem('paperCash')
    setCashBalance(() => {
      const parsed = cash ? Number.parseFloat(cash) : NaN
      return Number.isFinite(parsed) ? parsed : 100000
    })
    try {
      const savedHoldings = window.localStorage.getItem('paperHoldings')
      setHoldings(savedHoldings ? JSON.parse(savedHoldings) : {})
    } catch (err) {
      console.error('dashboard holdings parse error', err)
      setHoldings({})
    }
    try {
      const savedTx = window.localStorage.getItem('paperTransactions')
      const parsedTx = savedTx ? JSON.parse(savedTx) : []
      setTransactions(Array.isArray(parsedTx) ? parsedTx : [])
    } catch (err) {
      console.error('dashboard tx parse error', err)
      setTransactions([])
    }
  }

  async function loadHoldingQuotes() {
    const symbols = Object.keys(holdings || {})
    if (!symbols.length) {
      setPricedPositions([])
      return
    }
    try {
      const fetched = await Promise.all(
        symbols.map(async (symbol) => {
          const quoteRes = await fetch(`https://finnhubquote-q2lidtpoma-uc.a.run.app?symbol=${symbol}`)
          const quote = quoteRes.ok ? await quoteRes.json() : null
          const last = quote?.c ?? 0
          const { shares, avgPrice } = holdings[symbol]
          const value = last * shares
          const cost = avgPrice * shares
          const pnl = value - cost
          const pnlPct = cost ? (pnl / cost) * 100 : 0
          return { symbol, shares, avgPrice, last, value, pnl, pnlPct }
        })
      )
      setPricedPositions(fetched)
    } catch (err) {
      console.error('holding quote fetch error', err)
      setPricedPositions([])
    }
  }

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="text-white-50 text-uppercase small">Overview</div>
          <h2 className="text-white mb-0">Dashboard</h2>
          <p className="text-white-50 mb-0">Quick glance at your core watchlist.</p>
        </div>
        <button
          className="btn btn-outline-info btn-sm text-info fw-semibold"
          onClick={handleWatchlistRefresh}
          disabled={watchLoading}
        >
          {watchLoading ? 'Refreshing...' : 'Refresh watchlist'}
        </button>
      </div>


      <div className="row g-3">
        <div className="col-lg-5">
          <div className="glass-panel rounded-4 p-3 p-lg-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div className="text-white-50 text-uppercase small">Portfolio</div>
                <h6 className="text-white mb-1">Current positions</h6>
              </div>
              <span className="badge bg-info text-dark">Paper</span>
            </div>
            <div className="d-flex justify-content-between text-white-50 small mb-2">
              <span>Symbol</span>
              <span>Qty · P/L</span>
            </div>
            <div className="d-flex flex-column gap-2">
              {pricedPositions.length ? (
                pricedPositions.map((pos) => {
                  const isUp = pos.pnl >= 0
                  return (
                    <div
                      key={pos.symbol}
                      className="d-flex justify-content-between align-items-center p-2 rounded-3"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div>
                        <div className="fw-semibold text-white">{pos.symbol}</div>
                        <div className="text-white-50 small">
                          {pos.shares} sh @ ${pos.avgPrice.toFixed(2)}
                        </div>
                        <div className="text-white-50 small">Last: {pos.last ? `$${pos.last.toFixed(2)}` : '—'}</div>
                      </div>
                      <div className="text-end">
                        <div className="text-white fw-semibold">${pos.value.toFixed(0)}</div>
                        <div className={`small fw-semibold ${isUp ? 'text-success' : 'text-danger'}`}>
                          {isUp ? '+' : ''}
                          {pos.pnl.toFixed(0)} ({pos.pnlPct.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-white-50 small">No positions yet. Place a trade to get started.</div>
              )}
            </div>
            <div className="mt-3">
              <div className="text-white-50 small mb-1">Account balance</div>
              <div className="h5 text-info mb-0">
                ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-white-50 small">Starting: $100,000 (paper)</div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="glass-panel rounded-4 p-3 p-lg-4 h-100 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-white-50 text-uppercase small">Goal tracker</div>
                <h6 className="text-white mb-1">Journey to target</h6>
              </div>
              <span className="badge bg-info text-dark">
                {Math.min(100, Math.round((goal.current / goal.target) * 100))}% to goal
              </span>
            </div>
            <div
              className="rounded-pill w-100"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', height: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div
                style={{
                  width: `${Math.min(100, (goal.current / goal.target) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #36d7ff, #7c3aed)'
                }}
              />
            </div>
            <div className="d-flex justify-content-between text-white-50 small">
              <span>Current: ${goal.current.toLocaleString()}</span>
              <span>Target: ${goal.target.toLocaleString()}</span>
            </div>

            <div className="d-flex gap-3 flex-wrap">
              <div className="flex-grow-1 p-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-white-50 small mb-1">News</div>
                <div className="fw-semibold text-white">Market desk</div>
                <p className="text-white-50 small mb-2">Scan Finnhub headlines and r/stocks threads.</p>
                <a href="#/news" className="btn btn-sm btn-outline-info text-dark fw-semibold">Open news</a>
              </div>
              <div className="flex-grow-1 p-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-white-50 small mb-1">AI desk</div>
                <div className="fw-semibold text-white">Chat co-pilot</div>
                <p className="text-white-50 small mb-2">Ask about strategies or app help.</p>
                <a href="#/chat" className="btn btn-sm btn-outline-info text-dark fw-semibold">Open chat</a>
              </div>
            </div>

            <div className="glass-panel rounded-3 p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="text-white-50 text-uppercase small">Recent orders</div>
                <span className="badge bg-info text-dark">{transactions.length}</span>
              </div>
              {transactions.length ? (
                <ul className="list-unstyled mb-0 d-flex flex-column gap-2 text-white-50 small">
                  {transactions.slice(0, 6).map((tx) => (
                    <li key={tx.id} className="d-flex justify-content-between">
                      <span className="text-white">
                        {tx.side} {tx.qty} {tx.ticker} @ ${tx.price.toFixed(2)}
                      </span>
                      <span>{new Date(tx.ts).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-white-50 small">No recent orders.</div>
              )}
            </div>
          </div>
        </div>
      </div>

    <div
        className="rounded-4 p-3 mt-3"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 24px rgba(0,0,0,0.25)'
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <div className="text-white-50 text-uppercase small">Watchlist</div>
            <h6 className="text-white mb-0">Saved tickers</h6>
          </div>
          <span className="badge bg-info text-dark">{watchlist.length}</span>
        </div>
        {watchLoading ? (
          <div className="d-flex align-items-center gap-2 text-white-50">
            <div className="spinner-border spinner-border-sm text-info" role="status" />
            <span>Updating watchlist...</span>
          </div>
        ) : watchRows.length ? (
          <div className="d-flex flex-wrap gap-2">
            {watchRows.map((row) => {
              const isUp = row.change >= 0
              return (
                <div
                  key={row.symbol}
                  className="p-3 rounded-3 ticker-card-hover d-flex flex-column justify-content-between"
                  style={{
                    minWidth: '200px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/stock/${row.symbol}`)}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-bold text-white">{row.symbol}</div>
                      <div className="text-white-50 small text-truncate" style={{ maxWidth: '160px' }}>
                        {row.name}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-info fw-semibold">
                      {row.price ? `$${row.price.toFixed(2)}` : '—'}
                    </div>
                    <div className={`small fw-semibold ${isUp ? 'text-success' : 'text-danger'}`}>
                      {isUp ? '+' : ''}
                      {row.change?.toFixed(2)} ({row.pct?.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : watchlist.length ? (
          <div className="text-white-50 small">
            Could not load quotes for your watchlist right now. Try refreshing.
          </div>
        ) : (
          <div className="text-white-50 small">
            No symbols in your watchlist yet. Add tickers from any stock page to track them here.
          </div>
        )}
      </div>


    </div>
  )
}
