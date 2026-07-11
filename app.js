/* ============================================================
   SPOTIFY 2006 — app logic
   data: iTunes Search API via JSONP (the authentic 2006 technique)
   audio: 30-second previews via <audio>
   storage: localStorage ("Mix CDs", recent plays, hit counter)
   ============================================================ */

'use strict';

/* ---------------- state ---------------- */

const state = {
  queue: [],        // current play queue (array of tracks)
  idx: -1,          // index in queue
  shuffle: false,
  searchResults: [],
  lastQuery: '',
  view: 'home',
  chart: [],        // cached home chart
};

const audio = document.getElementById('audio');
const $ = (sel) => document.querySelector(sel);

/* ---------------- iTunes API (JSONP) ---------------- */

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = 'itunes_cb_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const timer = setTimeout(() => fail(new Error('timeout')), 10000);
    function cleanup() {
      clearTimeout(timer);
      delete window[cb];
      script.remove();
    }
    function fail(err) { cleanup(); reject(err); }
    window[cb] = (data) => { cleanup(); resolve(data); };
    script.onerror = () => fail(new Error('network error'));
    script.src = url + '&callback=' + cb;
    document.head.appendChild(script);
  });
}

function normalizeTrack(r) {
  return {
    id: r.trackId,
    name: r.trackName,
    artist: r.artistName,
    album: r.collectionName || '',
    art: (r.artworkUrl100 || '').replace('100x100', '300x300'),
    preview: r.previewUrl,
    ms: r.trackTimeMillis || 30000,
  };
}

async function searchTracks(term, limit = 25) {
  const url = 'https://itunes.apple.com/search?media=music&entity=song'
    + '&limit=' + limit + '&term=' + encodeURIComponent(term);
  const data = await jsonp(url);
  return (data.results || []).filter(r => r.previewUrl).map(normalizeTrack);
}

/* ---------------- storage ---------------- */

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
};

const getMixes = () => store.get('sp06_mixes', []);
const saveMixes = (m) => { store.set('sp06_mixes', m); renderSideMixes(); };

/* ---------------- formatting ---------------- */

function fmtTime(sec) {
  if (!isFinite(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function setStatus(msg) { $('#statusMsg').textContent = msg; }

/* ---------------- player ---------------- */

function playQueue(tracks, startIdx) {
  state.queue = tracks.slice();
  state.idx = startIdx;
  playCurrent();
}

function playCurrent() {
  const t = state.queue[state.idx];
  if (!t) return;
  audio.src = t.preview;
  audio.play().catch(() => setStatus('click PLAY to start audio.'));
  updateLcd(t);
  addRecent(t);
  buddyOnPlay(t);
  renderView(); // refresh playing-row highlight
}

function updateLcd(t) {
  const text = '♫ ' + t.name + ' — ' + t.artist + ' ';
  const el = $('#lcdText');
  // duplicate text so the scroll loop is seamless
  el.textContent = text + '··· ' + text + '··· ';
  $('.lcd-track').classList.add('scrolling');
  const art = $('#playerArt');
  if (t.art) { art.src = t.art; art.hidden = false; } else { art.hidden = true; }
  setStatus('now playing: ' + t.name);
}

function next(manual = false) {
  if (!state.queue.length) return;
  if (manual) buddyOnSkip();
  if (state.shuffle && state.queue.length > 1) {
    let n;
    do { n = Math.floor(Math.random() * state.queue.length); } while (n === state.idx);
    state.idx = n;
  } else {
    state.idx = (state.idx + 1) % state.queue.length;
  }
  playCurrent();
}

function prev() {
  if (!state.queue.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  state.idx = (state.idx - 1 + state.queue.length) % state.queue.length;
  playCurrent();
}

audio.addEventListener('ended', () => next(false));
audio.addEventListener('play', () => { $('#playBtn').innerHTML = '&#10073;&#10073;'; });
audio.addEventListener('pause', () => { $('#playBtn').innerHTML = '&#9654;'; });
audio.addEventListener('timeupdate', () => {
  $('#lcdTime').textContent = fmtTime(audio.currentTime) + ' / ' + fmtTime(audio.duration);
  if (isFinite(audio.duration) && !seekDragging) {
    $('#seek').value = (audio.currentTime / audio.duration) * 100;
  }
});

$('#playBtn').addEventListener('click', () => {
  if (!audio.src) {
    // nothing queued yet: play the home chart
    if (state.chart.length) playQueue(state.chart, 0);
    return;
  }
  audio.paused ? audio.play() : audio.pause();
});
$('#nextBtn').addEventListener('click', () => next(true));
$('#prevBtn').addEventListener('click', prev);
$('#shuffleBtn').addEventListener('click', (e) => {
  state.shuffle = !state.shuffle;
  e.currentTarget.classList.toggle('on', state.shuffle);
  setStatus('shuffle ' + (state.shuffle ? 'ON — chaos mode' : 'off'));
});

let seekDragging = false;
const seekEl = $('#seek');
seekEl.addEventListener('input', () => { seekDragging = true; });
seekEl.addEventListener('change', () => {
  if (isFinite(audio.duration)) {
    audio.currentTime = (seekEl.value / 100) * audio.duration;
  }
  seekDragging = false;
});

$('#volume').addEventListener('input', (e) => { audio.volume = e.target.value; });
audio.volume = 0.8;

/* ---- visualizer (decorative — era-authentic fakery) ---- */

const viz = $('#viz');
const VIZ_BARS = 28;
const vizHeights = new Array(VIZ_BARS).fill(8);
for (let i = 0; i < VIZ_BARS; i++) viz.appendChild(document.createElement('i'));

setInterval(() => {
  const bars = viz.children;
  for (let i = 0; i < VIZ_BARS; i++) {
    const target = audio.paused || !audio.src
      ? 8
      : 15 + Math.random() * 85 * (0.5 + 0.5 * Math.sin(i / 3 + Date.now() / 300));
    vizHeights[i] += (target - vizHeights[i]) * 0.45;
    bars[i].style.height = Math.max(8, vizHeights[i]) + '%';
  }
}, 100);

/* ---------------- recent plays + hit counter ---------------- */

function addRecent(t) {
  let recent = store.get('sp06_recent', []);
  recent = [t, ...recent.filter(r => r.id !== t.id)].slice(0, 10);
  store.set('sp06_recent', recent);
}

(function hitCounter() {
  const hits = store.get('sp06_hits', 4211) + 1;
  store.set('sp06_hits', hits);
  $('#hitCounter').textContent = String(hits).padStart(6, '0');
})();

/* ---------------- views ---------------- */

const view = $('#view');

function nav(name) {
  state.view = name;
  document.querySelectorAll('.side-link').forEach(b =>
    b.classList.toggle('active', b.dataset.nav === name));
  renderView();
}

document.querySelectorAll('.side-link').forEach(b =>
  b.addEventListener('click', () => nav(b.dataset.nav)));

function renderView() {
  if (state.view === 'home') renderHome();
  else if (state.view === 'search') renderSearch();
  else if (state.view === 'mixcds') renderMixCds();
  else if (state.view.startsWith('mix:')) renderMixDetail(state.view.slice(4));
}

/* ---- shared: track table ---- */

function trackTable(tracks, opts = {}) {
  const cur = state.queue[state.idx];
  const rows = tracks.map((t, i) => `
    <tr class="${cur && cur.id === t.id ? 'playing' : ''}" data-i="${i}">
      <td class="t-art"><img src="${esc(t.art)}" alt="" loading="lazy"></td>
      <td class="t-name">${esc(t.name)}</td>
      <td class="t-artist">${esc(t.artist)}</td>
      <td class="t-album">${esc(t.album)}</td>
      <td class="t-time">${fmtTime(t.ms / 1000)}</td>
      <td class="t-actions">
        <button class="btn-row" data-act="play" data-i="${i}">&#9654; PLAY</button>
        ${opts.removable
          ? `<button class="btn-row pink" data-act="remove" data-i="${i}" title="Remove">&times;</button>`
          : `<button class="btn-row pink" data-act="add" data-i="${i}" title="Add to a Mix CD">+ CD</button>`}
      </td>
    </tr>`).join('');
  return `
    <table class="track-table">
      <thead><tr>
        <th></th><th>SONG</th><th>ARTIST</th><th>ALBUM</th>
        <th style="text-align:right">TIME</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function bindTableActions(container, tracks, opts = {}) {
  container.querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = Number(btn.dataset.i);
      const act = btn.dataset.act;
      if (act === 'play') playQueue(tracks, i);
      else if (act === 'add') promptAddToMix(tracks[i]);
      else if (act === 'remove' && opts.onRemove) opts.onRemove(i);
    });
  });
}

/* ---- home ---- */

const CHART_2006 = [
  { term: 'Gnarls Barkley Crazy' },
  { term: 'Nelly Furtado Promiscuous' },
  { term: 'Rihanna SOS' },
  { term: 'Shakira Hips Don\'t Lie' },
  { term: 'Justin Timberlake SexyBack' },
  { term: 'The Killers When You Were Young' },
  { term: 'Red Hot Chili Peppers Dani California' },
  { term: 'Beyonce Irreplaceable' },
  { term: 'Panic At The Disco I Write Sins Not Tragedies' },
  { term: 'The Fray How to Save a Life' },
];

async function loadChart() {
  if (state.chart.length) return state.chart;
  const results = await Promise.all(
    CHART_2006.map(c => searchTracks(c.term, 1).catch(() => []))
  );
  state.chart = results.flat();
  return state.chart;
}

function renderHome() {
  const recent = store.get('sp06_recent', []);
  view.innerHTML = `
    <h2>WELCOME TO <span class="zap">SPOTIFY</span></h2>
    <p class="view-sub">every song on earth, streaming to your computer. yes, legally. we checked twice.</p>
    <div class="marquee-strip"><span>&#9835; HOT RIGHT NOW: the top 10 tracks of 2006 &middot; burn them to a Mix CD &middot; IM DJ_Sp1n for custom mixes &middot; tell your friends on MySpace &#9835;</span></div>
    <h2 style="font-size:15px">TOP OF THE CHARTS <span class="zap">'06</span></h2>
    <div class="chart-grid" id="chartGrid"><div class="loading">dialing up the charts</div></div>
    ${recent.length ? `
      <h2 style="font-size:15px;margin-top:24px">RECENTLY PLAYED</h2>
      <div id="recentTable"></div>` : ''}
  `;

  if (recent.length) {
    const rt = $('#recentTable');
    rt.innerHTML = trackTable(recent);
    bindTableActions(rt, recent);
  }

  loadChart().then(chart => {
    if (state.view !== 'home') return;
    const grid = $('#chartGrid');
    if (!grid) return;
    if (!chart.length) {
      grid.innerHTML = '<div class="empty-note">the charts are unreachable — check your dial-up connection.</div>';
      return;
    }
    grid.innerHTML = chart.map((t, i) => `
      <button class="chart-card" data-i="${i}">
        <span class="chart-rank">#${i + 1}</span>
        <img src="${esc(t.art)}" alt="">
        <div class="c-name">${esc(t.name)}</div>
        <div class="c-artist">${esc(t.artist)}</div>
      </button>`).join('');
    grid.querySelectorAll('.chart-card').forEach(card =>
      card.addEventListener('click', () => playQueue(chart, Number(card.dataset.i))));
  }).catch(() => {
    const grid = $('#chartGrid');
    if (grid) grid.innerHTML = '<div class="empty-note">could not reach the charts. is someone on the phone?</div>';
  });
}

/* ---- search ---- */

$('#searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if (!q) return;
  state.lastQuery = q;
  nav('search');
  if (/\bparty\b/i.test(q)) say(['say less.']);
  setStatus('searching for "' + q + '"...');
  try {
    state.searchResults = await searchTracks(q);
    setStatus(state.searchResults.length + ' results.');
  } catch {
    state.searchResults = [];
    setStatus('search failed — modem trouble?');
  }
  if (state.view === 'search') renderSearch();
});

function renderSearch() {
  if (!state.lastQuery) {
    view.innerHTML = `
      <h2>SEARCH</h2>
      <p class="view-sub">type something in the FIND MUSIC box up top. anything. we dare you.</p>
      <div class="empty-note">[ no search yet ]</div>`;
    return;
  }
  view.innerHTML = `
    <h2>RESULTS FOR <span class="zap">"${esc(state.lastQuery.toUpperCase())}"</span></h2>
    <p class="view-sub">${state.searchResults.length} tracks found &middot; 30-second previews &middot; click PLAY</p>
    <div id="resultsTable">${state.searchResults.length ? '' : '<div class="loading">searching</div>'}</div>`;
  if (state.searchResults.length) {
    const rt = $('#resultsTable');
    rt.innerHTML = trackTable(state.searchResults);
    bindTableActions(rt, state.searchResults);
  }
}

/* ---- mix cds ---- */

function renderSideMixes() {
  const mixes = getMixes();
  const el = $('#sideMixList');
  el.innerHTML = mixes.length
    ? mixes.map((m, i) => `
        <button class="side-mix" data-i="${i}">
          <span class="cd">&#9678;</span><span>${esc(m.name)}</span>
        </button>`).join('')
    : '<div class="side-empty">no mix cds yet... burn one!</div>';
  el.querySelectorAll('.side-mix').forEach(b =>
    b.addEventListener('click', () => { state.view = 'mix:' + b.dataset.i; renderView(); }));
}

function renderMixCds() {
  const mixes = getMixes();
  view.innerHTML = `
    <h2>MY <span class="zap">MIX CDs</span></h2>
    <p class="view-sub">like burning CDs for your friends, minus the 45 minutes and the coaster-shaped failures.</p>
    ${mixes.length ? '<div class="mix-grid" id="mixGrid"></div>'
      : '<div class="empty-note">[ no mix cds yet — hit "+ BURN" in the sidebar ]</div>'}`;
  if (!mixes.length) return;
  $('#mixGrid').innerHTML = mixes.map((m, i) => `
    <div class="mix-card">
      <div class="cd-disc"></div>
      <div class="mix-name">${esc(m.name)}</div>
      <div class="mix-count">${m.tracks.length} track${m.tracks.length === 1 ? '' : 's'}</div>
      <div class="mix-btns">
        <button class="btn-row" data-act="open" data-i="${i}">OPEN</button>
        <button class="btn-row" data-act="playmix" data-i="${i}">&#9654; PLAY</button>
        <button class="btn-row pink" data-act="trash" data-i="${i}">&times;</button>
      </div>
    </div>`).join('');
  $('#mixGrid').querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i);
      const act = btn.dataset.act;
      if (act === 'open') { state.view = 'mix:' + i; renderView(); }
      else if (act === 'playmix' && mixes[i].tracks.length) playQueue(mixes[i].tracks, 0);
      else if (act === 'trash') {
        if (confirm('Snap "' + mixes[i].name + '" in half? (this deletes it)')) {
          const m = getMixes(); m.splice(i, 1); saveMixes(m); renderMixCds();
        }
      }
    });
  });
}

function renderMixDetail(iStr) {
  const i = Number(iStr);
  const mixes = getMixes();
  const mix = mixes[i];
  if (!mix) { nav('mixcds'); return; }
  view.innerHTML = `
    <h2><span class="zap">&#9678;</span> ${esc(mix.name.toUpperCase())}</h2>
    <p class="view-sub">${mix.tracks.length} tracks &middot; a certified banger compilation &middot;
      <button class="btn-row" id="playAllBtn">&#9654; PLAY ALL</button>
      <button class="btn-row" id="backBtn">&laquo; ALL CDs</button></p>
    <div id="mixTable">${mix.tracks.length ? '' : '<div class="empty-note">[ empty CD — add songs via "+ CD" on any track ]</div>'}</div>`;
  $('#backBtn').addEventListener('click', () => nav('mixcds'));
  $('#playAllBtn').addEventListener('click', () => { if (mix.tracks.length) playQueue(mix.tracks, 0); });
  if (mix.tracks.length) {
    const mt = $('#mixTable');
    mt.innerHTML = trackTable(mix.tracks, { removable: true });
    bindTableActions(mt, mix.tracks, {
      removable: true,
      onRemove: (ti) => {
        const m = getMixes();
        m[i].tracks.splice(ti, 1);
        saveMixes(m);
        renderMixDetail(String(i));
      },
    });
  }
}

/* ---- burn dialog + add-to-mix ---- */

let pendingTrack = null;   // track waiting to be added after burning a new CD

$('#newMixBtn').addEventListener('click', () => openBurnDialog(null));
$('#burnCancel').addEventListener('click', closeBurnDialog);
$('#burnConfirm').addEventListener('click', confirmBurn);
$('#mixName').addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmBurn(); });

function openBurnDialog(track) {
  pendingTrack = track;
  $('#mixName').value = '';
  $('#burnDialog').hidden = false;
  $('#mixName').focus();
}
function closeBurnDialog() { $('#burnDialog').hidden = true; pendingTrack = null; }

function confirmBurn() {
  const name = $('#mixName').value.trim() || 'untitled mix ' + (getMixes().length + 1);
  const mixes = getMixes();
  mixes.push({ name, tracks: pendingTrack ? [pendingTrack] : [] });
  saveMixes(mixes);
  setStatus('burned "' + name + '"' + (pendingTrack ? ' with 1 track.' : '.'));
  closeBurnDialog();
  if (state.view === 'mixcds') renderMixCds();
}

function promptAddToMix(track) {
  const mixes = getMixes();
  if (!mixes.length) { openBurnDialog(track); return; }
  const names = mixes.map((m, i) => (i + 1) + '. ' + m.name).join('\n');
  const pick = prompt('Add "' + track.name + '" to which Mix CD?\n\n' + names + '\n\n(type a number, or 0 to burn a new CD)');
  if (pick === null) return;
  const n = Number(pick);
  if (n === 0) { openBurnDialog(track); return; }
  const mix = mixes[n - 1];
  if (!mix) return;
  if (mix.tracks.some(t => t.id === track.id)) { setStatus('already on that CD!'); return; }
  mix.tracks.push(track);
  saveMixes(mixes);
  setStatus('added to "' + mix.name + '".');
}

/* ============================================================
   DJ_Sp1n — the AI buddy (scripted brain, pluggable for a real LLM)
   ============================================================ */

const MOODS = [
  {
    keys: ['emo', 'sad', 'cry', 'rain', 'heartbreak', 'breakup', 'lonely'],
    reply: ['oh.', "it's one of those days.", 'got you <3'],
    terms: ['My Chemical Romance Welcome to the Black Parade', 'Dashboard Confessional Vindicated',
            'The Fray How to Save a Life', 'Death Cab for Cutie I Will Follow You Into the Dark'],
    name: 'rainy bus window mix',
  },
  {
    keys: ['party', 'dance', 'club', 'friday', 'weekend', 'birthday'],
    reply: ['say less.'],
    terms: ['Sean Paul Temperature', 'Fergie London Bridge',
            'Pussycat Dolls Buttons', 'Justin Timberlake SexyBack'],
    name: 'friday nite burnout',
  },
  {
    keys: ['crush', 'love', 'cute', 'date', 'valentine', 'boyfriend', 'girlfriend'],
    reply: ['a crush, huh.', 'burn them this.', 'works more often than it should.'],
    terms: ['Ne-Yo So Sick', 'James Blunt You\'re Beautiful',
            'Mariah Carey We Belong Together', 'Chris Brown Yo Excuse Me Miss'],
    name: 'do u like me y/n',
  },
  {
    keys: ['angry', 'mad', 'rage', 'hate', 'ugh', 'annoyed'],
    reply: ['punch the pillow.', 'not the monitor.', 'here.'],
    terms: ['Three Days Grace Animal I Have Become', 'Linkin Park What I\'ve Done',
            'Rise Against Prayer of the Refugee', 'System of a Down Hypnotize'],
    name: 'slam ur bedroom door',
  },
  {
    keys: ['chill', 'relax', 'study', 'homework', 'calm', 'sleep', 'coffee'],
    reply: ['easy now.', 'sunday speed only.'],
    terms: ['Jack Johnson Better Together', 'Corinne Bailey Rae Put Your Records On',
            'John Mayer Waiting on the World to Change', 'Norah Jones Sunrise'],
    name: 'sunday morning cereal',
  },
  {
    keys: ['gym', 'workout', 'run', 'pump', 'lift', 'sports'],
    reply: ['alright.', 'time to wake the neighbors.'],
    terms: ['Eminem Lose Yourself', '50 Cent In Da Club',
            'Kanye West Gold Digger', 'Black Eyed Peas Pump It'],
    name: 'gym class heroes (not the band)',
  },
  {
    keys: ['road', 'trip', 'drive', 'car', 'highway', 'summer'],
    reply: ['windows down.', 'arm out.', "here's the soundtrack."],
    terms: ['Red Hot Chili Peppers Snow Hey Oh', 'The Killers When You Were Young',
            'All-American Rejects Move Along', 'Boston More Than a Feeling'],
    name: 'shotgun rules apply',
  },
];

/* things he says when nobody asked */
const AMBIENT = [
  ['this song slaps.'],
  ['that bassline...', "chef's kiss."],
  ["this one's criminally underrated."],
  ["didn't think you'd like this one.", 'guess i was wrong.'],
  ["you've got expensive taste."],
  ['this mix is shaping up nicely.'],
  ['there it is.', "knew we'd find it."],
];

/* he is definitely not an ai */
const EGGS = [
  { re: /who\s+(are|r)\s+(you|u)/i,
    lines: ['just your neighborhood dj.', "don't tell the engineers i can talk."] },
  { re: /(are|r)\s+(you|u)\s+(an?\s+)?(ai|a\.i\.|bot|robot|chatgpt|gpt|llm)/i,
    lines: ['nah.', "i'm mostly caffeine and playlists."] },
  { re: /what\s+do\s+(you|u)\s+do/i,
    lines: ["i find songs you'll pretend you discovered yourself."] },
  { re: /^(yo|hi|hey|hello|sup|wassup|what'?s up)\b/i,
    lines: ['yo.', "what's the vibe?"] },
  { re: /(thank|thx|ty)\b/i,
    lines: ['anytime.', "that's what i'm here for... allegedly."] },
];

/* fake 2006 software doing fake 2006 things */
const PROCESS_STEPS = [
  'digging through the crates...',
  'loading music dna...',
  'reading id3 tags...',
  'checking bpm...',
  'matching artists...',
  'finding hidden gems...',
  'building mix cd...',
];

const imLog = $('#imLog');
const buddyWin = $('#buddy');

function imMsg(who, html, cls) {
  const div = document.createElement('div');
  div.className = 'im-msg ' + cls;
  div.innerHTML = '<span class="who">' + who + ':</span> ' + html;
  imLog.appendChild(div);
  imLog.scrollTop = imLog.scrollHeight;
  return div;
}

/* say(): everything he says goes through here — into the IM log,
   and into a speech bubble by the vinyl when the window is closed */
function say(lines, opts = {}) {
  const div = imMsg('DJ_Sp1n', lines.join('<br>'), 'bot');
  if (buddyWin.hidden && !opts.quiet) showBubble(lines);
  return div;
}

let bubbleTimer = null;
function showBubble(lines) {
  const b = $('#buddyBubble');
  b.innerHTML = lines.join('<br>');
  b.hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { b.hidden = true; }, 5200);
}
$('#buddyBubble').addEventListener('click', () => {
  $('#buddyBubble').hidden = true;
  buddyWin.hidden = false;
});

$('#buddyToggle').addEventListener('click', () => {
  buddyWin.hidden = !buddyWin.hidden;
  $('#buddyBubble').hidden = true;
  if (!buddyWin.hidden && !imLog.children.length) {
    say(['yo.', 'what are we listening to today?'], { quiet: true });
  }
});
$('#buddyClose').addEventListener('click', () => { buddyWin.hidden = true; });

$('#imForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('#imInput').value.trim();
  if (!text) return;
  $('#imInput').value = '';
  imMsg('me', esc(text), 'me');
  await buddyRespond(text);
});

/* the 2006-software theater: cycle status lines while the real fetch runs */
async function runProcess(statusDiv, fetchPromise) {
  for (const step of PROCESS_STEPS) {
    statusDiv.innerHTML = '<span class="who">DJ_Sp1n:</span> <i>' + step + '</i>';
    imLog.scrollTop = imLog.scrollHeight;
    await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
  }
  const tracks = await fetchPromise;
  statusDiv.innerHTML = '<span class="who">DJ_Sp1n:</span> <i>done.</i>';
  await new Promise(r => setTimeout(r, 400));
  statusDiv.remove();
  return tracks;
}

async function buddyRespond(text) {
  const lower = text.toLowerCase();

  // small talk & things he will never admit
  const egg = EGGS.find(e => e.re.test(text));
  if (egg) {
    const t = imMsg('DJ_Sp1n', '...', 'bot typing');
    await new Promise(r => setTimeout(r, 700));
    t.remove();
    say(egg.lines, { quiet: true });
    return;
  }

  const mood = MOODS.find(m => m.keys.some(k => lower.includes(k)));
  let reply, mixName, fetchPromise;
  if (mood) {
    reply = mood.reply;
    mixName = mood.name;
    fetchPromise = Promise.all(mood.terms.map(t => searchTracks(t, 2).catch(() => [])))
      .then(r => dedupe(r.flat()).slice(0, 8));
  } else {
    reply = ['hm.', 'digging for that the old-fashioned way...'];
    mixName = text.slice(0, 24) + ' mix';
    fetchPromise = searchTracks(text, 8);
  }

  say(reply, { quiet: true });
  const status = imMsg('DJ_Sp1n', '', 'bot typing');

  try {
    const tracks = await runProcess(status, fetchPromise);

    if (!tracks.length) {
      say(['crates came up empty.', 'try different words?'], { quiet: true });
      return;
    }

    const msg = say(['got something.', 'trust me.'], { quiet: true });
    const list = document.createElement('div');
    list.className = 'im-tracklist';
    list.innerHTML = tracks.map(t => '&#9835; ' + esc(t.name) + ' — ' + esc(t.artist)).join('<div></div>');
    msg.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'im-actions';
    const playBtn = document.createElement('button');
    playBtn.className = 'btn-row';
    playBtn.innerHTML = '&#9654; PLAY MIX';
    playBtn.addEventListener('click', () => playQueue(tracks, 0));
    const burnBtn = document.createElement('button');
    burnBtn.className = 'btn-row pink';
    burnBtn.textContent = '● BURN TO CD';
    burnBtn.addEventListener('click', () => {
      const mixes = getMixes();
      mixes.push({ name: mixName, tracks });
      saveMixes(mixes);
      burnBtn.textContent = '✓ BURNED';
      burnBtn.disabled = true;
      say(['burned.', '"' + esc(mixName) + '" is in my mix cds.', "don't scratch it."], { quiet: true });
    });
    actions.append(playBtn, burnBtn);
    msg.appendChild(actions);
    imLog.scrollTop = imLog.scrollHeight;
  } catch {
    status.remove();
    say(['modem dropped.', 'try again in a sec.'], { quiet: true });
  }
}

/* ============ he watches the player. lovingly. ============ */

const buddyState = {
  lastTrackId: null,
  loopStreak: 0,
  skipTimes: [],
  lastAmbient: 0,
  saidLateNight: false,
};

function buddyOnPlay(t) {
  // looping one song
  if (t.id === buddyState.lastTrackId) {
    buddyState.loopStreak++;
    if (buddyState.loopStreak === 2) { say(['again?', 'respect.']); return; }
  } else {
    buddyState.loopStreak = 1;
    buddyState.lastTrackId = t.id;
  }

  // play counts (persistent)
  const counts = store.get('sp06_playcounts', {});
  counts[t.id] = (counts[t.id] || 0) + 1;
  store.set('sp06_playcounts', counts);
  if (counts[t.id] === 5) {
    say(["you've played", '"' + esc(t.name.toLowerCase()) + '" 5 times this week.', 'rough week?']);
    return;
  }
  if (counts[t.id] === 17) {
    say(['17 times.', 'i counted.', 'do we need to talk?']);
    return;
  }

  // late night listening
  const now = new Date();
  const h = now.getHours();
  if (!buddyState.saidLateNight && h >= 0 && h < 5) {
    buddyState.saidLateNight = true;
    const hh = h === 0 ? 12 : h;
    const mm = String(now.getMinutes()).padStart(2, '0');
    say([hh + ':' + mm + ' am?', 'yeah...', "this one's made for nights like this."]);
    return;
  }

  // unprompted commentary, occasionally
  if (Date.now() - buddyState.lastAmbient > 120000 && Math.random() < 0.22) {
    buddyState.lastAmbient = Date.now();
    say(AMBIENT[Math.floor(Math.random() * AMBIENT.length)]);
  }
}

function buddyOnSkip() {
  const now = Date.now();
  buddyState.skipTimes = buddyState.skipTimes.filter(ts => now - ts < 30000);
  buddyState.skipTimes.push(now);
  if (buddyState.skipTimes.length >= 5) {
    buddyState.skipTimes = [];
    say(['alright...', 'tough crowd today.']);
  }
}

function dedupe(tracks) {
  const seen = new Set();
  return tracks.filter(t => !seen.has(t.id) && seen.add(t.id));
}

/* ---------------- init ---------------- */

renderSideMixes();
nav('home');
