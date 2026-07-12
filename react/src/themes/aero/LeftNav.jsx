import { useLibrary } from '../../core/hooks';

const NAV_ITEMS = [
  { view: 'home', icon: '🏠', label: 'Home' },
  { view: 'search', icon: '🔍', label: 'Search' },
  { view: 'library', icon: '💿', label: 'Your Library' },
  { view: 'lyrics', icon: '🎤', label: 'Lyrics' },
];

const MIX_GRADIENTS = [
  'linear-gradient(135deg, #7B9FF5, #B45CFF)',
  'linear-gradient(135deg, #FFD23F, #B85C00)',
  'linear-gradient(135deg, #4ADEDE, #0E4E5C)',
  'linear-gradient(135deg, #FF6B4A, #7A1E0E)',
];

export default function LeftNav({ view, onNavigate, onOpenMix }){
  const { mixes, burnMix } = useLibrary();

  return (
    <aside className="left-nav-v2">
      <div className="nav-glass">
        {NAV_ITEMS.map(n => (
          <button
            key={n.view}
            className={view === n.view ? 'active' : ''}
            onClick={() => onNavigate(n.view)}
          >
            <span>{n.icon}</span> {n.label}
          </button>
        ))}
      </div>

      <div className="playlists-glass">
        <div className="playlists-glass-header">
          <span>Mix CDs</span>
          <button className="playlists-add" onClick={() => burnMix('Untitled Mix ' + (mixes.length + 1), [])}>＋ ›</button>
        </div>
        {mixes.map((m, i) => (
          <button key={i} className="plist-row-v2" onClick={() => onOpenMix(i)}>
            <div className="plist-icon-v2" style={{ background: MIX_GRADIENTS[i % MIX_GRADIENTS.length] }}>🎵</div>
            <div className="meta">
              <div className="t">{m.name}</div>
              <div className="s">{m.tracks.length} songs</div>
            </div>
          </button>
        ))}
        <button className="btn-new-mix-v2" onClick={() => burnMix('Untitled Mix ' + (mixes.length + 1), [])}>+ new mix</button>
      </div>
    </aside>
  );
}
