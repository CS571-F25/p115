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
              Learn the basics, then practice them safely.
            </h1>
            <p className="lead text-white-50 mb-4">
              This simulator lets you search tickers, place paper trades, and track simulated P/L.
              Keep risk small, review each trade, and build habits before using real cash.
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
                <li>Use the navbar ticker box to jump to any symbol (e.g., AAPL, SPY).</li>
                <li>Review price, news, and basics; decide your entry, stop, and target.</li>
                <li>Place a simulated buy/sell and watch unrealized P/L update without risk.</li>
                <li>Log why you entered; after the move, grade the trade and adjust your rules.</li>
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
              <li>Risk 1-2% of your account per idea; size positions to honor that.</li>
              <li>Always set an invalidation (stop) and a first target before entry.</li>
              <li>Trend + volume + level: look for two of three before acting.</li>
              <li>Don&apos;t chase. If you missed it, let it go or wait for a retest.</li>
            </ul>
          </div>
        </div>
        <div className="col-lg-4 col-md-6">
          <div className="glass-panel rounded-4 p-4 h-100">
            <div className="fw-bold text-white mb-2">Using this simulator</div>
            <ul className="text-white-50 small mb-0 d-flex flex-column gap-2 ps-3">
              <li>
                Search tickers via the navbar input; the page swaps to that symbol instantly.
              </li>
              <li>
                Use tutorial notes as a checklist; keep entries/disciplines consistent session to
                session.
              </li>
              <li>
                Explore news to see catalysts and sentiment that could move your ticker.
              </li>
              <li>
                Finish each session by reviewing P/L and writing one improvement for next time.
              </li>
            </ul>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="glass-panel rounded-4 p-4 h-100">
            <div className="fw-bold text-white mb-2">Risk guardrails</div>
            <ul className="text-white-50 small mb-0 d-flex flex-column gap-2 ps-3">
              <li>Size down in choppy conditions; wait for clean structure.</li>
              <li>Don&apos;t hold through earnings/news unless it was the plan.</li>
              <li>One loss in a row? Breathe. Two? Cut size. Three? Take a break.</li>
              <li>Process over P/L: grade yourself on decisions, not dollars.</li>
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
            'What is my entry, stop, and first target? Do they respect my risk cap?',
            'Is volume supporting this move, or am I trading noise?',
            'Did I check for earnings, headlines, or events on this ticker today?',
            'Am I trading with the trend, or do I have a high-probability reason to fade it?',
            'How will I grade this trade afterward (good setup, execution, emotions)?'
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
