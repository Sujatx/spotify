import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../../core/hooks';
import { artStyle } from './artFallback';
import { fetchLyrics } from './lyrics';

export default function LyricsView(){
  const { current: tr } = usePlayer();
  const cacheRef = useRef({});            // track id -> lines[] | null (fetched, none found)
  const [, setFetchTick] = useState(0);   // re-render when a fetch lands

  const hasResult = tr && (tr.id in cacheRef.current);

  useEffect(() => {
    if(!tr || tr.id in cacheRef.current) return;
    let stale = false;
    fetchLyrics(tr).then(lines => {
      cacheRef.current[tr.id] = lines;
      if(!stale) setFetchTick(n => n + 1);
    });
    return () => { stale = true; };
  }, [tr && tr.id]);

  let status = '';
  let body;
  if(!tr){
    body = <div className="lyric-empty">♪ no song, no words ♪</div>;
  }else if(!hasResult){
    status = 'downloading LYRICS.TXT ...';
    body = (
      <>
        <div className="lyric-empty">⏳ buffering words over dial-up...</div>
        <div className="aero-well"><div className="aero-fill"></div></div>
      </>
    );
  }else{
    const lines = cacheRef.current[tr.id];
    if(lines){
      status = `LYRICS.TXT · ${lines.filter(l => l).length} lines · full-track words (previews are 30s clips)`;
      body = lines.map((l, i) => l
        ? <div key={i} className="lyric-line">{l}</div>
        : <div key={i} className="lyric-line gap"></div>);
    }else{
      status = 'LYRICS.TXT not found on any of the 4,708 libraries';
      body = <div className="lyric-empty">✖ no lyrics found for this one. hum along instead.</div>;
    }
  }

  return (
    <div className="view-v2">
      <div className="playlist-detail-hero-v2">
        <div className="lyrics-art-v2" style={tr ? artStyle(tr) : {}}></div>
        <div>
          <div className="playlist-meta-top-v2">LYRICS_SERVER.EXE / ONLINE</div>
          <h1>{tr ? tr.name : "nothing's playing"}</h1>
          <div className="playlist-sub-v2">
            {tr ? `${tr.artist} · ${tr.album}` : 'hit play on a track and its lyrics will show up here'}
          </div>
          <div className="search-status-v2">{status}</div>
        </div>
      </div>
      <div className="inset-panel">
        <div className="inset-panel-header"><span>LYRICS.TXT</span></div>
        <div className="lyrics-lines-v2">{body}</div>
      </div>
    </div>
  );
}
