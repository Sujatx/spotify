import { usePlayer } from '../../core/hooks';
import { fmtTime } from '../../core/fmt';
import { artStyle } from './artFallback';

export default function RightPanel(){
  const { current, isPlaying, currentTime, duration, toggle, next, prev, seek } = usePlayer();

  function onSeekClick(e){
    if(!current || !isFinite(duration)) return;
    const el = e.currentTarget;
    const pct = (e.clientX - el.getBoundingClientRect().left) / el.offsetWidth;
    seek(duration * pct);
  }

  return (
    <aside className="right-panel-v2">
      <div className="user-card-v2">
        <div>name: <b>xX_ParthG_Xx</b></div>
        <div>type: certified music enjoyer</div>
        <div>status: <span className="status-online-v2 blink-dot">● online</span></div>
        <div>sharing: 0 songs · 379 online</div>
      </div>

      <div className="spod-widget">
        <div className="spod-label">sPod™ 2006</div>
        <div className="spod-now-playing">
          <div className="spod-np-header">
            <span>▶ NOW PLAYING</span>
            <span>{isPlaying ? '▮▶' : '▮▮'}</span>
          </div>
          <div className="spod-np-track">
            <div className="spod-np-art" style={current ? artStyle(current) : {}}></div>
            <div className="spod-np-meta">
              <div className="t">{current ? current.name : "nothing's playing"}</div>
              <div className="s">{current ? current.artist : 'select a track'}</div>
            </div>
          </div>
          <div className="spod-np-progress">
            <span>{fmtTime(currentTime)}</span>
            <div className="spod-np-track-bar" onClick={onSeekClick}>
              <div className="spod-np-fill" style={{ width: (isFinite(duration) && duration ? currentTime / duration * 100 : 0) + '%' }}></div>
            </div>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        <div className="click-wheel">
          <button className="cw-menu">MENU</button>
          <button className="cw-prev" onClick={prev}>⏮</button>
          <button className="cw-next" onClick={() => next(true)}>⏭</button>
          <span className="cw-playpause-label">⏯</span>
          <button className="cw-center" onClick={toggle}>{isPlaying ? '⏸' : '▶'}</button>
        </div>
        <div className="spod-caption">holds 4 songs · battery: vibes</div>
      </div>

      <div className="polaroid-sticker">
        <div className="tape"></div>
        <div className="photo">me_when_music.jpg</div>
        <div className="caption">me when the drop hits</div>
      </div>
    </aside>
  );
}
