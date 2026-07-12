import { useEffect, useState } from 'react';
import { usePlayer, useSearch } from '../../core/hooks';
import { loadTermSet } from '../../core/curated';
import { TRACKS, FEATURED } from './data';

function CoverCard({ track, list, index, ranked }) {
  const { current, play } = usePlayer();
  const playing = current && current.id === track.id;
  return (
    <button
      className={'cover-card' + (playing ? ' playing' : '')}
      onClick={() => play(list, index)}
    >
      {ranked && <span className="rank">#{index + 1}</span>}
      <img src={track.art} alt="" loading="lazy" />
      <div className="c-name">{track.name}</div>
      <div className="c-artist">{track.artist}</div>
    </button>
  );
}

function CoverGrid({ tracks, ranked, className = 'cover-grid' }) {
  if (!tracks.length) return <div className="queue-empty">nothing here yet...</div>;
  return (
    <div className={className}>
      {tracks.map((t, i) => (
        <CoverCard key={t.id + '-' + i} track={t} list={tracks} index={i} ranked={ranked} />
      ))}
    </div>
  );
}

/* ---------------- home ---------------- */

export function Home() {
  const { play } = usePlayer();
  const [lib, setLib] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadTermSet('scrapbook_lib', TRACKS.map((t) => t.search), 1)
      .then((r) => { if (!cancelled) setLib(r); })
      .catch(() => { if (!cancelled) setLib([]); });
    return () => { cancelled = true; };
  }, []);

  const chart = lib ? lib.slice(0, 10) : null;
  const newRel = lib ? lib.slice(10, 16) : null;
  const gems = lib ? lib.slice(0, 6) : null;
  const featured = lib ? FEATURED.trackIndexes.map((i) => lib[i]).filter(Boolean) : null;

  return (
    <div className="view-content">
      <div className="marquee-strip">
        <span>&#9835; every song on earth, streaming to your computer. yes, legally. we checked twice &#183; burn mix cds &#183; tune the radio &#183; dj_sp1n is watching the decks &#9835;</span>
      </div>
      <div className="sec">
        <div className="sec-head"><h3>TOP OF THE CHARTS <span className="zap">'06</span></h3><span className="sec-note">what everyone's playing</span></div>
        {chart === null ? <div className="queue-empty">loading...</div> : <CoverGrid tracks={chart} ranked />}
      </div>
      <div className="sec">
        <div className="sec-head"><h3>NEW RELEASES</h3><span className="sec-note">fresh off the press</span></div>
        {newRel === null ? <div className="queue-empty">loading...</div> : <CoverGrid tracks={newRel} />}
      </div>
      <div className="sec">
        <div className="sec-head"><h3>HIDDEN GEMS</h3><span className="sec-note">don't tell everyone</span></div>
        {gems === null ? <div className="queue-empty">loading...</div> : <CoverGrid tracks={gems} />}
      </div>
      <div className="sec">
        <div className="sec-head"><h3>FEATURED ARTIST</h3><span className="sec-note">on rotation at hq</span></div>
        {featured === null ? <div className="queue-empty">loading...</div> : featured.length > 0 && (
          <div className="featured">
            <img src={featured[0].art} alt={FEATURED.artistName} />
            <div className="f-body">
              <div className="f-name">{FEATURED.artistName}</div>
              <div className="f-note">{FEATURED.note}</div>
              <div className="f-tracks">
                {featured.map((t, i) => (
                  <button className="f-track" key={t.id} onClick={() => play(featured, i)}>
                    <span className="f-no">{String(i + 1).padStart(2, '0')}</span>{t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- search ---------------- */

export function Search() {
  const { query, results, search } = useSearch();
  const [term, setTerm] = useState(query || '');
  const [searched, setSearched] = useState(false);

  function doSearch() {
    const q = term.trim();
    if (!q) return;
    setSearched(true);
    search(q);
  }

  return (
    <div className="view-content">
      <div className="sec-head"><h3>◎ SEARCH THE VAULT</h3><span className="sec-note">find your jams</span></div>
      <div className="search-box">
        <input
          type="text"
          placeholder="artist, song or album..."
          spellCheck={false}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
        />
        <button onClick={doSearch}>SEARCH &raquo;</button>
      </div>
      {!searched ? (
        <div className="queue-empty">type something and hit search...</div>
      ) : (
        <CoverGrid tracks={results} className="search-results" />
      )}
    </div>
  );
}

/* ---------------- library ---------------- */

export function Library() {
  const [lib, setLib] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadTermSet('scrapbook_lib', TRACKS.map((t) => t.search), 1)
      .then((r) => { if (!cancelled) setLib(r); })
      .catch(() => { if (!cancelled) setLib([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="view-content">
      <div className="sec-head"><h3>♫ ALL SONGS</h3><span className="sec-note">the full vault</span></div>
      {lib === null ? <div className="queue-empty">loading...</div> : <CoverGrid tracks={lib} ranked />}
    </div>
  );
}
