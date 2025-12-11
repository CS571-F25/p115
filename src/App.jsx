import './App.css'
import { HashRouter, Routes, Route } from "react-router-dom";
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Tutorial from './pages/Tutorial';
import Stock from './pages/Stock';
import News from './pages/News';
import Chat from './pages/Chat';
import Crypto from './pages/Crypto';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

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
            <Route path="/chat" element={<Chat />} />
            <Route path="/crypto" element={<Crypto />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default App
