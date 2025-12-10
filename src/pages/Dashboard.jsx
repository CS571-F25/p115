import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const goal = { current: 28500, target: 50000 }

export default function Dashboard() {
  const navigate = useNavigate()
  const formatCurrency = (val) =>
    `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const normalizeShares = (value) => {
    if (!Number.isFinite(value)) return 0
    const rounded = Number(value.toFixed(2))
    return Math.abs(rounded) < 0.005 ? 0 : rounded
  }
  const normalizeHoldings = (raw) => {
    const safe = raw && typeof raw === 'object' ? raw : {}
    const next = {}
    Object.entries(safe).forEach(([sym, val]) => {
      const shares = normalizeShares(val?.shares ?? 0)
      const avgPrice = Number.isFinite(val?.avgPrice) ? Number(val.avgPrice) : 0
      if (shares > 0) {
        next[sym.toUpperCase()] = { shares, avgPrice }
      }
    })
    return next
  }
  const [watchlist, setWatchlist] = useState([])
  const [watchRows, setWatchRows] = useState([])
  const [watchLoading, setWatchLoading] = useState(true)
  const [cashBalance, setCashBalance] = useState(0)
  const [holdings, setHoldings] = useState({})
  const [pricedPositions, setPricedPositions] = useState([])
  const [transactions, setTransactions] = useState([])
  const [equitiesValue, setEquitiesValue] = useState(0)
  const [showTxModal, setShowTxModal] = useState(false)
  const [txPage, setTxPage] = useState(0)

  useEffect(() => {
    const list = loadWatchlist()
    refreshWatchlistQuotes(list)
    loadPortfolio()
  }, [])

  useEffect(() => {
    loadHoldingQuotes()
  }, [holdings])

  useEffect(() => {
    const handlePortfolioEvent = () => loadPortfolio()
    window.addEventListener('portfolio-updated', handlePortfolioEvent)
    window.addEventListener('storage', handlePortfolioEvent)
    return () => {
      window.removeEventListener('portfolio-updated', handlePortfolioEvent)
      window.removeEventListener('storage', handlePortfolioEvent)
    }
  }, [])

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


  function loadPortfolio() {
    if (typeof window === 'undefined') return
    const cash = window.localStorage.getItem('paperCash')
    setCashBalance(() => {
      const parsed = cash ? Number.parseFloat(cash) : NaN
      return Number.isFinite(parsed) ? parsed : 100000
    })
    try {
      const savedHoldings = window.localStorage.getItem('paperHoldings')
      const parsedHoldings = savedHoldings ? JSON.parse(savedHoldings) : {}
      const normalized = normalizeHoldings(parsedHoldings)
      setHoldings(normalized)
      window.localStorage.setItem('paperHoldings', JSON.stringify(normalized))
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
      setEquitiesValue(0)
      return
    }
    try {
      const fetched = await Promise.all(
        symbols.map(async (symbol) => {
          const quoteRes = await fetch(`https://finnhubquote-q2lidtpoma-uc.a.run.app?symbol=${symbol}`)
          const quote = quoteRes.ok ? await quoteRes.json() : null
          const last = quote?.c ?? 0
          const prevClose = quote?.pc ?? 0
          const dayChange = last - prevClose
          const dayPct = prevClose ? (dayChange / prevClose) * 100 : 0
          const { shares, avgPrice } = holdings[symbol]
          const normalizedShares = Number.isFinite(shares) ? Number(shares.toFixed(2)) : 0
          const value = last * normalizedShares
          const cost = avgPrice * normalizedShares
          const pnl = value - cost
          const pnlPct = cost ? (pnl / cost) * 100 : 0
          return { symbol, shares: normalizedShares, avgPrice, last, value, pnl, pnlPct, dayChange, dayPct }
        })
      )
      setPricedPositions(fetched)
      const totalEquities = fetched.reduce((sum, item) => sum + (item.value || 0), 0)
      setEquitiesValue(totalEquities)
    } catch (err) {
      console.error('holding quote fetch error', err)
      setPricedPositions([])
      setEquitiesValue(0)
    }
  }

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => (b?.ts || 0) - (a?.ts || 0)),
    [transactions]
  )
  const recentTx = sortedTransactions.slice(0, 4)
  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize))
  const pagedTx = sortedTransactions.slice(txPage * pageSize, txPage * pageSize + pageSize)

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize))
    setTxPage((prev) => Math.min(prev, pages - 1))
  }, [sortedTransactions.length])

  return (
    <div className="container py-3">
      <div
        className="glass-panel rounded-4 p-3 p-lg-4 mb-3 d-flex flex-column flex-md-row align-items-start justify-content-between gap-3"
        style={{ borderColor: 'rgba(24,200,242,0.25)' }}
      >
        <div>
          <div className="text-white-50 text-uppercase small">Account balance</div>
          <div className="text-white fw-bold" style={{ fontSize: '2.4rem', lineHeight: 1 }}>
            {formatCurrency(cashBalance + equitiesValue)}
          </div>
        </div>
        <div className="d-flex gap-3 flex-wrap">
          <div className="p-2 px-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-white-50 small">Cash</div>
            <div className="text-white fw-semibold">{formatCurrency(cashBalance)}</div>
          </div>
          <div className="p-2 px-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-white-50 small">Equities</div>
            <div className="text-white fw-semibold">{formatCurrency(equitiesValue)}</div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="glass-panel rounded-4 p-3 p-lg-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div className="text-white-50 text-uppercase small">Portfolio</div>
                <h6 className="text-white mb-1">Current positions</h6>
              </div>
            </div>
            <div className="d-flex flex-column gap-2">
              {pricedPositions.length ? (
                pricedPositions.map((pos) => {
                  const isUp = pos.dayChange >= 0
                  const sharesLabel = `${pos.shares.toFixed(2).replace(/\.?0+$/, '')} shares`
                  return (
                    <div
                      key={pos.symbol}
                      className="d-flex justify-content-between align-items-center p-3 rounded-3 position-card"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/stock/${pos.symbol}`)}
                    >
                      <div>
                        <div className="fw-semibold text-white">{pos.symbol}</div>
                        <div className="text-white-50 small">{sharesLabel}</div>
                      </div>
                      <div className="text-end">
                        <div className="text-white fw-semibold">
                          {pos.last ? `$${pos.last.toFixed(2)}` : '—'}
                        </div>
                        <div className={`small fw-semibold ${isUp ? 'text-success' : 'text-danger'}`}>
                          {isUp ? '+' : ''}
                          {pos.dayChange?.toFixed(2)} ({pos.dayPct?.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-white-50 small">No positions yet. Place a trade to get started.</div>
              )}
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
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <div className="text-white-50 text-uppercase small">Recent orders</div>
                  <h6 className="text-white mb-0">Latest activity</h6>
                </div>
                <button
                  className="btn btn-sm btn-outline-info text-dark fw-semibold"
                  onClick={() => {
                    setTxPage(0)
                    setShowTxModal(true)
                  }}
                  disabled={!transactions.length}
                >
                  See all
                </button>
              </div>
              {recentTx.length ? (
                <div className="d-flex flex-column gap-2">
                  {recentTx.map((tx, idx) => {
                    const isBuy = tx.side?.toLowerCase() === 'buy'
                    const badgeClass = isBuy ? 'pill-buy' : 'pill-sell'
                    return (
                      <div
                        key={`${tx.id}-${idx}`}
                        className="order-row rounded-3 d-flex align-items-center gap-3"
                      >
                        <div className="flex-grow-1">
                          <div className="fw-semibold text-white">{tx.ticker}</div>
                          <div className="text-white-50 small">Order</div>
                        </div>
                        <div className="text-center" style={{ minWidth: '86px' }}>
                          <span className={`badge ${badgeClass} px-3 py-2 text-uppercase w-100`}>{tx.side}</span>
                        </div>
                        <div className="text-end" style={{ minWidth: '160px' }}>
                          <div className="fw-semibold text-white">
                            {tx.qty?.toFixed(2).replace(/\.?0+$/, '')} sh
                          </div>
                          <div className="text-white-50 small order-meta">
                            @ ${tx.price?.toFixed(2)} · {new Date(tx.ts).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
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

      {showTxModal ? (
        <div className="modal-backdrop-custom">
          <div className="modal-panel glass-panel rounded-4 p-3 p-lg-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <div className="text-white-50 text-uppercase small">Trade history</div>
                <h5 className="text-white mb-0">All orders</h5>
              </div>
              <button className="btn btn-outline-light btn-sm" onClick={() => setShowTxModal(false)}>
                Close
              </button>
            </div>
            {sortedTransactions.length ? (
              <>
                <div className="d-flex text-white-50 small pb-2 border-bottom border-secondary">
                  <div className="flex-grow-1">Ticker</div>
                  <div style={{ width: '120px' }}>Action</div>
                  <div style={{ width: '140px' }}>Quantity</div>
                  <div style={{ width: '140px' }}>Price</div>
                  <div style={{ width: '170px' }}>Timestamp</div>
                </div>
                <div className="d-flex flex-column gap-2 mt-2">
                  {pagedTx.map((tx, idx) => {
                    const isBuy = tx.side?.toLowerCase() === 'buy'
                    const badgeClass = isBuy ? 'pill-buy' : 'pill-sell'
                    return (
                      <div
                        key={`${tx.id}-${idx}`}
                        className="d-flex align-items-center p-2 rounded-3"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="flex-grow-1">
                          <div className="text-white fw-semibold">{tx.ticker}</div>
                          <div className="text-white-50 small">Order</div>
                        </div>
                        <div style={{ width: '120px' }}>
                          <span className={`badge ${badgeClass} px-3 py-2 text-uppercase`}>{tx.side}</span>
                        </div>
                        <div style={{ width: '140px' }} className="text-white fw-semibold">
                          {tx.qty?.toFixed(2).replace(/\.?0+$/, '')} sh
                        </div>
                        <div style={{ width: '140px' }} className="text-white fw-semibold">
                          ${tx.price?.toFixed(2)}
                        </div>
                        <div style={{ width: '170px' }} className="text-white-50 small text-end">
                          {new Date(tx.ts).toLocaleString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-white-50 small">
                    Page {txPage + 1} of {totalPages}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-light"
                      disabled={txPage === 0}
                      onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                    >
                      Prev
                    </button>
                    <button
                      className="btn btn-sm btn-outline-light"
                      disabled={txPage >= totalPages - 1}
                      onClick={() => setTxPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-white-50 small">No trade history yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
