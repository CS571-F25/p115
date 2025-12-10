import { useEffect, useMemo, useState } from 'react'

const primaryCoins = [
  { id: 'bitcoin', symbol: 'BTC', label: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', label: 'Ethereum' }
]

const otherCoins = [
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'TRX', name: 'Tron' },
  { symbol: 'UNI', name: 'Uniswap' },
  { symbol: 'LTC', name: 'Litecoin' }
]

function Sparkline ({ data }) {
  if (!data?.length) return null
  const width = 320
  const height = 120
  const values = data.map((p) => p[1])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = data.map((p, idx) => {
    const x = (idx / (data.length - 1 || 1)) * width
    const y = height - ((p[1] - min) / range) * height
    return [x, y]
  })

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(54,215,255,0.4)" />
          <stop offset="100%" stopColor="rgba(54,215,255,0.05)" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L${width},${height} L0,${height} Z`}
        fill="url(#sparkFill)"
        stroke="none"
      />
      <path d={path} stroke="#36d7ff" strokeWidth="2" fill="none" />
    </svg>
  )
}

export default function Crypto () {
  const [prices, setPrices] = useState({})
  const [charts, setCharts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const coinbaseUrl = useMemo(
    () => (pair) => `https://api.coinbase.com/v2/prices/${pair}/spot`,
    []
  )

  useEffect(() => {
    loadData()
  }, [])

  async function loadData () {
    setLoading(true)
    setError(null)
    try {
      const pricePromises = [
        ...primaryCoins.map((c) => fetch(coinbaseUrl(`${c.symbol}-USD`)).then((r) => r.json())),
        ...otherCoins.map((c) => fetch(coinbaseUrl(`${c.symbol}-USD`)).then((r) => r.json()))
      ]

      const chartPromises = primaryCoins.map((c) =>
        fetch(
          `https://api.coingecko.com/api/v3/coins/${c.id}/market_chart?vs_currency=usd&days=30&interval=daily`
        ).then((r) => r.json())
      )

      const [priceResults, ...chartResults] = await Promise.all([
        Promise.all(pricePromises),
        Promise.all(chartPromises)
      ])

      const priceMap = {}
      primaryCoins.concat(otherCoins).forEach((coin, idx) => {
        const data = priceResults[idx]?.data
        priceMap[coin.symbol] = data?.amount ? Number(data.amount) : null
      })

      const chartMap = {}
      primaryCoins.forEach((coin, idx) => {
        const pricesArr = chartResults[0][idx]?.prices || []
        chartMap[coin.symbol] = pricesArr
      })

      setPrices(priceMap)
      setCharts(chartMap)
    } catch (err) {
      console.error(err)
      setError('Failed to load crypto data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="text-white-50 text-uppercase small">Crypto desk</div>
          <h2 className="text-white mb-0">BTC / ETH and market movers</h2>
        </div>
        <button
          className="btn btn-outline-info btn-sm text-dark fw-semibold"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="alert alert-warning text-dark">{error}</div>
      ) : null}

      <div className="row g-4 mb-4">
        {primaryCoins.map((coin) => (
          <div className="col-lg-6" key={coin.symbol}>
            <div
              className="card h-100 text-bg-dark border-0"
              style={{
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                boxShadow: '0 14px 28px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <div className="text-white-50 small">{coin.label}</div>
                    <h4 className="text-white mb-0">{coin.symbol}</h4>
                  </div>
                  <div className="text-end">
                    <div className="text-white-50 small">Spot</div>
                    <div className="fs-4 text-info">
                      {prices[coin.symbol] ? `$${prices[coin.symbol].toLocaleString()}` : '—'}
                    </div>
                  </div>
                </div>
                <div className="small text-white-50 mb-2">Last 30 days</div>
                <Sparkline data={charts[coin.symbol]} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card text-bg-dark border-0">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-white mb-0">Top coins by price</h5>
            <span className="text-white-50 small">Spot via Coinbase</span>
          </div>
          <div className="row g-3">
            {otherCoins.map((coin) => (
              <div className="col-md-6 col-lg-4" key={coin.symbol}>
                <div
                  className="p-3 rounded-3 h-100"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-white fw-semibold">{coin.symbol}</div>
                      <div className="text-white-50 small">{coin.name}</div>
                    </div>
                    <div className="text-info fw-bold">
                      {prices[coin.symbol] ? `$${Number(prices[coin.symbol]).toLocaleString()}` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
