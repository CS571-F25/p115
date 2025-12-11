import { useEffect, useMemo, useState } from 'react'
import { Spinner } from 'react-bootstrap'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'

const ranges = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: 'YTD', days: 200 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 }
]

export default function PriceChart({ ticker, apiUrl: apiUrlProp, customFetcher, onRangeData }) {
  const [data, setData] = useState([])
  const [fullData, setFullData] = useState([])
  const [range, setRange] = useState(ranges[3])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const apiUrl = useMemo(() => {
    if (customFetcher) return null
    return apiUrlProp || 'https://stockagg-q2lidtpoma-uc.a.run.app'
  }, [apiUrlProp, customFetcher])

  useEffect(() => {
    if (!ticker) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker])

  useEffect(() => {
    if (!fullData.length) return
    filterData(range, fullData)
  }, [range, fullData])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      let formatted = []
      if (customFetcher) {
        formatted = await customFetcher({ ticker, days: ranges[ranges.length - 1].days })
      } else {
        const url = new URL(apiUrl)
        url.searchParams.set('ticker', ticker)
        url.searchParams.set('multiplier', '1')
        url.searchParams.set('timespan', 'day')
        url.searchParams.set('days', String(ranges[ranges.length - 1].days)) // always fetch 2Y
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to load chart data')
        const json = await res.json()
        const results = json?.results || []
        formatted = results.map((bar) => ({
          time: bar.t,
          close: bar.c,
          high: bar.h,
          low: bar.l,
          open: bar.o,
          volume: bar.v
        }))
      }
      setFullData(formatted)
      filterData(range, formatted)
    } catch (err) {
      console.error(err)
      setError('Unable to load price chart')
    } finally {
      setLoading(false)
    }
  }

  function filterData(selectedRange, source) {
    if (!source?.length) {
      setData([])
      onRangeData && onRangeData([], selectedRange)
      return
    }
    const now = Date.now()
    const cutoff =
      selectedRange.label === 'YTD'
        ? new Date(new Date().getFullYear(), 0, 1).getTime()
        : now - selectedRange.days * 24 * 60 * 60 * 1000
    const filtered = selectedRange.label === '2Y' ? source : source.filter((d) => d.time >= cutoff)
    setData(filtered)
    onRangeData && onRangeData(filtered, selectedRange)
  }

  const formatValue = (v) => {
    if (v >= 1000) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    if (v >= 1) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    return `$${v.toPrecision(4)}`
  }

  const tooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload
    const d = new Date(p.time)
    return (
      <div
        className="p-2 rounded-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="text-white-50 small">
          {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="text-info fw-semibold">{formatValue(p.close)}</div>
      </div>
    )
  }

  const yDomain = useMemo(() => {
    if (!data.length) return [0, 'auto']
    const closes = data.map((d) => d.close)
    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const pad = (max - min) * 0.08 || 1
    return [Math.max(0, min - pad), max + pad]
  }, [data])

  const xTickFormatter = (t) => {
    const d = new Date(t)
    if (range.label === '1W' || range.label === '1M') {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
    if (range.label === '3M' || range.label === 'YTD') {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
  }

  const xInterval = useMemo(() => {
    if (data.length === 0) return 0
    if (range.label === '1W') return Math.max(1, Math.floor(data.length / 6))
    if (range.label === '1M') return Math.max(1, Math.floor(data.length / 8))
    if (range.label === '3M') return Math.max(1, Math.floor(data.length / 10))
    if (range.label === 'YTD') return Math.max(1, Math.floor(data.length / 12))
    if (range.label === '1Y') return Math.max(1, Math.floor(data.length / 12))
    return Math.max(1, Math.floor(data.length / 14)) // 2Y
  }, [data.length, range.label])

  return (
    <div
      className="glass-panel rounded-4 p-3 p-lg-4"
      style={{ background: 'radial-gradient(circle at 80% 20%, rgba(54,215,255,0.08), transparent 40%), #0a121f' }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <div className="text-white-50 text-uppercase small">Price History</div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {ranges.map((r) => (
            <button
              key={r.label}
              className={`btn btn-sm ${range.label === r.label ? 'btn-info text-dark' : 'btn-outline-light'}`}
              onClick={() => setRange(r)}
              disabled={loading}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="alert alert-warning text-dark py-2 mb-2">{error}</div>
      ) : null}

      <div style={{ height: 320 }}>
        {loading ? (
          <div className="d-flex align-items-center gap-2 text-white-50">
            <Spinner animation="border" size="sm" variant="info" role="status" />
            <span>Loading chart...</span>
          </div>
        ) : data.length ? (
          <ResponsiveContainer>
            <AreaChart
              key={range.label}
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(54,215,255,0.6)" />
                  <stop offset="100%" stopColor="rgba(124,58,237,0.1)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={xTickFormatter}
                tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600 }}
                stroke="rgba(255,255,255,0.3)"
                interval={xInterval}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600 }}
                stroke="rgba(255,255,255,0.3)"
                width={60}
                domain={yDomain}
                allowDecimals={false}
              />
              <Tooltip content={tooltipContent} cursor={{ stroke: 'rgba(54,215,255,0.5)', strokeDasharray: '4 3' }} />
              <Area
                type="monotone"
                dataKey="close"
                strokeWidth={2.5}
                stroke="#36d7ff"
                fill="url(#priceFill)"
                isAnimationActive
                animationBegin={80}
                animationDuration={850}
                animationEasing="ease-out"
                animationId={range.label}
                activeDot={{ r: 5, fill: '#7c3aed', stroke: '#36d7ff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-white-50 small">No data.</div>
        )}
      </div>
    </div>
  )
}
