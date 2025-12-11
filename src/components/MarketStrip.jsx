import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const trendSymbols = ['QQQ', 'SPY', 'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL']
const symbolNames = {
  QQQ: 'Invesco QQQ Trust',
  SPY: 'SPDR S&P 500 ETF',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corporation',
  AMZN: 'Amazon.com',
  NVDA: 'NVIDIA Corporation',
  GOOGL: 'Alphabet Inc.'
}

export default function MarketStrip() {
  const navigate = useNavigate()

  const [marketRows, setMarketRows] = useState([])
  const [marketLoading, setMarketLoading] = useState(true)

  const formatUSD = (num) => {
    if (!num) num = 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num)
  }

  useEffect(() => {
    loadMarketStrip()
  }, [])

  async function loadMarketStrip() {
    setMarketLoading(true)
    try {
      const data = await Promise.all(
        trendSymbols.map(async (symbol) => {
          const quote = await fetch(
            `https://finnhubquote-q2lidtpoma-uc.a.run.app?symbol=${symbol}`
          ).then((r) => (r.ok ? r.json() : null))

          const name = symbolNames[symbol] || symbol
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
      console.error('market strip error', err)
    } finally {
      setMarketLoading(false)
    }
  }


  return (
    <div
      className="rounded-4 p-3 mb-3"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="text-white-50 text-uppercase small">Market pulse</div>
          <h6 className="text-white mb-0">Industry Leaders & Top Indexes</h6>
        </div>
        <div className="text-white-50 small">Live quotes</div>
      </div>

      {marketLoading ? (
        <div className="d-flex align-items-center gap-2 text-white-50">
          <div className="spinner-border spinner-border-sm text-info" role="status" />
          <span>Updating market strip...</span>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '120px'
          }}
        >
          <div
            className="d-flex"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '200%',
              animation: 'ticker-scroll 12s linear infinite',
              gap: '0.5rem'
            }}
          >
            {[...marketRows, ...marketRows].map((row, idx) => {
              const isUp = row.change >= 0
              return (
                <div
                  key={`${row.symbol}-${idx}`}
                  className="p-2 rounded-3 ticker-card-hover"
                  style={{
                    minWidth: '190px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/stock/${row.symbol}`)}
                >
                  <div className="mb-1" style={{ paddingRight: '64px' }}>
                    <div className="fw-bold text-white">{row.symbol}</div>
                    <div className="text-white-50 small text-truncate" style={{ minWidth: '180px' }}>
                      {row.name}
                    </div>
                    <span
                      className={`position-absolute top-2 end-2 badge ${isUp ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger'}`}
                      style={{ right: '8px', top: '8px' }}
                    >
                      {isUp ? '+' : ''}
                      {row.pct?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-info fw-semibold">
                    {row.price ? `$${row.price.toFixed(2)}` : '—'}
                  </div>
                  <div className="text-white-50 small">
                    {isUp ? '+' : ''}{formatUSD(row.change)}
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
