import { useEffect, useMemo, useState } from 'react'

export default function TradePanel({
  ticker,
  price,
  cashKey = 'paperCash',
  holdingsKey = 'paperHoldings',
  transactionsKey = 'paperTransactions',
  isCrypto = false
}) {
  const symbol = (ticker || '').toUpperCase()
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
  const [cashBalance, setCashBalance] = useState(() => {
    if (typeof window === 'undefined') return 100000
    const saved = window.localStorage.getItem(cashKey)
    const parsed = saved ? Number.parseFloat(saved) : NaN
    return Number.isFinite(parsed) ? parsed : 100000
  })
  const [holdings, setHoldings] = useState(() => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = window.localStorage.getItem(holdingsKey)
      const parsed = saved ? JSON.parse(saved) : {}
      return normalizeHoldings(parsed)
    } catch (err) {
      console.error('trade panel holdings parse error', err)
      return {}
    }
  })
  const [transactions, setTransactions] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = window.localStorage.getItem(transactionsKey)
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      console.error('trade panel tx parse error', err)
      return []
    }
  })
  const [orderQty, setOrderQty] = useState('')
  const [tradeError, setTradeError] = useState(null)
  const [successDetails, setSuccessDetails] = useState(null)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [side, setSide] = useState('buy')
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewDetails, setReviewDetails] = useState(null)
  const [buyIn, setBuyIn] = useState('shares') // 'shares' | 'dollars'

  const marketPrice = price ? Number(price) : 0
  const parsedQty = Number(orderQty)
  const estimatedCost =
    buyIn === 'shares'
      ? parsedQty && marketPrice
        ? parsedQty * marketPrice
        : 0
      : parsedQty || 0
  const formattedCash = `$${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const position = useMemo(() => holdings[symbol] || { shares: 0, avgPrice: 0 }, [holdings, symbol])
  const canTrade = Boolean(symbol && marketPrice)
  const formatShares = (val) => {
    if (!Number.isFinite(val)) return '0'
    const trimmed = val.toFixed(2).replace(/\.?0+$/, '')
    return trimmed || '0'
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(cashKey, cashBalance.toString())
  }, [cashBalance, cashKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(holdingsKey, JSON.stringify(holdings))
  }, [holdings, holdingsKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(transactionsKey, JSON.stringify(transactions))
  }, [transactions, transactionsKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(cashKey)
    const parsed = saved ? Number.parseFloat(saved) : NaN
    setCashBalance(Number.isFinite(parsed) ? parsed : 100000)
  }, [cashKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(holdingsKey)
      const parsed = saved ? JSON.parse(saved) : {}
      setHoldings(normalizeHoldings(parsed))
    } catch (err) {
      console.error('trade panel holdings refresh error', err)
      setHoldings({})
    }
  }, [holdingsKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(transactionsKey)
      const parsed = saved ? JSON.parse(saved) : []
      setTransactions(Array.isArray(parsed) ? parsed : [])
    } catch (err) {
      console.error('trade panel tx refresh error', err)
      setTransactions([])
    }
  }, [transactionsKey])

  useEffect(() => {
    if (!tradeError) return
    const timer = setTimeout(() => setTradeError(null), 1600)
    return () => clearTimeout(timer)
  }, [tradeError])

  useEffect(() => {
    // Let any listeners know portfolio values changed
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('portfolio-updated'))
  }, [cashBalance, holdings, transactions])

  const reviewOrder = () => {
    setTradeError(null)
    setSuccessDetails(null)
    setShowSuccessOverlay(false)
    const qtyInput = Number(orderQty)
    if (!marketPrice) {
      setTradeError('Price unavailable')
      return
    }
    if (!symbol) {
      setTradeError('Invalid ticker')
      return
    }

    const shares =
      buyIn === 'shares'
        ? Number(qtyInput)
        : marketPrice
          ? Number((qtyInput / marketPrice).toFixed(4))
          : 0
    const dollars = buyIn === 'shares' ? shares * marketPrice : qtyInput

    if (!shares || shares <= 0 || !Number.isFinite(shares)) {
      setTradeError('Enter a quantity > 0')
      return
    }

    if (side === 'sell') {
      const existing = holdings[symbol]
      if (!existing || existing.shares < shares) {
        setTradeError('Not enough shares')
        return
      }
    }
    if (side === 'buy' && dollars > cashBalance + 1e-6) {
      setTradeError('Not enough cash')
      return
    }
    const normalizedShares = Number(shares.toFixed(2))
    const normalizedDollars = Number(dollars.toFixed(2))
    setReviewDetails({
      side,
      qty: normalizedShares,
      ticker: symbol,
      price: marketPrice,
      est: normalizedDollars
    })
    setIsReviewing(true)
  }

  const handleTrade = (sideParam) => {
    const activeSide = sideParam || side
    setTradeError(null)
    setSuccessDetails(null)
    setShowSuccessOverlay(false)
    const qty =
      reviewDetails?.qty ??
      (buyIn === 'shares'
        ? Number(orderQty)
        : marketPrice
          ? Number(((Number(orderQty) || 0) / marketPrice).toFixed(2))
          : 0)
    if (!qty || qty <= 0) {
      setTradeError('Enter a quantity > 0')
      return
    }
    if (!marketPrice) {
      setTradeError('Price unavailable')
      return
    }
    if (!symbol) {
      setTradeError('Invalid ticker')
      return
    }

    if (activeSide === 'buy') {
      const cost = marketPrice * qty
      if (cost > cashBalance + 1e-6) {
        setTradeError('Not enough cash')
        return
      }
      setCashBalance((prev) => Number((prev - cost).toFixed(2)))
      setHoldings((prev) => {
        const existing = prev[symbol] || { shares: 0, avgPrice: 0 }
        const existingShares = normalizeShares(existing.shares)
        const newShares = normalizeShares(existingShares + qty)
        const newAvg =
          newShares > 0
            ? (existing.avgPrice * existingShares + marketPrice * qty) / newShares
            : 0
        return {
          ...prev,
          [symbol]: { shares: newShares, avgPrice: Number(newAvg.toFixed(2)) }
        }
      })
      setTransactions((prev) => [
        {
          id: crypto.randomUUID(),
          ticker: symbol,
          side: 'Buy',
          assetType: isCrypto ? 'crypto' : 'stock',
          qty,
          price: Number(marketPrice.toFixed(2)),
          total: Number((marketPrice * qty).toFixed(2)),
          ts: Date.now()
        },
        ...prev
      ])
      setSuccessDetails({ side: 'Buy', qty, ticker: symbol, price: marketPrice })
    } else {
      const existing = holdings[symbol]
      const existingShares = normalizeShares(existing?.shares ?? 0)
      if (!existing || existingShares < qty) {
        setTradeError('Not enough shares')
        return
      }
      const proceeds = marketPrice * qty
      setCashBalance((prev) => Number((prev + proceeds).toFixed(2)))
      setHoldings((prev) => {
        const updated = { ...prev }
        const newShares = normalizeShares(existingShares - qty)
        if (newShares <= 0) {
          delete updated[symbol]
        } else {
          updated[symbol] = { ...existing, shares: newShares }
        }
        return updated
      })
      setTransactions((prev) => [
        {
          id: crypto.randomUUID(),
          ticker: symbol,
          side: 'Sell',
          assetType: isCrypto ? 'crypto' : 'stock',
          qty,
          price: Number(marketPrice.toFixed(2)),
          total: Number((marketPrice * qty).toFixed(2)),
          ts: Date.now()
        },
        ...prev
      ])
      setSuccessDetails({ side: 'Sell', qty, ticker: symbol, price: marketPrice })
    }
    setShowSuccessOverlay(true)
    setOrderQty('')
    setIsReviewing(false)
    setReviewDetails(null)
    setTimeout(() => {
      setShowSuccessOverlay(false)
    }, 3000)
  }

  return (
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
        <span className="badge bg-success-subtle text-success-emphasis">{isCrypto? "Crypto" : "Stocks"}</span>
      </div>
      <div className="d-flex flex-column gap-3">
        <div className="trade-toggle my-1">
          <button
            className={`toggle-pill buy-pill ${side === 'buy' ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setSide('buy')
              setIsReviewing(false)
              setReviewDetails(null)
              setTradeError(null)
            }}
          >
            Buy
          </button>
          <button
            className={`toggle-pill sell-pill ${side === 'sell' ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setSide('sell')
              setIsReviewing(false)
              setReviewDetails(null)
              setTradeError(null)
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
          <label className="form-label text-white-50 small mb-1" htmlFor="order-quantity">
            {buyIn === 'shares' ? 'Shares' : 'Amount ($)'}
          </label>
          <input
            id="order-quantity"
            type="number"
            min="0"
            step="0.01"
            className="form-control bg-dark text-white border-secondary trade-input w-50"
            placeholder={buyIn === 'shares' ? '0' : '0.00'}
            value={orderQty}
            onChange={(e) => setOrderQty(e.target.value)}
            aria-label={buyIn === 'shares' ? 'Number of shares' : 'Order amount in dollars'}
          />
        </div>
        <div className="d-flex justify-content-between text-white-50 small">
          <span>Market price</span>
          <span className="text-success fw-semibold">
            {marketPrice ? `$${marketPrice.toFixed(2)}` : '—'}
          </span>
        </div>
        <div className="d-flex justify-content-between text-white-50 small border-top border-secondary pt-2">
          <span>Estimated cost</span>
          <span className="text-white">
            {estimatedCost ? `$${estimatedCost.toFixed(2)}` : '—'}
          </span>
        </div>
        {!isReviewing ? (
          <button
            className={`btn fw-semibold w-100 trade-btn ${tradeError ? 'btn-danger pulse' : 'btn-gradient'}`}
            type="button"
            onClick={reviewOrder}
            disabled={!canTrade}
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
                setIsReviewing(false)
                setReviewDetails(null)
                setTradeError(null)
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
        {position.shares ? (
          <div className="text-white-50 small text-center">
            {isCrypto
              ? `Holding: ${formatShares(position.shares)} ${symbol}`
              : `Holding: ${formatShares(position.shares)} ${position.shares === 1? "share" : "shares"}`}
          </div>
        ) : null}
      </div>
    </div>
  )
}
