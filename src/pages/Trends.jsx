import { useEffect, useState } from 'react'

const symbols = ['QQQ', 'SPY', 'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL']

export default function Trends() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await Promise.all(
          symbols.map(async (symbol) => {
            const [quote, lookup] = await Promise.all([
              fetch(`https://finnhubquote-q2lidtpoma-uc.a.run.app?symbol=${symbol}`).then((r) =>
                r.ok ? r.json() : null
              ),
              fetch(`https://finnhublookup-q2lidtpoma-uc.a.run.app?q=${symbol}`).then((r) =>
                r.ok ? r.json() : null
              ),
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
              pct,
            }
          })
        )
        if (!cancelled) {
          setRows(data)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="text-white-50 text-uppercase small">Market pulse</div>
          <h2 className="text-white mb-0">Trending indexes & leaders</h2>
        </div>
      </div>

      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <div
            className="spinner-border text-info"
            role="status"
            style={{ width: '4rem', height: '4rem' }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="text-white-50 mt-3">Fetching market snapshot...</div>
        </div>
      ) : (
        <div className="glass-panel rounded-4 p-3 p-lg-4">
          <div className="d-flex justify-content-between text-white-50 small mb-2">
            <span>Symbol</span>
            <span>Move</span>
          </div>
          <div className="d-flex flex-column gap-3">
            {rows.map((row) => {
              const isUp = row.change >= 0
              return (
                <div
                  key={row.symbol}
                  className="d-flex align-items-center justify-content-between trend-row rounded-3 p-3"
                >
                  <div>
                    <div className="fw-bold text-white">{row.symbol}</div>
                    <div className="text-white-50 small">{row.name}</div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="trend-price text-end">
                      <div className="fw-semibold text-white">
                        ${row.price ? row.price.toFixed(2) : '0.00'}
                      </div>
                    </div>
                    <span
                      className={`badge px-3 py-2 ${
                        isUp ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {row.pct?.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
