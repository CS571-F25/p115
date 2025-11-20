
import { Link } from 'react-router-dom'

const featuredTickers = [
  { symbol: 'AAPL', price: '$213.12', change: '+1.8%' },
  { symbol: 'MSFT', price: '$408.44', change: '+0.9%' },
  { symbol: 'NVDA', price: '$131.55', change: '+2.3%' },
  { symbol: 'TSLA', price: '$276.19', change: '-0.6%' }
]

const skillCards = [
  {
    title: 'Practice a Trade',
    body: 'Paper-trade a ticker and see your simulated P/L update in real time.',
    cta: 'Try a ticker',
    href: '/stock/AAPL'
  },
  {
    title: 'Follow the News',
    body: 'Scan curated headlines to spot catalysts and sentiment shifts.',
    cta: 'Open news desk',
    href: '/news'
  },
  {
    title: 'Learn the Playbook',
    body: 'Quick tutorials on risk, sizing, and how to read key market signals.',
    cta: 'Open tutorial',
    href: '/tutorial'
  }
]

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-hero p-4 p-lg-5 rounded-4 mb-4 position-relative overflow-hidden">
        <div className="row align-items-center g-4">
          <div className="col-lg-7">
            <div className="d-inline-flex align-items-center gap-2 mb-3 px-3 py-2 rounded-pill home-pill">
              <span className="badge bg-info text-dark fw-semibold">Live Sim</span>
              <span className="text-white-50 small">Paper balance synced across pages</span>
            </div>
            <h1 className="display-5 fw-bold text-white mb-3">
              Build your trading muscle with zero risk.
            </h1>
            <p className="lead text-white-50 mb-4">
              Run paper trades, track simulated P/L, and learn the habits of disciplined
              investors—all inside a high-contrast workspace built for focus.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <Link to="/stock/SPY" className="btn btn-info text-dark fw-semibold px-4 shadow">
                Launch a trade
              </Link>
              <Link
                to="/tutorial"
                className="btn btn-outline-light fw-semibold px-4 border-2"
                style={{ borderColor: 'rgba(255,255,255,0.35)' }}
              >
                View tutorial
              </Link>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="glass-panel p-3 p-sm-4 rounded-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <div className="text-white-50 small">Simulated Equity</div>
                  <div className="h3 mb-0 text-white">$100,000</div>
                </div>
                <span className="badge bg-success-subtle text-success-emphasis px-3 py-2">
                  +3.4% today
                </span>
              </div>
              <div className="home-meter mb-3">
                <div className="home-meter-fill" style={{ width: '68%' }} />
              </div>
              <div className="d-flex justify-content-between text-white-50 small mb-3">
                <span>Risk budget used</span>
                <span>68%</span>
              </div>
              <div className="d-flex gap-3 flex-wrap">
                <div className="home-chip">
                  <span className="text-white-50 small">Open Positions</span>
                  <div className="fw-semibold text-white">3</div>
                </div>
                <div className="home-chip">
                  <span className="text-white-50 small">Win Rate</span>
                  <div className="fw-semibold text-white">58%</div>
                </div>
                <div className="home-chip">
                  <span className="text-white-50 small">Avg. Hold</span>
                  <div className="fw-semibold text-white">2.1 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-4">
        <div className="row g-3">
          {skillCards.map((card) => (
            <div className="col-md-4" key={card.title}>
              <div className="glass-panel h-100 rounded-4 p-4 d-flex flex-column">
                <div className="fw-bold text-white mb-2">{card.title}</div>
                <p className="text-white-50 mb-4">{card.body}</p>
                <Link
                  to={card.href}
                  className="btn btn-sm btn-outline-info mt-auto align-self-start fw-semibold"
                >
                  {card.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-4 p-4">
        <div className="d-flex justify-content-between flex-wrap align-items-center mb-3">
          <div>
            <div className="text-white-50 text-uppercase small">Watchlist Preview</div>
            <h5 className="text-white mb-0">Today&apos;s Moves</h5>
          </div>
          <Link to="/stock/AAPL" className="text-info fw-semibold">
            Jump to ticker →
          </Link>
        </div>
        <div className="row g-3">
          {featuredTickers.map((t) => (
            <div className="col-md-3 col-sm-6" key={t.symbol}>
              <Link to={`/stock/${t.symbol}`} className="text-decoration-none">
                <div className="ticker-card p-3 rounded-3 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-white">{t.symbol}</span>
                    <span
                      className={`badge ${
                        t.change.startsWith('-') ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'
                      }`}
                    >
                      {t.change}
                    </span>
                  </div>
                  <div className="text-white-50 small mb-1">Last</div>
                  <div className="h6 mb-0 text-white">{t.price}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
