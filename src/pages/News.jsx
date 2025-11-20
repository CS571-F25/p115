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


    return <div>
        {
            news.map(news => 
                <NewsCard {...news}></NewsCard>
            )
        }
    </div>
}
