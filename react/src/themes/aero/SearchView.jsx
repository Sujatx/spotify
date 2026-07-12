import { usePlayer, useSearch } from '../../core/hooks';
import TrackRow from './TrackRow.jsx';

export default function SearchView(){
  const { query, results, search } = useSearch();
  const { current, isPlaying, play } = usePlayer();

  return (
    <div className="view-v2">
      <div>
        <label className="search-label-v2">ARTIST OR TRACK</label>
        <input
          type="text"
          className="search-input-v2"
          placeholder="e.g. gnarls barkley"
          value={query}
          onChange={e => search(e.target.value)}
        />
        <div className="search-status-v2">
          {query ? `${results.length} result${results.length === 1 ? '' : 's'} for "${query}"` : "Type something. We'll search the entire iTunes catalog for it."}
        </div>
      </div>
      <div className="inset-panel">
        <div className="inset-panel-header"><span>CATALOG_SEARCH.EXE / ONLINE</span></div>
        {results.length
          ? results.map((tr, i) => (
              <TrackRow
                key={tr.id}
                tr={tr}
                idx={i}
                playing={current && current.id === tr.id && isPlaying}
                onPlay={() => play(results, i)}
              />
            ))
          : <div style={{ color: 'rgba(255,255,255,.7)', padding: '14px 10px' }}>0 results. Try checking your line speed.</div>}
      </div>
    </div>
  );
}
