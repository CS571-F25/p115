import { Link } from 'react-router-dom'

export default function Tutorial() {
  return (
    <div className="tutorial-page">
      <section className="tutorial-hero p-4 p-lg-5 rounded-4 mb-4 position-relative overflow-hidden">
        <div className="row g-4 align-items-center">
          <div className="col-lg-7">
            <div className="d-inline-flex align-items-center gap-2 mb-3 px-3 py-2 rounded-pill tutorial-pill">
            <span className="badge bg-info text-dark fw-semibold">Quick guide</span>
            <span className="text-white-50 small">Read this before your first trade</span>
          </div>
          <h1 className="display-5 fw-bold text-white mb-3">
            Learn the basics, then practice safely.
          </h1>
          <p className="lead text-white-50 mb-4">
            Jump to any ticker, paper-trade it, and log your P/L without risking cash. Keep risk tiny
            and review each session.
          </p>
            <div className="d-flex flex-wrap gap-3">
              <Link to="/stock/SPY" className="btn btn-info text-dark fw-semibold px-4 shadow">
                Open a sample ticker
              </Link>
              <Link
                to="/news"
                className="btn btn-outline-light fw-semibold px-4 border-2"
                style={{ borderColor: 'rgba(255,255,255,0.35)' }}
              >
                Check today&apos;s news
              </Link>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="glass-panel p-3 p-sm-4 rounded-4">
              <div className="fw-bold text-white mb-2">How this app works</div>
              <ol className="text-white-50 small ps-3 mb-0 d-flex flex-column gap-2">
                <li>Use the nav search to jump to a symbol (e.g., AAPL, SPY).</li>
                <li>Set entry, stop, and first target before clicking buy/sell.</li>
                <li>Track unrealized P/L; adjust size if the move is choppy.</li>
                <li>Write one takeaway per session and tighten your rules.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="row g-3 mb-4">
        <div className="col-lg-4 col-md-6">
          <div className="glass-panel rounded-4 p-4 h-100">
              <div className="fw-bold text-white mb-2">Trading basics</div>
              <ul className="text-white-50 small mb-0 d-flex flex-column gap-2 ps-3">
              <li>Risk 1-2% per idea; size to the stop.</li>
              <li>Have stop + first target before entry.</li>
              <li>Trend + volume + level: want 2 of 3.</li>
              <li>No chasing; wait for clean retests.</li>
              </ul>
            </div>
          </div>
        <div className="col-lg-4 col-md-6">
          <div className="glass-panel rounded-4 p-4 h-100">
            <div className="fw-bold text-white mb-2">Using this simulator</div>
            <ul className="text-white-50 small mb-0 d-flex flex-column gap-2 ps-3">
              <li>
                Search tickers via the navbar; the page swaps instantly.
              </li>
              <li>
                Use these bullets as your pre-trade checklist.
              </li>
              <li>
                Check news for catalysts before you enter.
              </li>
              <li>
                After a session, write one improvement.
              </li>
            </ul>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="glass-panel rounded-4 p-4 h-100">
            <div className="fw-bold text-white mb-2">Risk guardrails</div>
            <ul className="text-white-50 small mb-0 d-flex flex-column gap-2 ps-3">
              <li>Chop? Size down or sit out.</li>
              <li>No holding through earnings unless planned.</li>
              <li>1 loss: breathe. 2: cut size. 3: stop.</li>
              <li>Grade decisions, not dollars.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-4 p-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
          <div>
            <div className="text-white-50 text-uppercase small">Reference</div>
            <h5 className="text-white mb-0">Fast checklist before you trade</h5>
          </div>
          <span className="badge bg-success-subtle text-success-emphasis">Discipline first</span>
        </div>
        <div className="d-flex flex-column gap-2">
          {[
            'Entry, stop, first target: do they respect risk?',
            'Is volume backing the move or is it noise?',
            'Any earnings/headlines today on this ticker?',
            'With the trend, or a high-conviction fade?',
            'How will I grade setup, execution, emotions?'
          ].map((item) => (
            <div className="d-flex align-items-start gap-2" key={item}>
              <span className="badge bg-info text-dark rounded-pill">✓</span>
              <span className="text-white-50">{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
