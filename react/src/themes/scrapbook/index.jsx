import { useState } from 'react';
import { useStatusBar } from '../../core/hooks';
import { LoadingScreen } from './LoadingScreen';
import { HeaderBar } from './HeaderBar';
import { IpodBar } from './IpodBar';
import { Sidebar } from './Sidebar';
import { QueuePanel } from './QueuePanel';
import { Home, Search, Library } from './views';
import './scrapbook.css';

export default function ThemeApp() {
  const [view, setView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const { message } = useStatusBar();

  function nav(v) {
    setView(v);
    setSidebarOpen(false);
  }

  return (
    <div className="theme-scrapbook">
      <LoadingScreen />
      <div className="noise" />

      <HeaderBar />
      <IpodBar />

      <button className="mobile-toggle-sidebar" onClick={() => { setSidebarOpen((o) => !o); setQueueOpen(false); }}>MENU &#9776;</button>
      <button className="mobile-toggle-queue" onClick={() => { setQueueOpen((o) => !o); setSidebarOpen(false); }}>QUEUE &#9835;</button>

      <Sidebar view={view} onNav={nav} open={sidebarOpen} />
      <main className="main">
        {view === 'home' && <Home />}
        {view === 'search' && <Search />}
        {view === 'library' && <Library />}
      </main>
      <QueuePanel open={queueOpen} />

      <div className="statusbar">
        <span>&copy; 2006 SPOTIFY AB &middot; database: 24,019,331 songs &middot; build 0.91 beta</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
