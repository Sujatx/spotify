import { Link } from 'react-router-dom';
import { useSearch } from '../../core/hooks';

export default function TopBar({ onSearchFocus, onPremium }){
  const { query, search } = useSearch();

  return (
    <div className="topbar-v2">
      <div className="topbar-brand">
        <img src="/disco-ball.png" alt="Aero" />
        <span>Spotify™ 2006 beta</span>
      </div>
      <Link className="nav-arrow" to="/" title="back to theme select">◀</Link>
      <button className="nav-arrow" title="forward" disabled>▶</button>
      <div className="topbar-search">
        <div className="topbar-search-pill">
          <span>🔍</span>
          <input
            type="text"
            placeholder="What do you want to play?"
            value={query}
            onChange={e => search(e.target.value)}
            onFocus={onSearchFocus}
          />
        </div>
      </div>
      <button className="btn-upgrade-v2" onClick={onPremium}>✦ Upgrade</button>
      <button className="bell-btn" title="notifications">🔔</button>
      <button className="user-chip">
        <img src="/disco-ball.png" alt="" />
        xX_ParthG_Xx ▾
      </button>
      <div className="win-controls">
        <button className="win-btn min">—</button>
        <button className="win-btn max">▢</button>
        <button className="win-btn close">✕</button>
      </div>
    </div>
  );
}
