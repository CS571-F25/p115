import './App.css'
import { HashRouter, Routes, Route } from "react-router-dom";
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Tutorial from './pages/Tutorial';
import Stock from './pages/Stock';
import News from './pages/News';
import Trends from './pages/Trends';
import Chat from './pages/Chat';

function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <Navbar />
        <main className="main-panel container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route path="/stock/:ticker" element={<Stock />} />
            <Route path="/news" element={<News />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default App
