import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import PriceChart from '../components/PriceChart'
import TradePanel from '../components/TradePanel'

const primaryCoins = [
  { symbol: 'BTC', label: 'Bitcoin', krakenPair: 'XBTUSD' },
  { symbol: 'ETH', label: 'Ethereum', krakenPair: 'ETHUSD' }
]

const otherCoins = [
  { symbol: 'SOL', name: 'Solana', krakenPair: 'SOLUSD' },
  { symbol: 'BNB', name: 'BNB', krakenPair: 'BNBUSD' },
  { symbol: 'XRP', name: 'XRP', krakenPair: 'XRPUSD' },
  { symbol: 'ADA', name: 'Cardano', krakenPair: 'ADAUSD' },
  { symbol: 'DOGE', name: 'Dogecoin', krakenPair: 'XDGUSD' },
  { symbol: 'AVAX', name: 'Avalanche', krakenPair: 'AVAXUSD' },
  { symbol: 'DOT', name: 'Polkadot', krakenPair: 'DOTUSD' },
  { symbol: 'TRX', name: 'Tron', krakenPair: 'TRXUSD' },
  { symbol: 'UNI', name: 'Uniswap', krakenPair: 'UNIUSD' },
  { symbol: 'LTC', name: 'Litecoin', krakenPair: 'LTCUSD' }
]

function Sparkline ({ data, height = 160, showAxes = false, interactive = false }) {
  if (!data?.length) return null
  const chartData = data.map(([time, value]) => ({ time, value }))

  const formatValue = (v) => {
    if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
    if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    return v.toPrecision(4)
  }

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const point = payload[0].payload
    const date = new Date(point.time)
    return (
      <div
        className="p-2 rounded-3"
        style={{
          backgroundColor: 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#e9f4ff'
        }}
      >
        <div className="small text-white-50">
          {date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="fw-semibold text-info">${formatValue(point.value)}</div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: showAxes ? 12 : 0, bottom: showAxes ? 14 : 0 }}>
          {showAxes ? (
            <>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                stroke="rgba(255,255,255,0.6)"
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              />
              <YAxis
                tickFormatter={(v) => formatValue(v)}
                stroke="rgba(255,255,255,0.6)"
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                width={50}
                domain={['auto', 'auto']}
              />
            </>
          ) : null}
          <Tooltip
            content={renderTooltip}
            cursor={{ stroke: 'rgba(54,215,255,0.5)', strokeDasharray: '4 3' }}
          />
          <defs>
            <linearGradient id="rechartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(54,215,255,0.45)" />
              <stop offset="100%" stopColor="rgba(54,215,255,0.08)" />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#36d7ff"
            strokeWidth={2}
            fill="url(#rechartFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Crypto () {
  const [prices, setPrices] = useState({})
  const [charts, setCharts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detailStats, setDetailStats] = useState(null)
  const [detailError, setDetailError] = useState(null)

  const coinbaseUrl = useMemo(
    () => (pair) => `https://api.coinbase.com/v2/prices/${pair}/spot`,
    []
  )

  async function fetchKrakenOHLC (pair, interval = 60) {
    try {
      const res = await fetch(
        `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}`
      )
      const json = await res.json()
      const key = Object.keys(json?.result || {}).find((k) => k !== 'last')
      const rows = key ? json.result[key] : []
      return rows.map((row) => [row[0] * 1000, Number(row[4])]) // time, close
    } catch (err) {
      console.error('Kraken OHLC error', err)
      return []
    }
  }

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
        fetchKrakenOHLC(c.krakenPair, 60) // hourly, ~30 days
      )

      const [priceResults, chartResults] = await Promise.all([
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
        chartMap[coin.symbol] = chartResults[idx] || []
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

  const pickInterval = (days) => {
    if (days <= 2) return 5
    if (days <= 7) return 30
    if (days <= 30) return 60
    if (days <= 90) return 240
    return 1440
  }

  const historyCache = useRef({})

  async function fetchKrakenHistory ({ ticker, days }) {
    if (!ticker) return []
    const interval = pickInterval(days)
    const cacheKey = `${ticker}-${interval}-${days}`
    if (historyCache.current[cacheKey]) return historyCache.current[cacheKey]
    try {
      const url = `https://api.kraken.com/0/public/OHLC?pair=${ticker}&interval=${interval}`
      const res = await fetch(url)
      const json = await res.json()
      const key = Object.keys(json?.result || {}).find((k) => k !== 'last')
      const rows = key ? json.result[key] : []
      const mapped = rows.map((row) => ({ time: row[0] * 1000, close: Number(row[4]) }))
      historyCache.current[cacheKey] = mapped
      return mapped
    } catch (err) {
      console.error('Kraken history error', err)
      setDetailError('Unable to load coin details right now.')
      return []
    }
  }

  const openModal = (coin) => {
    setSelected(coin)
    setDetailStats(null)
    setDetailError(null)
  }

  const closeModal = () => {
    setSelected(null)
    setDetailStats(null)
  }

  return (
    <div className="container pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="text-white-50 text-uppercase small">Crypto desk</div>
          <h2 className="text-white mb-0">BTC / ETH and market movers</h2>
        </div>
        <button
          className="btn btn-outline-info btn-sm text-info fw-semibold"
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
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer'
              }}
              onClick={() => openModal(coin)}
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
                  className="p-3 rounded-3 h-100 coin-tile"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
                  }}
                  role="button"
                  onClick={() => openModal(coin)}
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

      {selected ? (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.65)', zIndex: 1050 }}
          onClick={closeModal}
        >
          <div
            className="bg-dark text-white rounded-4 shadow-lg"
            style={{ width: 'min(1180px, 96vw)', maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
              <div>
                <div className="text-white-50 small">{selected.name || selected.label}</div>
                <h4 className="mb-0">{selected.symbol}</h4>
              </div>
              <button className="btn btn-outline-light btn-sm" onClick={closeModal}>Close</button>
            </div>
            <div className="p-3">
              {detailError ? (
                <div className="alert alert-warning text-dark">{detailError}</div>
              ) : null}
              <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
                <div className="text-info fs-4 mb-0">
                  {prices[selected.symbol]
                    ? `$${prices[selected.symbol].toLocaleString()}`
                    : detailStats?.last
                      ? `$${Number(detailStats.last).toLocaleString()}`
                      : '—'}
                </div>
                <div className="text-white-50 small">
                  Change: {detailStats?.changePct ?? '—'}%
                </div>
                <div className="text-white-50 small">
                  High: {detailStats?.high ? `$${detailStats.high.toLocaleString()}` : '—'}
                </div>
                <div className="text-white-50 small">
                  Low: {detailStats?.low ? `$${detailStats.low.toLocaleString()}` : '—'}
                </div>
              </div>
              <div className="row g-3 align-items-center">
                <div className="col-lg-8">
                  <div className="border rounded-3 p-2 h-100" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <PriceChart
                      key={selected.symbol}
                      ticker={selected.krakenPair || selected.symbol}
                      customFetcher={({ ticker, days }) => fetchKrakenHistory({ ticker, days })}
                      onRangeData={(series) => {
                        if (!series?.length) {
                          setDetailStats(null)
                          return
                        }
                        const closes = series.map((p) => p.close)
                        const first = closes[0]
                        const last = closes[closes.length - 1]
                        const high = Math.max(...closes)
                        const low = Math.min(...closes)
                        const changePct = first ? (((last - first) / first) * 100).toFixed(2) : null
                        setDetailStats({ high, low, changePct, last })
                      }}
                    />
                  </div>
                </div>
                <div className="col-lg-4">
                  <TradePanel
                    ticker={selected.symbol}
                    price={prices[selected.symbol] || detailStats?.last || 0}
                    holdingsKey="cryptoHoldings"
                    isCrypto
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
