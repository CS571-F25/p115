import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import './Navbar.css'

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/tutorial', label: 'Tutorial' },
  { to: '/news', label: 'Market News' },
]

export default function Navbar() {
  const [ticker, setTicker] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
    const symbol = ticker.trim().toUpperCase()
    if (!symbol) return
    navigate(`/stock/${symbol}`)
    setTicker('')
  }

  const linkClasses = ({ isActive }) =>
    `nav-link ${isActive ? 'active-link' : 'idle-link'}`

  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-glass sticky-top">
      <div className="container">
        <NavLink className="navbar-brand d-flex align-items-center gap-2" to="/">
          <span className="brand-icon rounded-2 d-inline-flex align-items-center justify-content-center">
            Σ
          </span>
          <span className="d-flex flex-column lh-1">
            <span className="brand-title">SimExchange</span>
            <small className="brand-subtitle text-uppercase">
              Stock Lab
            </small>
          </span>
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {navLinks.map(({ to, label, end }) => (
              <li className="nav-item" key={to}>
                <NavLink end={end} to={to} className={linkClasses}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <form
            className="d-flex ticker-form align-items-stretch gap-2"
            role="search"
            onSubmit={handleSubmit}
          >
            <div className="input-group input-group-sm">
              <span className="input-group-text">Ticker</span>
              <input
                className="form-control"
                type="search"
                placeholder="e.g. AAPL"
                aria-label="Jump to ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
              />
            </div>
            <button className="btn btn-sm btn-accent" type="submit">
              Go
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
