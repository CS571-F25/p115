import { useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

import NewsCard from '../components/NewsCard'
import MarketStrip from '../components/MarketStrip'


export default function News() {
  const [finnhubNews, setFinnhubNews] = useState([])
  const [redditPosts, setRedditPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newsPage, setNewsPage] = useState(0)
  const headlinesPerPage = 12


  useEffect(() => {
    loadNews()
  }, [])

  async function loadNews() {
    setLoading(true)
    setError(null)

    try {
      const [finnhubResult, redditResult] = await Promise.allSettled([
        fetch('https://finnhubnews-q2lidtpoma-uc.a.run.app'),
        fetch('https://reddittopposts-q2lidtpoma-uc.a.run.app')
      ])

      if (finnhubResult.status === 'fulfilled') {
        const data = await finnhubResult.value.json()
        setFinnhubNews(Array.isArray(data) ? data : [])
      } else {
        setFinnhubNews([])
      }

      if (redditResult.status === 'fulfilled') {
        const redditJson = await redditResult.value.json()
        const posts = redditJson?.data?.children || []
        const formattedPosts = posts.map(({ data }) => {
          const body = (data.selftext || '').trim()
          const previewUrl =
            data.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') || null
          const thumbnail =
            data.thumbnail && data.thumbnail.startsWith('http') ? data.thumbnail : null

          return {
            id: data.id,
            headline: data.title,
            summary: body
              ? `${body.slice(0, 180)}${body.length > 180 ? '...' : ''}`
              : 'Top discussion thread from r/stocks.',
            url: `https://www.reddit.com${data.permalink}`,
            image: thumbnail || previewUrl,
            source: 'Reddit • r/stocks',
            datetime: data.created_utc
          }
        })
        setRedditPosts(formattedPosts)
      } else {
        setRedditPosts([])
      }
    } catch (err) {
      setError('Unable to load feeds right now.')
      console.log('error fetching news', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container pb-4">
      <header className="mb-3">
        <h1 className="text-white mb-1 h3">Market news and community pulse</h1>
        <p className="text-white-50 mb-0">Curated headlines and discussions for your next move.</p>
      </header>

      <MarketStrip/>

      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <div
            className="spinner-border text-info"
            role="status"
            style={{ width: '4rem', height: '4rem' }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="text-white-50 mt-3">Updating feeds...</div>
        </div>
      ) : null}

      {error ? (
        <div className="alert alert-warning text-dark" role="alert">
          {error}
        </div>
      ) : null}

      <div className="row g-4">
        <div className="col-lg-12">
          <div
            className="d-flex align-items-center justify-content-between mb-3"
            style={{ gap: '0.5rem' }}
          >
            <div>
              <div className="text-white-50 text-uppercase small">Signal Feed</div>
              <h2 className="text-white mb-0 h4">Current Headlines</h2>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-info btn-sm text-info fw-semibold"
                onClick={() => setNewsPage((p) => Math.max(0, p - 1))}
                disabled={newsPage === 0}
                aria-label="Previous headlines"
              >
                <FiChevronLeft />
              </button>
              <button
                type="button"
                className="btn btn-outline-info btn-sm text-info fw-semibold"
                onClick={() =>
                  setNewsPage((p) => {
                    const maxPage = Math.max(0, Math.ceil(finnhubNews.length / headlinesPerPage) - 1)
                    return Math.min(maxPage, p + 1)
                  })
                }
                disabled={newsPage >= Math.max(0, Math.ceil(finnhubNews.length / headlinesPerPage) - 1)}
                aria-label="Next headlines"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
          <div className="row g-3">
            {finnhubNews
              .slice(newsPage * headlinesPerPage, newsPage * headlinesPerPage + headlinesPerPage)
              .map((item) => (
              <div className="col-6" key={item.id || item.url}>
                <NewsCard {...item}></NewsCard>
              </div>
            ))}
          </div>
        </div>

        {/* <div className="col-lg-7">
          <div
            className="d-flex align-items-center justify-content-between mb-3"
            style={{ gap: '0.5rem' }}
          >
            <div>
              <div className="text-white-50 text-uppercase small">Community radar</div>
              <h2 className="text-white mb-0 h4">Reddit /r/stocks</h2>
            </div>
            <span className="badge bg-info text-dark">{redditPosts.length} threads</span>
          </div>
          <div className="row g-3">
            {redditPosts.slice(0, 9).map((item) => (
              <div className="col-12" key={item.id || item.url}>
                <NewsCard {...item}></NewsCard>
              </div>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  )
}
