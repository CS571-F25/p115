import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import {
  DEFAULT_GOAL_TARGET,
  DEFAULT_STARTING_BALANCE,
  getAccountState,
  normalizeHoldings,
  saveAccountState,
  seedStarterHoldings
} from '../utils/accountStorage'

const DEFAULT_WATCHLIST = [
  { symbol: 'NVDA', name: 'NVDA' },
  { symbol: 'VOO', name: 'VOO' },
  { symbol: 'GOOGL', name: 'GOOGL' },
  { symbol: 'FIG', name: 'FIG' }
]

export default function Dashboard() {
  const navigate = useNavigate()
  const formatCurrency = (val) =>
    `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const normalizeShares = (value) => {
    if (!Number.isFinite(value)) return 0
    const rounded = Number(value.toFixed(2))
    return Math.abs(rounded) < 0.005 ? 0 : rounded
  }
  const [watchlist, setWatchlist] = useState([])
  const [watchRows, setWatchRows] = useState([])
  const [watchLoading, setWatchLoading] = useState(true)
  const [cashBalance, setCashBalance] = useState(0)
  const [holdings, setHoldings] = useState({})
  const [cryptoHoldings, setCryptoHoldings] = useState({})
  const [cryptoPrices, setCryptoPrices] = useState({})
  const [pricedPositions, setPricedPositions] = useState([])
  const [transactions, setTransactions] = useState([])
  const [equitiesValue, setEquitiesValue] = useState(0)
  const [startingBalance, setStartingBalance] = useState(DEFAULT_STARTING_BALANCE)
  const [goalTarget, setGoalTarget] = useState(DEFAULT_GOAL_TARGET)
  const [showTxModal, setShowTxModal] = useState(false)
  const [txPage, setTxPage] = useState(0)
  const [briefingSections, setBriefingSections] = useState([])
  const [briefingError, setBriefingError] = useState(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [briefingMeta, setBriefingMeta] = useState({ headlines: [], tickers: [] })
  const briefingRunRef = useRef(0)
  const briefingAbortRef = useRef(null)

  const formatUSD = (num) => {
    if (!num) num = 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num)
  }

  const formatBriefingMarkdown = (text) =>
    (text || '')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

  useEffect(() => {
    const list = loadWatchlist()
    refreshWatchlistQuotes(list)
    loadPortfolio()
    seedStarterHoldings()
      .then((next) => {
        if (next) {
          setCashBalance(next.cashBalance || DEFAULT_STARTING_BALANCE)
          setHoldings(normalizeHoldings(next.holdings))
          setTransactions(Array.isArray(next.transactions) ? next.transactions : [])
          setStartingBalance(next.startingBalance || DEFAULT_STARTING_BALANCE)
          setGoalTarget(next.goalTarget || DEFAULT_GOAL_TARGET)
        }
      })
      .catch((err) => console.error('starter seed init error', err))
  }, [])

  useEffect(() => {
    loadHoldingQuotes()
  }, [holdings])

  useEffect(() => {
    loadCryptoPrices()
  }, [cryptoHoldings])

  useEffect(() => {
    const handlePortfolioEvent = () => loadPortfolio()
    window.addEventListener('portfolio-updated', handlePortfolioEvent)
    window.addEventListener('storage', handlePortfolioEvent)
    return () => {
      if (briefingAbortRef.current) briefingAbortRef.current.abort()
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
      if (saved === null) {
        persistWatchlist(DEFAULT_WATCHLIST)
        return DEFAULT_WATCHLIST
      }
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

  const coinbaseUrl = useMemo(
    () => (pair) => `https://api.coinbase.com/v2/prices/${pair}/spot`,
    []
  )

  async function loadCryptoPrices() {
    const symbols = Object.keys(cryptoHoldings || {})
    if (!symbols.length) {
      setCryptoPrices({})
      return
    }
    try {
      const priceResults = await Promise.all(
        symbols.map((sym) =>
          fetch(coinbaseUrl(`${sym}-USD`))
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      )
      const map = {}
      symbols.forEach((sym, idx) => {
        const data = priceResults[idx]?.data
        map[sym] = data?.amount ? Number(data.amount) : null
      })
      setCryptoPrices(map)
    } catch (err) {
      console.error('crypto price load error', err)
      setCryptoPrices({})
    }
  }


  function loadPortfolio() {
    const state = getAccountState()
    const normalizedHoldings = normalizeHoldings(state.holdings)
    let normalizedCrypto = {}
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('cryptoHoldings')
        const parsed = raw ? JSON.parse(raw) : {}
        normalizedCrypto = normalizeHoldings(parsed)
      } catch (err) {
        console.error('crypto holdings parse error', err)
      }
    }
    setCashBalance(state.cashBalance || DEFAULT_STARTING_BALANCE)
    setHoldings(normalizedHoldings)
    setCryptoHoldings(normalizedCrypto)
    setTransactions(Array.isArray(state.transactions) ? state.transactions : [])
    setStartingBalance(state.startingBalance || DEFAULT_STARTING_BALANCE)
    setGoalTarget(state.goalTarget || DEFAULT_GOAL_TARGET)
    // ensure normalized holdings are persisted once loaded
    saveAccountState({ holdings: normalizedHoldings }, { silent: true })
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

  const cryptoValue = useMemo(() => {
    return Object.entries(cryptoHoldings || {}).reduce((sum, [symbol, pos]) => {
      const price = cryptoPrices[symbol] || 0
      const shares = Number.isFinite(pos?.shares) ? Number(pos.shares) : 0
      return sum + price * shares
    }, 0)
  }, [cryptoHoldings, cryptoPrices])

  const totalValue = cashBalance + equitiesValue + cryptoValue
  const goalCurrent = totalValue - startingBalance
  const goalProgressRaw = goalTarget > 0 ? (goalCurrent / goalTarget) * 100 : 0
  const goalProgress = Math.max(0, Math.min(100, goalProgressRaw))
  const goalProgressLabel = Math.max(0, Math.min(100, Math.round(goalProgressRaw)))

  const pricedPositionsBySymbol = useMemo(() => {
    const map = {}
    pricedPositions.forEach((pos) => {
      map[pos.symbol] = pos
    })
    return map
  }, [pricedPositions])

  const positionsToRender = useMemo(() => {
    const symbols = Object.keys(holdings || {})
    return symbols.map((symbol) => {
      const base = holdings[symbol] || {}
      const shares = Number.isFinite(base.shares) ? Number(base.shares.toFixed(2)) : 0
      const priced = pricedPositionsBySymbol[symbol] || {}
      return {
        symbol,
        shares,
        avgPrice: base.avgPrice,
        last: priced.last,
        dayChange: priced.dayChange,
        dayPct: priced.dayPct
      }
    })
  }, [holdings, pricedPositionsBySymbol])

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize))
    setTxPage((prev) => Math.min(prev, pages - 1))
  }, [sortedTransactions.length])

  async function loadPortfolioBriefing() {
    const runId = Date.now()
    briefingRunRef.current = runId
    if (briefingAbortRef.current) {
      briefingAbortRef.current.abort()
    }
    const controller = new AbortController()
    briefingAbortRef.current = controller
    setBriefingLoading(true)
    setBriefingError(null)
    setBriefingSections([])
    try {
      const holdingsPayload = Object.entries(holdings || {}).map(([symbol, val]) => ({
        symbol,
        shares: val?.shares ?? 0
      }))
      const watchPayload = watchlist.map((w) => w.symbol || w)
      const baseUrl = 'https://chatrealtime-q2lidtpoma-uc.a.run.app'
      const valuesBySymbol = pricedPositions.reduce((acc, pos) => {
        acc[pos.symbol] = pos.value || 0
        return acc
      }, {})

      const topHoldings = holdingsPayload
        .map((h) => ({ ...h, equity: valuesBySymbol[h.symbol] ?? h.shares * (holdings[h.symbol]?.avgPrice || 0) }))
        .sort((a, b) => (b.equity || 0) - (a.equity || 0))
        .slice(0, 3)

      const streamBrief = async ({ key, messages }) => {
        const res = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream'
          },
          cache: 'no-store',
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            temperature: 0.3,
            stream: true,
            messages
          })
        })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || 'Briefing request failed')
        }
        const reader = res.body?.getReader()
        if (!reader) throw new Error('Stream not supported')
        const decoder = new TextDecoder()
        let buffer = ''
        let got = false
        const processBuffer = () => {
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''
          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data:')) continue
          const payload = line.replace(/^data:\s*/, '')
          if (payload === '[DONE]') continue
          try {
            const parsed = JSON.parse(payload)
            const extractContent = (content) => {
              if (Array.isArray(content)) {
                return content
                  .map((part) => (typeof part === 'string' ? part : part?.text || ''))
                  .join('')
              }
              return content || ''
            }
            const delta =
              extractContent(parsed?.choices?.[0]?.delta?.content) ||
              extractContent(parsed?.choices?.[0]?.message?.content) ||
              ''
            if (delta) {
              got = true
              if (briefingRunRef.current !== runId) return
              setBriefingSections((prev) =>
                prev.map((section) =>
                  section.key === key ? { ...section, content: (section.content || '') + delta } : section
                )
              )
            }
            } catch (err) {
              console.error('briefing stream parse error', err)
            }
          }
        }

        while (true) {
            const { value, done } = await reader.read()
          if (controller.signal.aborted || briefingRunRef.current !== runId) return
          if (done) {
            buffer += decoder.decode()
            processBuffer()
            break
          }
          buffer += decoder.decode(value, { stream: true })
          processBuffer()
        }
        if (!got) throw new Error('Empty response')
      }

      // Market/News brief
      const systemMarket =
        'You are a real-time market brief bot. Use browsing to pull today’s market themes, macro drivers, and notable headlines. Start with a level-4 markdown heading summarizing the session (e.g., "#### Market Snapshot"), then provide 5-7 concise markdown bullets. Each bullet must be one sentence, start with "- ", include a clear subject and a verb, and avoid duplicate words. No sub-bullets or paragraphs.'
      const userMarket = `Date: ${new Date().toISOString()}. Watchlist: ${watchPayload.join(', ') || 'None'}.`
      const requests = [
        {
          key: 'market',
          title: 'Market & News',
          messages: [
            { role: 'system', content: systemMarket },
            { role: 'user', content: userMarket }
          ]
        }
      ]

      // Holdings-specific brief if any
      if (topHoldings.length) {
        const systemHoldings =
          'You are a real-time holdings brief bot. Use browsing to find fresh headlines, catalysts, or notable moves for the provided holdings. Focus only on these tickers. For each ticker, output a level-5 markdown heading like "##### TICKER (Name)" followed by exactly 2 concise markdown bullets. If nothing recent, say so briefly.'
        const userHoldings = `Top holdings by equity: ${topHoldings
          .map((h) => `${h.symbol} (${h.shares} ${h.shares === 1? "share" : "shares"})`)
          .join(', ')}. Date: ${new Date().toISOString()}.`
        requests.push({
          key: 'holdings',
          title: 'Holdings Highlights',
          messages: [
            { role: 'system', content: systemHoldings },
            { role: 'user', content: userHoldings }
          ]
        })
      }

      setBriefingSections(requests.map(({ key, title }) => ({ key, title, content: '' })))
      await Promise.all(requests.map((req) => streamBrief(req)))
      if (briefingRunRef.current === runId) {
        setBriefingMeta({ headlines: [], tickers: watchPayload })
      }
    } catch (err) {
      if (controller.signal.aborted || briefingRunRef.current !== runId) return
      console.error('portfolio briefing error', err)
      setBriefingError('Could not load briefing right now.')
    } finally {
      if (briefingRunRef.current === runId) {
        setBriefingLoading(false)
      }
    }
  }

  useEffect(() => {
    loadPortfolioBriefing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(holdings), JSON.stringify(watchlist)])

  return (
    <div className="container py-3">
      <div
        className="glass-panel rounded-4 p-3 p-lg-4 mb-3 d-flex flex-column flex-md-row align-items-start justify-content-between gap-3"
        style={{ borderColor: 'rgba(24,200,242,0.25)' }}
      >
        <div>
          <div className="text-white-50 text-uppercase small">Account balance</div>
          <div className="text-white fw-bold" style={{ fontSize: '2.4rem', lineHeight: 1 }}>
            {formatCurrency(totalValue)}
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
          <div className="p-2 px-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-white-50 small">Crypto</div>
            <div className="text-white fw-semibold">{formatCurrency(cryptoValue)}</div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="glass-panel rounded-4 p-3 p-lg-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <h3 className="text-white mb-1 h6">Stock Positions</h3>
              </div>
            </div>
            <div className="d-flex flex-column gap-2">
              {positionsToRender.length ? (
                positionsToRender.map((pos) => {
                  const hasPrice = Number.isFinite(pos.last)
                  const hasChange = Number.isFinite(pos.dayChange) && Number.isFinite(pos.dayPct)
                  const dayChangeVal = hasChange ? pos.dayChange : 0
                  const isUp = dayChangeVal >= 0
                  const sharesLabel = `${pos.shares.toFixed(2).replace(/\.?0+$/, '')} ${pos.shares === 1? "share" : "shares"}`
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
                          {hasPrice ? `$${pos.last.toFixed(2)}` : '—'}
                        </div>
                        <div
                          className={`small fw-semibold ${
                            hasChange ? (isUp ? 'text-success' : 'text-danger') : 'text-white-50'
                          }`}
                        >
                          {hasChange ? (
                            <>
                              {isUp ? '+' : ''}
                              {pos.dayChange?.toFixed(2)} ({pos.dayPct?.toFixed(2)}%)
                            </>
                          ) : (
                            '—'
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-white-50 small">No positions yet. Place a trade to get started.</div>
              )}
            </div>

            <div className="d-flex justify-content-between align-items-center mt-4 mb-2">
              <div>
                <h3 className="text-white mb-1 h6">Crypto Positions</h3>
              </div>
            </div>
            <div className="d-flex flex-column gap-2">
              {Object.keys(cryptoHoldings || {}).length ? (
                Object.entries(cryptoHoldings).map(([symbol, pos]) => {
                  const sharesLabel = `${pos.shares.toFixed(2).replace(/\.?0+$/, '')} ${symbol}`
                  return (
                    <div
                      key={symbol}
                      className="rounded-3 p-3 d-flex justify-content-between align-items-center position-card"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate('/crypto')}
                      >
                        <div>
                          <div className="fw-semibold text-white">{symbol}</div>
                          <div className="text-white-50 small">{sharesLabel}</div>
                        </div>
                        <div className="text-end">
                          <div className="text-white fw-semibold">
                            {cryptoPrices[symbol] ? `$${cryptoPrices[symbol].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </div>
                        </div>
                      </div>
                    )
                  })
              ) : (
                <div className="text-white-50 small">No crypto yet. Buy a coin to see it here.</div>
              )}
            </div>
            
            {recentTx.length > 0 &&
              <>
                <div className="d-flex justify-content-between align-items-center mt-5">
                    <div>
                      <h3 className="text-white mb-0 h6">Recent Orders</h3>
                    </div>
                    <button
                      className="btn btn-outline-info btn-sm text-info fw-semibold"
                      onClick={() => {
                        setTxPage(0)
                        setShowTxModal(true)
                      }}
                      disabled={!transactions.length}
                    >
                      Full History
                    </button>
                  </div>

                <div className="glass-panel rounded-3 mt-3 p-3">
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
                              <div className="text-white-50 small">
                                {tx.assetType === 'crypto' ? 'Crypto Order' : 'Stock Order'}
                              </div>
                            </div>
                            <div className="d-flex justify-content-center ms-auto" style={{ minWidth: '112px' }}>
                              <span
                                className={`badge ${badgeClass} px-3 py-2 text-uppercase text-center text-black`}
                                style={{ minWidth: '112px', lineHeight: 1.1 }}
                              >
                                {tx.side === 'Buy' ? 'Bought' : 'Sold'}
                              </span>
                            </div>
                            <div className="text-end" style={{ minWidth: '180px' }}>
                              <div className="fw-semibold text-white">
                                {tx.qty?.toFixed(2).replace(/\.?0+$/, '')}{' '}
                                {tx.assetType === 'crypto'
                                  ? tx.ticker?.toUpperCase() || ''
                                  : tx.qty === 1
                                    ? 'share'
                                    : 'shares'}
                              </div>
                              <div className="text-white-50 small order-meta">
                                @ {formatUSD(tx.price)} · {new Date(tx.ts).toLocaleDateString()}
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
              </>
            }

          </div>
        </div>

        <div className="col-lg-7">
          <div className="glass-panel rounded-4 p-3 p-lg-4 h-100 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-white-50 text-uppercase small">Goal Tracker</div>
              </div>
              <span className="badge bg-info text-dark">
                {goalProgressLabel}% of goal reached
              </span>
            </div>
            <div
              className="rounded-pill w-100"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', height: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div
                style={{
                  width: `${goalProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #36d7ff, #7c3aed)'
                }}
              />
            </div>
            <div className="d-flex justify-content-between text-white-50 small">
              <span>Profit: {formatCurrency(goalCurrent)}</span>
              <span>Goal: ${goalTarget.toLocaleString()}</span>
            </div>


            <div className="glass-panel rounded-3 p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <div className="text-white-50 text-uppercase small">Briefing</div>
          <h5 className="text-white mb-0">Portfolio pulse</h5>
        </div>
        <button
          className="btn btn-outline-info btn-sm text-info fw-semibold"
          onClick={loadPortfolioBriefing}
          disabled={briefingLoading}
                >
                  {briefingLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              {briefingError ? (
                <div className="text-warning small mb-2">{briefingError}</div>
              ) : null}
              {briefingLoading ? (
                <div className="d-flex align-items-center gap-2 text-white-50 small mb-2">
                  <div className="spinner-border spinner-border-sm text-info" role="status" />
                  <span>Preparing your daily briefing...</span>
                </div>
              ) : null}
              {briefingSections.length ? (
                <div className="d-flex flex-column gap-2">
                  {briefingSections.map((section) => (
                    <div
                      key={section.key}
                      className="rounded-3 p-3"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {section.key !== 'market' ? (
                        <h3 className="text-white mb-2 h6" style={{ letterSpacing: '0.4px', fontSize: '0.95rem' }}>
                            {section.title}
                          </h3>
                      ) : null}
                      {section.content ? (
                        <div
                          className="text-white-50 small briefing-markdown"
                          style={{ whiteSpace: 'normal' }}
                          dangerouslySetInnerHTML={{ __html: marked.parse(formatBriefingMarkdown(section.content || '')) }}
                        />
                      ) : (
                        <div className="text-white-50 small">Streaming...</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-white-50 small">
                  {briefingLoading ? 'Streaming briefing...' : 'No briefing yet.'}
                </div>
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
        <div className="modal-backdrop-custom" role="presentation" onClick={() => setShowTxModal(false)}>
          <div
            className="modal-panel glass-panel rounded-4 p-3 p-lg-4 history-modal-panel"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3 history-modal-header">
              <div>
                <div className="text-white-50 text-uppercase small">Trade history</div>
                <h3 className="text-white mb-0 h5">All orders</h3>
              </div>
              <button className="btn btn-outline-light btn-sm" onClick={() => setShowTxModal(false)}>
                Close
              </button>
            </div>
            {sortedTransactions.length ? (
              <>
                <div className="d-flex text-white-75 small pb-2 history-head-row">
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
                        className="d-flex align-items-center p-2 rounded-3 history-row"
                      >
                        <div className="flex-grow-1">
                          <div className="text-white fw-semibold">{tx.ticker}</div>
                          <div className="text-white-50 small">Order</div>
                        </div>
                        <div style={{ width: '120px' }}>
                          <span className={`badge ${badgeClass} px-3 py-2 text-uppercase history-badge`}>{tx.side}</span>
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
                  <div className="text-white-75 small">
                    Page {txPage + 1} of {totalPages}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-light history-nav"
                      disabled={txPage === 0}
                      onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                    >
                      Prev
                    </button>
                    <button
                      className="btn btn-sm btn-outline-light history-nav"
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
