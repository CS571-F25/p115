
import { useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MarketStrip from '../components/MarketStrip'

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
    title: 'Trade Crypto',
    body: 'Practice trading Bitcoin, Ethereum, and top tokens with instant price updates.',
    cta: 'Explore crypto',
    href: '/crypto'
  }
]

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <section className="home-hero p-4 p-lg-5 rounded-4 mb-4 position-relative overflow-hidden">
        <div className="row align-items-center g-4">
          <div className="col-lg-7">
            <h1 className="display-5 fw-bold text-white mb-3">
              Build your trading muscle with zero risk.
            </h1>
            <p className="lead text-white-50 mb-4">
              Run paper trades, track simulated P/L, and learn the habits of disciplined
              investors—all inside a high-contrast workspace built for focus.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <Link to="/dashboard" className="btn btn-info text-dark fw-semibold px-4 shadow">
                Open Dashboard
              </Link>
              <Link
                to="/chat"
                className="btn btn-outline-light fw-semibold px-4 border-2"
                style={{ borderColor: 'rgba(255,255,255,0.35)' }}
              >
                Checkout our AI trading assistant
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
                <div className="d-flex  align-items-center">
                <button
                  className="btn btn-outline-info btn-sm text-info fw-semibold"
                  onClick={() => {navigate(card.href)}}
                >
                  {card.cta}
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

        
      <MarketStrip />
    </div>
  )
}
