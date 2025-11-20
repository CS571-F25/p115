import { useEffect, useState } from 'react';

import NewsCard from '../components/NewsCard';

export default function News (props) {

    const finnhubKey = import.meta.env.VITE_FINNHUB_API_KEY
    const [news, setNews] = useState([]);


    useEffect(() => {
        loadNews();
    }, []);
    

    function loadNews() {
        fetch(`https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`)
        .then(res => {
            return res.json();
        })
        .then(data => {
            setNews(data);
            console.log("successfully fetched news")
        })
        .catch(err => {
            console.log("error fetching news")
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

        <div className="row g-3">
          {news.map((item) => (
            <div className="col-md-6" key={item.id || item.url}>
              <NewsCard {...item}></NewsCard>
            </div>
          ))}
        </div>
      </div>
    )
}
