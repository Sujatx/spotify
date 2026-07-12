import { usePlayer, useLibrary } from '../../core/hooks';
import { fmtTime } from '../../core/fmt';
import { artStyle } from './artFallback';

export default function PlayerBar({ onOpenLyrics }){
  const {
    current, isPlaying, currentTime, duration, shuffle, repeat, volume,
    toggle, next, prev, seek, setVolume, toggleShuffle, toggleRepeat,
  } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();

  function onSeekClick(e){
    if(!current || !isFinite(duration)) return;
    const el = e.currentTarget;
    const pct = (e.clientX - el.getBoundingClientRect().left) / el.offsetWidth;
    seek(duration * pct);
  }

  return (
    <div className="playerbar-v2">
      <div className="pb-left-v2">
        <div className="thumb" style={current ? artStyle(current) : {}}></div>
        <div className="meta" onClick={onOpenLyrics}>
          <div className="t">{current ? current.name : "nothing's playing"}</div>
          <div className="s">{current ? current.artist : 'select a track to begin'}</div>
        </div>
        <button
          className={`like-btn ${current && isLiked(current.id) ? 'liked' : ''}`}
          onClick={() => current && toggleLike(current)}
        >✔</button>
      </div>

      <div className="pb-center-v2">
        <div className="transport-v2">
          <button
            className={`tbtn-v2 ${shuffle ? 'active' : ''}`} title="shuffle"
            onClick={toggleShuffle}
          >🔀</button>
          <button className="tbtn-v2" onClick={prev}>⏮</button>
          <button className="tbtn-play-v2" onClick={toggle}>{isPlaying ? '⏸' : '▶'}</button>
          <button className="tbtn-v2" onClick={() => next(true)}>⏭</button>
          <button
            className={`tbtn-v2 ${repeat ? 'active' : ''}`} title="repeat"
            onClick={toggleRepeat}
          >🔁</button>
        </div>
        <div className="progress-row-v2">
          <span className="time">{fmtTime(currentTime)}</span>
          <div className="progress-track" onClick={onSeekClick}>
            <div className="progress-fill" style={{ width: (isFinite(duration) && duration ? currentTime / duration * 100 : 0) + '%' }}></div>
          </div>
          <span className="time">{fmtTime(duration)}</span>
        </div>
      </div>

      <div className="pb-right-v2">
        <span className="pb-icon-v2" title="cast">🖥</span>
        <span className="vol-icon">{volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔈'}</span>
        <div className="vol-track">
          <div className="vol-fill" style={{ width: (volume * 100) + '%' }}></div>
          <input
            type="range" min="0" max="100" value={Math.round(volume * 100)}
            onChange={e => setVolume(+e.target.value / 100)}
          />
        </div>
        <span className="pb-icon-v2" title="fullscreen">⛶</span>
      </div>
    </div>
  );
}
