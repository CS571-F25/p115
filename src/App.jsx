import './App.css'
import { HashRouter, Routes, Route } from "react-router-dom";
import Home from './components/Home';
import Tutorial from './components/Tutorial';
import Stock from './components/Stock';
import News from './components/News';

function App() {

  return  <HashRouter>
    <Routes>
      <Route path="/" element={<Home/>}></Route>
      <Route path="/tutorial" element={<Tutorial/>}></Route>
      <Route path="/stock/:ticker" element={<Stock/>}></Route>
      <Route path="/news" element={<News/>}></Route>
    </Routes>
  </HashRouter>
}

export default App
