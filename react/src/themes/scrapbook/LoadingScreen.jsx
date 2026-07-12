import { useEffect, useRef, useState } from 'react';
import { LOADING_PHRASES } from './data';

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState('Initializing system...');
  const [timerText, setTimerText] = useState('Estimated time remaining: Calculating...');
  const [fadeOut, setFadeOut] = useState(false);
  const [done, setDone] = useState(false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    const totalTime = Math.floor(Math.random() * (4900 - 3100 + 1)) + 3100;
    setTimerText(`Estimated time: ${(totalTime / 1000).toFixed(1)}s (56kbps)`);

    const tick = 100;
    const iv = setInterval(() => {
      elapsedRef.current += tick;
      const elapsed = elapsedRef.current;
      setProgress(Math.min((elapsed / totalTime) * 100, 100));

      if (elapsed % 800 === 0) {
        setLog(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
      }

      if (elapsed >= totalTime) {
        clearInterval(iv);
        setLog('DONE! UNLOCKING VAULT...');
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => setDone(true), 500);
        }, 400);
      }
    }, tick);

    return () => clearInterval(iv);
  }, []);

  if (done) return null;

  return (
    <div className={'loading-overlay' + (fadeOut ? ' fade-out' : '')}>
      <div className="noise-overlay" />
      <div className="disco-grid-bg" />

      <div className="loading-header">
        <div className="loading-warning">
          <span className="loading-hazard" aria-hidden="true" />
          WARNING: MAXIMUM POP DETECTED // 2006 TUNES LIVE
          <span className="loading-hazard" aria-hidden="true" />
        </div>
        <div>
          <div className="loading-wordmark">SPOTIFY</div>
          <div className="loading-version">VERSION 1.06</div>
        </div>
        <div className="loading-tagline">"THE MUSIC FILES ARE UNLOCKED."</div>
      </div>

      <main className="loading-window">
        <div className="window-titlebar">
          <span>CONNECTING_56K_MODEM.EXE</span>
          <div className="window-dots"><span className="dot"></span><span className="dot"></span></div>
        </div>
        <div className="window-body">
          <div className="progress-container">
            <div className="progress-bar" style={{ width: progress + '%' }} />
          </div>
          <div className="status-box">
            <div className="static-status">STATUS: LOADING MAX CLUTTER...</div>
            <div className="dynamic-log">{log}</div>
          </div>
        </div>
        <div className="window-footer">
          <span>{timerText}</span>
        </div>
      </main>
    </div>
  );
}
