import { useEffect, useState } from 'react';
import { TYPING_PHRASES } from './data';

function PixelBounce() {
  const letters = 'SPOTIFY'.split('');
  return (
    <div className="pixel-bounce">
      {letters.map((ch, i) => (
        <span className="letter" key={i} data-char={ch}>{ch}</span>
      ))}
      <span className="space-dot" />
      <span className="ver">'06</span>
    </div>
  );
}

function TypingText() {
  const [text, setText] = useState('');

  useEffect(() => {
    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let speed = 80;
    let timer;

    function tick() {
      const current = TYPING_PHRASES[phraseIdx];
      if (!isDeleting) {
        setText(current.substring(0, charIdx + 1));
        charIdx++;
        if (charIdx === current.length) {
          isDeleting = true;
          speed = 2000;
        } else {
          speed = 60 + Math.random() * 60;
        }
      } else {
        if (speed === 2000) {
          speed = 35;
          timer = setTimeout(tick, speed);
          return;
        }
        setText(current.substring(0, charIdx - 1));
        charIdx--;
        if (charIdx === 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % TYPING_PHRASES.length;
          speed = 400;
        } else {
          speed = 25 + Math.random() * 25;
        }
      }
      timer = setTimeout(tick, speed);
    }

    timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="typing-wrap">
      <span className="typing-text">{text}</span><span className="typing-cursor" />
    </div>
  );
}

export function HeaderBar() {
  return (
    <div className="hdr">
      <PixelBounce />
      <TypingText />
    </div>
  );
}
