import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Navbar as BsNavbar, Container, Nav, Form, InputGroup, Button } from 'react-bootstrap'

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/tutorial', label: 'Tutorial' },
  { to: '/news', label: 'Market News' },
]

export default function Navbar() {
  const [ticker, setTicker] = useState('')
  const [results, setResults] = useState([])
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)

  const handleSubmit = (event) => {
    event.preventDefault()
    const symbol = ticker.trim().toUpperCase()
    if (!symbol) return
    navigate(`/stock/${symbol}`)
    setTicker('')
    setResults([])
  }

  useEffect(() => {
    if (!ticker.trim()) {
      setResults([])
      return
    }
    const controller = new AbortController()
    fetch(`https://finnhublookup-q2lidtpoma-uc.a.run.app?q=${encodeURIComponent(ticker)}`, {
      signal: controller.signal
    })
      .then((res) => {
        if (res.status !== 200) {
          setResults([])
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data?.result) {
          setResults(data.result.slice(0, 6))
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setResults([])
      })

    return () => controller.abort()
  }, [ticker])

  const handleSelect = (symbol) => {
    navigate(`/stock/${symbol}`)
    setTicker('')
    setResults([])
  }

  const linkClasses = ({ isActive }) =>
    `px-2 fw-semibold ${isActive ? 'text-info' : 'text-light'}`

  return (
    <BsNavbar
      expand="lg"
      bg="dark"
      variant="dark"
      className="border-0 shadow-lg sticky-top"
      style={{
        backgroundImage:
          'linear-gradient(135deg, rgba(6,11,22,0.95), rgba(12,25,42,0.94))',
        boxShadow:
          '0 15px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(60,180,255,0.08)'
      }}
    >
      <Container>
        <BsNavbar.Brand
          as={NavLink}
          to="/"
          className="d-flex align-items-center gap-2 text-decoration-none"
        >
          <span
            className="rounded-circle text-dark fw-bold d-inline-flex align-items-center justify-content-center"
            style={{
              width: '44px',
              height: '44px',
              background:
                'linear-gradient(135deg, #36d7ff, #9b8cfd)',
              boxShadow: '0 15px 38px rgba(54,215,255,0.4)',
              border: '1px solid rgba(255,255,255,0.18)'
            }}
          >
            Σ
          </span>
          <span className="d-flex flex-column lh-1">
            <span className="fw-bold text-uppercase text-white">Stock Simulator</span>
            <small className="text-white-50 text-uppercase">Play the markets</small>
          </span>
        </BsNavbar.Brand>

        <BsNavbar.Toggle aria-controls="mainNav" />
        <BsNavbar.Collapse id="mainNav">
            <Nav className="me-auto mb-2 mb-lg-0">
            {navLinks.map(({ to, label, end }) => (
              <Nav.Link
                as={NavLink}
                end={end}
                to={to}
                key={to}
                className={linkClasses}
                style={{
                  position: 'relative',
                  fontSize: '1.05rem',
                  letterSpacing: '0.02em',
                  transition:
                    'color 0.25s ease, transform 0.2s ease, text-decoration-color 0.25s ease',
                  transform: hovered === to ? 'translateY(-1px)' : 'none',
                  textDecoration:
                    hovered === to ? 'underline solid 2px rgba(54,215,255,0.85)' : 'none',
                  textUnderlineOffset: '0.45em'
                }}
                onMouseEnter={() => setHovered(to)}
                onMouseLeave={() => setHovered(null)}
              >
                {label}
              </Nav.Link>
            ))}
          </Nav>

            <div
              className="position-relative ms-lg-4"
              style={{ flexGrow: 0, minWidth: '260px', maxWidth: '420px' }}
            >
              <Form
                className="d-flex align-items-center gap-2 flex-nowrap flex-wrap"
                onSubmit={handleSubmit}
              >
                <InputGroup size="sm" className="flex-nowrap">
                  <InputGroup.Text
                    className="text-white-50 border-0 rounded-start"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#d9e9ff'
                    }}
                  >
                    Ticker
                  </InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="e.g. AAPL"
                    aria-label="Jump to ticker"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className="bg-transparent text-light"
                    style={{
                      minWidth: '200px',
                      color: '#e9f4ff',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderLeft: 'none',
                      boxShadow: '0 0 0 1px rgba(54,215,255,0.12)',
                      '--bs-body-color': '#e9f4ff',
                      '--bs-secondary-color': 'rgba(233,244,255,0.72)',
                      '--bs-body-bg': 'transparent',
                      '--bs-border-color': 'rgba(255,255,255,0.18)',
                      '--bs-body-color-rgb': '233,244,255'
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 0 0 3px rgba(54,215,255,0.25)'
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.07)'
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = '0 0 0 1px rgba(54,215,255,0.12)'
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.04)'
                    }}
                  />
                </InputGroup>
                <Button
                  variant="info"
                  size="sm"
                  type="submit"
                  className="fw-semibold text-dark px-3"
                  style={{
                    boxShadow: '0 10px 34px rgba(54,215,255,0.45)',
                    border: 'none',
                    letterSpacing: '0.02em'
                  }}
                >
                  Go
                </Button>
              </Form>
              {results.length > 0 && (
                <div
                  className="p-2 rounded-3 position-absolute"
                  style={{
                    top: 'calc(100% + 8px)',
                    left: 0,
                    width: '100%',
                    maxWidth: 'min(360px, 100vw - 24px)',
                    background: 'rgba(12, 20, 35, 0.96)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 18px 40px rgba(0,0,0,0.55)',
                    zIndex: 1040,
                    maxHeight: '60vh',
                    overflowY: 'auto'
                  }}
                >
                  {results.map((item) => (
                    <button
                      key={`${item.symbol}-${item.displaySymbol}`}
                      className="w-100 text-start btn btn-sm btn-dark mb-2"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#e9f4ff'
                      }}
                      onClick={() => handleSelect(item.symbol || item.displaySymbol)}
                    >
                      <div className="fw-semibold">{item.displaySymbol || item.symbol}</div>
                      <div className="text-white-50 small text-truncate">
                        {item.description || item.symbol}
                      </div>
                      <div className="text-info small">{item.type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  )
}
