import { usePlayer, useLibrary } from '../../core/hooks';
import TrackRow from './TrackRow.jsx';

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #7B9FF5, #B45CFF)',
  'linear-gradient(135deg, #FFD23F, #B85C00)',
  'linear-gradient(135deg, #4ADEDE, #0E4E5C)',
  'linear-gradient(135deg, #FF6B4A, #7A1E0E)',
];

function MixCard({ m, i, onOpen }){
  return (
    <div className="jump-card jump-card--fixed" onClick={onOpen}>
      <div className="art" style={{ background: COVER_GRADIENTS[i % COVER_GRADIENTS.length] }}><span>{m.name}</span></div>
      <div className="t">{m.name}</div><div className="s">{m.tracks.length} songs</div>
    </div>
  );
}

export default function PlaylistView({ openMixIndex, onOpenMix, onCloseMix }){
  const { mixes } = useLibrary();
  const { current, isPlaying, play } = usePlayer();
  const open = openMixIndex != null ? mixes[openMixIndex] : null;

  if(!open){
    return (
      <div className="view-v2">
        <div>
          <h1 className="page-title-v2">Mix CDs</h1>
          <p className="page-subtext-v2">Everything you've burned to a CD.</p>
        </div>
        <div className="row-scroll-v2">
          {mixes.length
            ? mixes.map((m, i) => <MixCard key={i} m={m} i={i} onOpen={() => onOpenMix(i)} />)
            : <div style={{ color: 'rgba(255,255,255,.7)' }}>No mixes burned yet — try DJ_Sp1n's quick mixes.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="view-v2">
      <div className="playlist-detail-hero-v2">
        <div className="playlist-icon-v2">💽</div>
        <div>
          <div className="playlist-meta-top-v2">MIX CD № {openMixIndex + 1} / BY XX_PARTHG_XX</div>
          <h1>{open.name}</h1>
          <div className="playlist-sub-v2">{open.tracks.length} songs</div>
          <button
            className="btn-play-all-v2"
            onClick={() => open.tracks.length && play(open.tracks, 0)}
          >▶ play all</button>
        </div>
      </div>
      <div className="inset-panel">
        <div className="inset-panel-header">
          <span>{open.tracks.length} records found</span>
          <a href="#" onClick={e => { e.preventDefault(); onCloseMix(); }}>back to all</a>
        </div>
        {open.tracks.map((tr, i) => (
          <TrackRow
            key={tr.id}
            tr={tr}
            idx={i}
            playing={current && current.id === tr.id && isPlaying}
            onPlay={() => play(open.tracks, i)}
          />
        ))}
      </div>
    </div>
  );
}
