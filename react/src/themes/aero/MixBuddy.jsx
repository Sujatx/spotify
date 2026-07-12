import { useEffect, useRef, useState } from 'react';
import { useDJ, usePlayer, useLibrary } from '../../core/hooks';

const QUICK = [
  ['gym', '🏋️ gym'], ['road', '🚗 road trip'], ['late', '🌙 late night'],
  ['party', '🎉 party'], ['chill', '😌 chill'],
];

function FeedEntry({ entry }){
  return (
    <div className="bmsg bot">
      {entry.lines.map((l, i) => <span key={i}>{l}<br /></span>)}
      {entry.actions && (
        <div className="bmsg-tracks">
          {entry.actions.map((a, i) => (
            <button key={i} className="bmsg-track-btn" onClick={a.fn}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatMsg({ msg }){
  const { play } = usePlayer();
  const { burnMix } = useLibrary();
  const [burned, setBurned] = useState(false);
  return (
    <div className={`bmsg ${msg.who === 'me' ? 'me' : 'bot'}`}>
      {msg.lines.map((l, i) => <span key={i}>{l}<br /></span>)}
      {msg.tracks && (
        <div className="bmsg-tracks">
          {msg.tracks.slice(0, 4).map((t, i) => (
            <button key={i} className="bmsg-track-btn" onClick={() => play(msg.tracks, i)}>♪ {t.name} — {t.artist}</button>
          ))}
          <button
            className="bmsg-track-btn" disabled={burned}
            onClick={() => { burnMix(msg.mixName, msg.tracks); setBurned(true); }}
          >{burned ? '✓ burned to CD' : '● burn to CD'}</button>
        </div>
      )}
    </div>
  );
}

export default function MixBuddy(){
  const { feed, status, chatLog, busy, sendChat, quickMix, buildMix } = useDJ();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const feedRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => { if(feedRef.current) feedRef.current.scrollTop = 999999; }, [feed, open]);
  useEffect(() => { if(logRef.current) logRef.current.scrollTop = 999999; }, [chatLog, open, chatOpen]);

  function send(){
    const val = input.trim();
    if(!val) return;
    setInput('');
    sendChat(val);
  }

  return (
    <>
      <button className="buddy-toggle" title="Talk to DJ_Sp1n" onClick={() => setOpen(o => !o)}>💬</button>
      <div className={`buddy-window ${open ? 'show' : ''}`}>
        <div className="buddy-head">
          <span>guestbook_chat.exe — DJ_Sp1n</span>
          <button onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="buddy-status">
          {status}
          <button className="buddy-switch" onClick={() => setChatOpen(o => !o)}>
            {chatOpen ? '« back to console' : 'talk to dj »'}
          </button>
        </div>

        {!chatOpen && (
          <>
            <div className="buddy-quick">
              {QUICK.map(([key, label]) => (
                <button key={key} disabled={busy} onClick={() => quickMix(key)}>{label}</button>
              ))}
              <button disabled={busy} onClick={buildMix}>⚡ build from today</button>
            </div>
            <div className="buddy-msgs" ref={feedRef}>
              {feed.length
                ? feed.map(e => <FeedEntry key={e.id} entry={e} />)
                : <div className="bmsg bot">still booting up...</div>}
            </div>
          </>
        )}

        {chatOpen && (
          <div className="buddy-msgs" ref={logRef}>
            {chatLog.map(m => <ChatMsg key={m.id} msg={m} />)}
          </div>
        )}

        <div className="buddy-input">
          <input
            type="text" placeholder="throw me a mood..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setChatOpen(true)}
            onKeyDown={e => { if(e.key === 'Enter') send(); }}
          />
          <button onClick={() => { setChatOpen(true); send(); }}>send</button>
        </div>
      </div>
    </>
  );
}
