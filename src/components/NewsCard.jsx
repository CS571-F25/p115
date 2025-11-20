

export default function NewsCard(props) {
  const published = props.datetime
    ? new Date(props.datetime * 1000).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : ''

  return (
    <div
      className="card h-100 border-0 text-bg-dark"
      style={{
        background:
          'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        boxShadow: '0 14px 28px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      {props.image ? (
        <img
          src={props.image}
          alt={props.headline}
          className="card-img-top"
          style={{ objectFit: 'cover', maxHeight: '180px' }}
        />
      ) : null}
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <span className="badge bg-info text-dark fw-semibold">
            {props.source || 'News'}
          </span>
          {published ? (
            <span className="text-white-50 small ms-2">{published}</span>
          ) : null}
        </div>
        <h5 className="card-title text-white mb-2">{props.headline}</h5>
        <p className="card-text text-white-50 small mb-3">
          {props.summary || 'No summary available.'}
        </p>
        <div className="mt-auto">
          {props.url ? (
            <a
              href={props.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-info btn-sm fw-semibold"
            >
              Read story ↗
            </a>
          ) : (
            <span className="text-white-50 small">No link available</span>
          )}
        </div>
      </div>
    </div>
  )
}
