import { useRef, useState } from 'react';
import './aero.css';
import TopBar from './TopBar.jsx';
import LeftNav from './LeftNav.jsx';
import RightPanel from './RightPanel.jsx';
import HomeView from './HomeView.jsx';
import SearchView from './SearchView.jsx';
import PlaylistView from './PlaylistView.jsx';
import LibraryView from './LibraryView.jsx';
import LyricsView from './LyricsView.jsx';
import PlayerBar from './PlayerBar.jsx';
import MixBuddy from './MixBuddy.jsx';
import PremiumModal from './PremiumModal.jsx';

export default function ThemeApp(){
  const [view, setView] = useState('home');
  const [openMixIndex, setOpenMixIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ msg: '', show: false });
  const toastTimer = useRef(null);

  function showToast(msg){
    setToast({ msg, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 1800);
  }

  function navigate(v){
    setView(v);
    if(v === 'playlist') setOpenMixIndex(null);
  }
  function openMix(i){
    setView('playlist');
    setOpenMixIndex(i);
  }

  return (
    <div className="theme-aero">
      <div className="aero-bubbles">
        <span></span><span></span><span></span><span></span><span></span>
      </div>

      <div className="app-shell">
        <TopBar onSearchFocus={() => navigate('search')} onPremium={() => setShowModal(true)} />

        <div className="app-grid-v2">
          <LeftNav view={view} onNavigate={navigate} onOpenMix={openMix} />

          <main className="main-glass">
            {view === 'home' && <HomeView onGoto={navigate} onToast={showToast} />}
            {view === 'search' && <SearchView />}
            {view === 'playlist' && (
              <PlaylistView
                openMixIndex={openMixIndex}
                onOpenMix={setOpenMixIndex}
                onCloseMix={() => setOpenMixIndex(null)}
              />
            )}
            {view === 'library' && <LibraryView />}
            {view === 'lyrics' && <LyricsView />}
          </main>

          <RightPanel />
        </div>
      </div>

      <PlayerBar onOpenLyrics={() => navigate('lyrics')} />
      <MixBuddy />
      <PremiumModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={() => { setShowModal(false); showToast("premium activated (not really, it's a prototype)"); }}
      />
      <div className={`toast ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
    </div>
  );
}
