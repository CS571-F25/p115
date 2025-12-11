

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
    <a
      href={props.url || '#'}
      target="_blank"
      rel="noreferrer"
      className="text-decoration-none"
      style={{ color: 'inherit' }}
    >
      <div
        className="d-flex align-items-center gap-3 rounded-4 p-3 h-100"
        style={{
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'transform 120ms ease, box-shadow 120ms ease'
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '14px',
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {props.image ? (
            <img
              src={props.image}
              alt={props.headline || `${props.source || 'News'} image`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span className="text-white-50 small fw-semibold">
              {props.source || 'News'}
            </span>
          )}
        </div>

        <div className="flex-grow-1">
          <h6 className="text-white mb-1">{props.headline}</h6>
          <div
            className="text-white-50 small"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
            title={props.summary}
          >
            {props.summary || 'No summary available.'}
          </div>
          <div className="text-white-50 small mt-1 d-flex align-items-center gap-2 flex-wrap">
            <span className="fw-semibold text-info">{props.source || 'News'}</span>
            {published ? <span>• {published}</span> : null}
          </div>
        </div>
      </div>
    </a>
  )
}
