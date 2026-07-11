import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Landing from './landing/Landing';
import ChromeTheme from './themes/chrome';
import AeroTheme from './themes/aero';
import ScrapbookTheme from './themes/scrapbook';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chrome" element={<ChromeTheme />} />
        <Route path="/aero" element={<AeroTheme />} />
        <Route path="/scrapbook" element={<ScrapbookTheme />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}

export default App;
