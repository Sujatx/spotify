import { usePlayer, useLibrary } from '../../core/hooks';
import TrackRow from './TrackRow.jsx';

export default function LibraryView(){
  const { likes } = useLibrary();
  const { current, isPlaying, play } = usePlayer();

  return (
    <div className="view-v2">
      <div className="library-header-v2">
        <h1 className="page-title-v2">Your Library ❀</h1>
        <span className="page-subtext-v2">liked songs, exactly where u left them</span>
      </div>
      <div className="inset-panel">
        <div className="inset-panel-header">
          <span>LIBRARY_CORE.EXE</span>
          <span>{likes.length} songs</span>
        </div>
        {likes.length
          ? likes.map((tr, i) => (
              <TrackRow
                key={tr.id}
                tr={tr}
                idx={i}
                playing={current && current.id === tr.id && isPlaying}
                onPlay={() => play(likes, i)}
              />
            ))
          : <div style={{ color: 'rgba(255,255,255,.7)', padding: '14px 10px' }}>nothing liked yet — hit ♥ on a track.</div>}
      </div>
    </div>
  );
}
