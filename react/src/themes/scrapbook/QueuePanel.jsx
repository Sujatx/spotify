import { usePlayer, useQueue } from '../../core/hooks';

const BLANK_ART = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23FDF6EE'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='40'%3E%26%239835%3B%3C/text%3E%3C/svg%3E";

export function QueuePanel({ open }) {
  const { current } = usePlayer();
  const { queue, idx, jump, remove } = useQueue();

  return (
    <aside className={'queue-panel' + (open ? ' open' : '')}>
      <div className="queue-header">
        <h3>&#9835; UP NEXT</h3>
        <span className="q-count">{queue.length} track{queue.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="now-playing-widget">
        <div className="npw-titlebar">NOW_PLAYING.EXE</div>
        <div className="npw-body">
          <img className="npw-art" src={current?.art || BLANK_ART} alt="" />
          <div className="npw-track">{current ? current.name : "nothing's playing"}</div>
          <div className="npw-artist">{current ? current.artist : 'select a track to begin'}</div>
        </div>
      </div>
      <div className="queue-list">
        {queue.length === 0 ? (
          <div className="queue-empty">queue is empty...<br />click a track to add it!<br /><br />&#9733; protip: the queue is your friend &#9733;</div>
        ) : (
          queue.map((track, i) => (
            <button
              key={track.id + '-' + i}
              className={'queue-item' + (i === idx ? ' active' : '')}
              onClick={() => jump(i)}
            >
              <img src={track.art} alt="" loading="lazy" />
              <div className="qi-info">
                <span className="qi-name">{i === idx ? '♫ ' : ''}{track.name}</span>
                <span className="qi-artist">{track.artist}</span>
              </div>
              <span
                className="qi-remove"
                onClick={(e) => { e.stopPropagation(); remove(i); }}
              >&#10005;</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
