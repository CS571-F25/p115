import { useEffect, useState } from 'react';

import NewsCard from '../components/NewsCard';

export default function News (props) {

    // const finnhubKey = import.meta.env.VITE_FINNHUB_API_KEY
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        loadNews();
    }, []);
    

    function loadNews() {
        fetch(`https://finnhubnews-q2lidtpoma-uc.a.run.app`)
        .then(res => {
            return res.json();
        })
        .then(data => {
            setNews(data);
            console.log("successfully fetched news")
            setLoading(false);
        })
        .catch(err => {
            console.log("error fetching news")
            setLoading(false);
        })
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

        <div className="row g-3">
          {news.map((item) => (
            <div className="col-md-4" key={item.id || item.url}>
              <NewsCard {...item}></NewsCard>
            </div>
          ))}
        </div>
      </div>
    )
}
