import { useNavigate } from 'react-router-dom'

export default function MarketStrip({ rows = [], loading }) {
  const navigate = useNavigate()
  const items = rows.slice(0, 12)

  const formatUSD = (num) => {
    if (!num) num = 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num)
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
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <div className="text-white-50 text-uppercase small">Market pulse</div>
          <h6 className="text-white mb-0">Leaders & indexes</h6>
        </div>
        <div className="text-white-50 small">Live quotes</div>
      </div>

      {loading ? (
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
            {[...items, ...items].map((row, idx) => {
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
                    <div className="text-white-50 small text-truncate" style={{ maxWidth: '180px' }}>
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
