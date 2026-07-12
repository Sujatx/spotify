const NAV = [
  { id: 'home', icon: '⌂', label: 'Home' },
  { id: 'search', icon: '◎', label: 'Search' },
  { id: 'library', icon: '♫', label: 'Library' },
];

export function Sidebar({ view, onNav, open }) {
  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div className="sidebar-header">
        <span className="sidebar-logo"><span className="sidebar-version">v1.06</span></span>
      </div>
      <div className="nav-section">
        <div className="nav-label">NAVIGATE</div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={'nav-item' + (view === n.id ? ' active' : '')}
            onClick={() => onNav(n.id)}
          >
            <span className="nav-icon">{n.icon}</span> {n.label}
          </button>
        ))}
      </div>
      <div className="side-widget">
        <div className="widget-titlebar">
          <span>user_database.ini</span>
          <div className="dots"><span></span><span></span></div>
        </div>
        <div className="widget-body">
          <div>name: <span className="highlight">xX_user_Xx</span></div>
          <div>type: certified music enjoyer</div>
          <div>status: <span className="status-online">&#9679; online</span></div>
          <div>sharing: 0 songs</div>
        </div>
      </div>
      <div className="polaroid">
        <div className="tape" />
        <img src="https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/fc/6e/1e/fc6e1e95-7f93-09d8-455e-2f24a537a71f/603497823703.jpg/300x300bb.jpg" alt="now playing" />
        <div className="caption">me when the drop hits</div>
      </div>
      <div className="dni-stamp">
        <span className="dni-title">DNI</span>
        <span className="dni-sub">nickelback ppl</span>
      </div>
      <div className="sidebar-fill" />
      <div className="badge-row">
        <span className="mini-badge pink">BEST VIEWED IN IE6</span>
        <span className="mini-badge green">SHARPIE APPROVED</span>
        <span className="mini-badge blue">MYSPACE READY</span>
      </div>
    </aside>
  );
}
