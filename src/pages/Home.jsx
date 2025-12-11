
import { useNavigate, Link } from 'react-router-dom'
import { Container, Row, Col } from 'react-bootstrap'
import MarketStrip from '../components/MarketStrip'

const skillCards = [
  {
    title: 'Practice a Trade',
    body: 'Lets get your first trade on the books!',
    cta: 'Try a ticker',
    href: '/stock/AAPL'
  },
  {
    title: 'Follow the News',
    body: 'Stay ahead with fast, curated market stories.',
    cta: 'Open news desk',
    href: '/news'
  },
  {
    title: 'Trade Crypto',
    body: 'Practice trading BTC, ETH, and other top coins.',
    cta: 'Explore crypto',
    href: '/crypto'
  }
]

export default function Home() {
  const navigate = useNavigate();

  return (
    <Container fluid className="home-page">
      <section className="home-hero p-4 p-lg-5 rounded-4 mb-4 position-relative overflow-hidden">
        <Row className="align-items-center g-4">
          <Col lg={7}>
            <h1 className="display-5 fw-bold text-white mb-3">
              Trade Smarter. Learn Faster. Improve Continuously.
            </h1>
            <p className="lead text-white-50 mb-4">
              Practice with live quotes, monitor your portfolio, and learn from AI-powered insights designed to elevate your strategy.
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
          </Col>
          <Col lg={5}>
            <div className="glass-panel p-3 p-sm-4 rounded-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <div className="text-white-50 small">Portfolio Balance</div>
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
                <span>Progress Toward Goal</span>
                <span>68%</span>
              </div>
              <div className="d-flex gap-3 flex-wrap">
                <div className="home-chip">
                  <span className="text-white-50 small">Today's Profit</span>
                  <div className="fw-semibold text-white text-center">$2,059.03</div>
                </div>
                <div className="home-chip">
                  <span className="text-white-50 small">Open Positions</span>
                  <div className="fw-semibold text-white text-center">3 positions</div>
                </div>
                <div className="home-chip">
                  <span className="text-white-50 small">Crypto Balance</span>
                  <div className="fw-semibold text-white text-center">$9,959.93</div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </section>

      <section className="mb-4">
        <Row className="g-3">
          {skillCards.map((card) => (
            <Col md={4} key={card.title}>
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
            </Col>
          ))}
        </Row>
      </section>


      <MarketStrip />
    </Container>
  )
}
