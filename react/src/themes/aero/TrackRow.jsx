import { useLibrary } from '../../core/hooks';
import { fmtTime } from '../../core/fmt';
import { artStyle } from './artFallback';

export default function TrackRow({ tr, idx, playing, onPlay }){
  const { isLiked, toggleLike } = useLibrary();
  return (
    <div className={`lib-row-v2 ${playing ? 'active' : ''}`} onClick={onPlay}>
      <div className="num">{playing ? '' : idx + 1}</div>
      <div className="art" style={artStyle(tr)}></div>
      <div className="info">
        <div className="t">{tr.name}</div>
        <div className="s">{tr.artist}</div>
      </div>
      <div className="album">{tr.album}</div>
      <div className="time">{fmtTime(tr.ms / 1000)}</div>
      <button
        className={`like-btn ${isLiked(tr.id) ? 'liked' : ''}`}
        onClick={e => { e.stopPropagation(); toggleLike(tr); }}
      >♥</button>
    </div>
  );
}
