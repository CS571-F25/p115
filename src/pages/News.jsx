import { useEffect, useState } from 'react';

import NewsCard from '../components/NewsCard';

export default function News (props) {

    // const finnhubKey = import.meta.env.VITE_FINNHUB_API_KEY
    const [finnhubNews, setFinnhubNews] = useState([]);
    const [redditPosts, setRedditPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadNews();
    }, []);
    

    async function loadNews() {
      setLoading(true);
      setError(null);

      try {
        const [finnhubResult, redditResult] = await Promise.allSettled([
          fetch('https://finnhubnews-q2lidtpoma-uc.a.run.app'),
          fetch('https://reddittopposts-q2lidtpoma-uc.a.run.app')
        ]);

        if (finnhubResult.status === 'fulfilled') {
          const data = await finnhubResult.value.json();
          setFinnhubNews(Array.isArray(data) ? data : []);
          console.log('successfully fetched finnhub news');
        } else {
          setFinnhubNews([]);
          console.log('error fetching finnhub news');
        }

        if (redditResult.status === 'fulfilled') {
          const redditJson = await redditResult.value.json();
          const posts = redditJson?.data?.children || [];
          const formattedPosts = posts.map(({ data }) => {
            const body = (data.selftext || '').trim();
            const previewUrl =
              data.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') ||
              null;
            const thumbnail =
              data.thumbnail && data.thumbnail.startsWith('http')
                ? data.thumbnail
                : null;

            return {
              id: data.id,
              headline: data.title,
              summary: body
                ? `${body.slice(0, 200)}${body.length > 200 ? '...' : ''}`
                : 'Top discussion thread from r/stocks.',
              url: `https://www.reddit.com${data.permalink}`,
              image: thumbnail || previewUrl,
              source: 'Reddit • r/stocks',
              datetime: data.created_utc
            };
          });
          setRedditPosts(formattedPosts);
          console.log('successfully fetched reddit posts');
        } else {
          setRedditPosts([]);
          console.log('error fetching reddit posts');
        }
      } catch (err) {
        setError('Unable to load feeds right now.');
        console.log('error fetching news', err);
      } finally {
        setLoading(false);
      }
    }


    return (
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <div className="text-white-50 text-uppercase small">Market radar</div>
            <h2 className="text-white mb-0">Latest headlines</h2>
          </div>
        </div>

        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div
              className="spinner-border text-info"
              role="status"
              style={{ width: '4rem', height: '4rem' }}
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="text-white-50 mt-3">Loading headlines...</div>
          </div>
        ) : null}

        {error ? (
          <div className="alert alert-warning text-dark" role="alert">
            {error}
          </div>
        ) : null}

        <div className="row g-4">
          <div className="col-lg-6">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="text-white mb-0">Finnhub headlines</h5>
              <span className="text-white-50 small">{finnhubNews.length} stories</span>
            </div>
            <div className="row g-3">
              {finnhubNews.map((item) => (
                <div className="col-6" key={item.id || item.url}>
                  <NewsCard {...item}></NewsCard>
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="text-white mb-0">Reddit /r/stocks top posts</h5>
              <span className="text-white-50 small">{redditPosts.length} threads</span>
            </div>
            <div className="row g-3">
              {redditPosts.map((item) => (
                <div className="col-12" key={item.id || item.url}>
                  <NewsCard {...item}></NewsCard>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
}
