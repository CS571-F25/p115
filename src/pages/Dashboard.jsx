import { useEffect, useState } from 'react'
import MarketStrip from '../components/MarketStrip'

const watchSymbols = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'SPY', 'QQQ']
const goal = { current: 28500, target: 50000 }

export default function Dashboard() {
  const [marketRows, setMarketRows] = useState([])
  const [marketLoading, setMarketLoading] = useState(true)
  const [cashBalance, setCashBalance] = useState(0)
  const [holdings, setHoldings] = useState({})
  const [pricedPositions, setPricedPositions] = useState([])
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    loadMarketStrip()
    loadPortfolio()
  }, [])

  useEffect(() => {
    loadHoldingQuotes()
  }, [holdings])

  async function loadMarketStrip() {
    setMarketLoading(true)
    try {
      const data = await Promise.all(
        watchSymbols.map(async (symbol) => {
          const [quote, lookup] = await Promise.all([
            fetch(`https://finnhubquote-q2lidtpoma-uc.a.run.app?symbol=${symbol}`).then((r) =>
              r.ok ? r.json() : null
            ),
            fetch(`https://finnhublookup-q2lidtpoma-uc.a.run.app?q=${symbol}`).then((r) =>
              r.ok ? r.json() : null
            )
          ])
          const name = lookup?.result?.[0]?.description || symbol
          const price = quote?.c ?? 0
          const prevClose = quote?.pc ?? 0
          const change = price - prevClose
          const pct = prevClose ? (change / prevClose) * 100 : 0
          return {
            symbol,
            name,
            price,
            change,
            pct
          }
        })
      )
      setMarketRows(data)
    } catch (err) {
      console.error('dashboard market strip error', err)
    } finally {
      setMarketLoading(false)
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
          onClick={loadMarketStrip}
          disabled={marketLoading}
        >
          {marketLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <MarketStrip rows={marketRows} loading={marketLoading} />

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
    </div>
  )
}
