import { useEffect, useRef } from 'react';
import { usePlayer } from '../../core/hooks';
import { fmtTime } from '../../core/fmt';

const VIZ_BARS = 20;

function Viz({ isPlaying }) {
  const ref = useRef(null);

  useEffect(() => {
    const bars = ref.current?.children;
    if (!bars) return;
    if (!isPlaying) {
      for (const b of bars) { b.style.height = '8%'; b.style.background = 'var(--slime)'; }
      return;
    }
    const id = setInterval(() => {
      for (const b of bars) {
        const h = Math.random() * 80 + 10;
        b.style.height = h + '%';
        b.style.background = h > 60 ? 'linear-gradient(180deg,#39FF14,#FF007F)' : 'linear-gradient(180deg,#39FF14,#1a8a0a)';
      }
    }, 120);
    return () => clearInterval(id);
  }, [isPlaying]);

  return (
    <div className="ipod-viz" ref={ref}>
      {Array.from({ length: VIZ_BARS }).map((_, i) => <i key={i} />)}
    </div>
  );
}

export function IpodBar() {
  const {
    current, isPlaying, currentTime, duration, shuffle, repeat,
    toggle, next, prev, seek, toggleShuffle, toggleRepeat,
  } = usePlayer();

  const status = !current ? 'READY' : isPlaying ? 'PLAYING' : 'PAUSED';

  function handleSeekClick(e) {
    if (!current || !isFinite(duration) || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    seek(p * duration);
  }

  return (
    <div className="ipod-bar">
      <div className="ipod">
        <div className="ipod-screen">
          <div className="ipod-screen-header">
            <span>SPOTIFY '06</span>
            <span>{status}</span>
          </div>
          <div className="ipod-now-playing">
            {current ? (
              <>{current.name}<span className="artist">{current.artist}</span></>
            ) : (
              <>no track selected<span className="artist">click a song to play</span></>
            )}
          </div>
          <div className="ipod-progress">
            <span>{current ? fmtTime(currentTime) : '0:00'}</span>
            <div className="ipod-progress-track" onClick={handleSeekClick}>
              <div className="ipod-progress-fill" style={{ width: (isFinite(duration) && duration ? (currentTime / duration) * 100 : 0) + '%' }} />
            </div>
            <span>{current && isFinite(duration) ? fmtTime(duration) : '0:30'}</span>
          </div>
          <Viz isPlaying={isPlaying} />
        </div>
        <div className="ipod-wheel">
          <button className={'wheel-btn wheel-shuffle' + (shuffle ? ' active' : '')} title="Shuffle" onClick={toggleShuffle}>SHFL</button>
          <button className="wheel-btn wheel-prev" title="Previous" onClick={prev}>&#9668;&#9668;</button>
          <button className="wheel-center" title="Play/Pause" onClick={toggle}>{isPlaying ? '▮▮' : '▶'}</button>
          <button className="wheel-btn wheel-next" title="Next" onClick={() => next(true)}>&#9658;&#9658;</button>
          <button className={'wheel-btn wheel-menu' + (repeat ? ' active' : '')} title="Repeat" onClick={toggleRepeat}>{repeat ? 'RPT ON' : 'RPT'}</button>
        </div>
      </div>
    </div>
  );
}
