import { useEffect, useState } from 'react';
import { usePlayer, useLibrary } from '../../core/hooks';
import { fmtTime } from '../../core/fmt';
import { loadTermSet } from '../../core/curated';
import { CHART_2006, STAFF_PICKS } from '../../core/data';
import { artStyle } from './artFallback';

function JumpCard({ tr, onPlay }){
  return (
    <div className="jump-card" onClick={onPlay}>
      <div className="art" style={artStyle(tr)}>{tr.art ? '' : <span>{tr.name}</span>}</div>
      <div className="t">{tr.name}</div>
      <div className="s">{tr.artist}</div>
    </div>
  );
}

function formatPlays(n){ return n.toLocaleString('en-US'); }

export default function HomeView({ onGoto, onToast }){
  const { current, isPlaying, toggle, play } = usePlayer();
  const { recent, collectLibrary } = useLibrary();
  const [chartFallback, setChartFallback] = useState([]);
  const [staffFallback, setStaffFallback] = useState([]);

  useEffect(() => {
    if(!recent.length) loadTermSet('aero_home_chart', CHART_2006).then(setChartFallback);
  }, [recent.length]);
  useEffect(() => {
    if(!collectLibrary().length) loadTermSet('aero_home_staff', STAFF_PICKS).then(setStaffFallback);
  }, [recent.length]);

  const h = new Date().getHours();
  const greeting = h < 12 ? 'good morning' : h < 18 ? 'good afternoon' : 'good evening';

  const jump = (recent.length ? recent : chartFallback).slice(0, 6);
  const madeFor = (collectLibrary().length ? collectLibrary() : staffFallback).slice(0, 5);

  return (
    <>
      <div className="hero-v2">
        <img src="/disco-ball.png" alt="disco ball" />
        <div>
          <div className="hero-label">HOME</div>
          <h2>{greeting}, xX_ParthG_Xx <span>:3</span></h2>
          <p>welcome back to Spotify™ (yes, THE Spotify) · previews at a blistering 128kbps · rawr~</p>
        </div>
      </div>

      <div className="play-row-v2">
        <button
          className="btn-play-big"
          onClick={() => (current ? toggle() : jump.length && play(jump, 0))}
        >{isPlaying ? '⏸' : '▶'}</button>
        <button className="btn-glass-round" title="add" onClick={() => onToast('＋ added to your library')}>＋</button>
        <button className="btn-glass-round" title="download" onClick={() => onToast("bestie it's a preview, there's nothing to download")}>⤓</button>
        <button className="btn-glass-round" title="more">···</button>
        <span className="play-row-caption">{jump.length} songs · your library · 128kbps forever</span>
      </div>

      <section className="section-v2">
        <div className="section-v2-header">
          <h3>❀ jump back in</h3>
          <a href="#" onClick={e => { e.preventDefault(); onGoto('library'); }}>show all</a>
        </div>
        <div className="jump-grid">
          {jump.map((tr, i) => <JumpCard key={tr.id} tr={tr} onPlay={() => play(jump, i)} />)}
        </div>
      </section>

      <section className="section-v2">
        <div className="section-v2-header">
          <h3>✧ made for you, probably</h3>
        </div>
        <div className="rank-table">
          <div className="rank-row-head">
            <span>#</span><span>TITLE</span><span>PLAYS</span><span>⏱</span>
          </div>
          {madeFor.map((tr, i) => {
            const nowPlaying = current && current.id === tr.id;
            return (
              <div
                key={tr.id}
                className={`rank-row ${nowPlaying ? 'now-playing' : ''}`}
                onClick={() => play(madeFor, i)}
              >
                <div className="num">{nowPlaying ? (isPlaying ? '▮▶' : '▶') : i + 1}</div>
                <div className="info">
                  <div className="art" style={artStyle(tr)}></div>
                  <div>
                    <div className="t">{tr.name}</div>
                    <div className="s">{tr.artist}</div>
                  </div>
                </div>
                <div className="plays">{formatPlays(21734620 - i * 3200000)}{nowPlaying ? ' ✔' : ''}</div>
                <div className="dur">{fmtTime(tr.ms / 1000)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
