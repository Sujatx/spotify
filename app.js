/* ============================================================
   SPOTIFY 2006 — app logic (desktop edition)
   layout: explorer tree | dense content | dj console
   data: iTunes Search API via JSONP (the authentic 2006 technique)
   audio: 30-second previews via <audio>
   storage: localStorage (mix cds, recents, cache, column widths)
   ============================================================ */

'use strict';

/* ---------------- state ---------------- */

const state = {
  queue: [],
  idx: -1,
  shuffle: false,
  repeat: false,
  searchResults: [],
  searchAlbums: null,   // lazy-loaded per query
  searchArtists: null,  // lazy-loaded per query
  searchFilter: 'all',
  lastQuery: '',
  view: 'home',
  chart: [],
  session: [],       // tracks played this session (for BUILD MIX)
  gemIds: new Set(), // hidden-gem track ids (dj comments on these)
  albumCache: {},    // collectionId -> tracks
};

const audio = document.getElementById('audio');
const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
    genre: r.primaryGenreName || '',
  };
}

async function searchTracks(term, limit = 25) {
  const url = 'https://itunes.apple.com/search?media=music&entity=song'
    + '&limit=' + limit + '&term=' + encodeURIComponent(term);
  const data = await jsonp(url);
  return (data.results || []).filter(r => r.previewUrl).map(normalizeTrack);
}

function dedupe(tracks) {
  const seen = new Set();
  return tracks.filter(t => !seen.has(t.id) && seen.add(t.id));
}

function shuffleArr(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------------- storage + cache ---------------- */

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
};

const CACHE_TTL = 6 * 60 * 60 * 1000; // curated content refreshes every 6h

async function cachedTracks(key, loader) {
  const cache = store.get('sp06_cache', {});
  if (cache[key] && Date.now() - cache[key].t < CACHE_TTL) return cache[key].v;
  const v = await loader();
  cache[key] = { t: Date.now(), v };
  store.set('sp06_cache', cache);
  return v;
}

function loadTermSet(key, terms, per = 1) {
  return cachedTracks(key, () =>
    Promise.all(terms.map(t => searchTracks(t, per).catch(() => [])))
      .then(r => dedupe(r.flat())));
}

const getMixes = () => store.get('sp06_mixes', []);
const saveMixes = (m) => { store.set('sp06_mixes', m); renderTree(); };

/* ---------------- liked songs ---------------- */

const getLikes = () => store.get('sp06_likes', []);
const isLiked = (id) => getLikes().some(t => t.id === id);

function toggleLike(t) {
  let likes = getLikes();
  if (isLiked(t.id)) {
    likes = likes.filter(x => x.id !== t.id);
    setStatus('removed from liked songs.');
  } else {
    likes = [t, ...likes];
    setStatus('liked. good taste.');
  }
  store.set('sp06_likes', likes);
  renderTree();
  if (state.view === 'liked') renderView();
}

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

/* ============================================================
   curated 2006 data
   ============================================================ */

const CHART_2006 = [
  'Gnarls Barkley Crazy', 'Nelly Furtado Promiscuous', 'Rihanna SOS',
  'Shakira Hips Don\'t Lie', 'Justin Timberlake SexyBack',
  'The Killers When You Were Young', 'Red Hot Chili Peppers Dani California',
  'Beyonce Irreplaceable', 'Panic At The Disco I Write Sins Not Tragedies',
  'The Fray How to Save a Life',
];

const NEW_RELEASES = [
  'Amy Winehouse Rehab', 'The Killers Bones', 'Akon Smack That',
  'Evanescence Call Me When You\'re Sober', 'Fergie Fergalicious',
  'Snow Patrol Chasing Cars', 'John Legend Save Room', 'JoJo Too Little Too Late',
];

const STAFF_PICKS = [
  'Arctic Monkeys I Bet You Look Good on the Dancefloor',
  'Gym Class Heroes Cupid\'s Chokehold', 'The Raconteurs Steady As She Goes',
  'Regina Spektor Fidelity', 'TV on the Radio Wolf Like Me', 'Muse Starlight',
];

const HIDDEN_GEMS = [
  'Camera Obscura Lloyd I\'m Ready to Be Heartbroken', 'Band of Horses The Funeral',
  'Cat Power The Greatest', 'Beirut Postcards from Italy', 'Midlake Roscoe',
  'Phoenix Consolation Prizes',
];

const FEATURED_ARTIST = {
  name: 'Amy Winehouse',
  note: 'back to black just dropped. you\'ll be hearing about this one.',
};

const EDITORIAL = [
  { name: '2006 essentials', desc: 'the year, condensed.', terms: CHART_2006 },
  { name: 'emo night', desc: 'eyeliner not included.',
    terms: ['My Chemical Romance Welcome to the Black Parade', 'Fall Out Boy Dance Dance',
            'Panic At The Disco I Write Sins Not Tragedies', 'Dashboard Confessional Vindicated',
            'Jimmy Eat World The Middle', 'Taking Back Sunday MakeDamnSure'] },
  { name: 'indie disco', desc: 'dance, but make it skinny jeans.',
    terms: ['Arctic Monkeys I Bet You Look Good on the Dancefloor', 'Franz Ferdinand Take Me Out',
            'Bloc Party Banquet', 'The Strokes Juicebox', 'Hot Chip Over and Over', 'LCD Soundsystem Daft Punk Is Playing at My House'] },
  { name: 'summer 06', desc: 'windows down forever.',
    terms: ['Rihanna SOS', 'Sean Paul Temperature', 'Shakira Hips Don\'t Lie',
            'Nelly Furtado Promiscuous', 'Cassie Me & U', 'Chamillionaire Ridin'] },
];

const STATIONS = [
  { freq: '89.1',  name: 'POP 2K6',       artists: ['Nelly Furtado', 'Justin Timberlake', 'Rihanna', 'Christina Aguilera', 'Pink'] },
  { freq: '92.7',  name: 'ALT ROCK',      artists: ['The Killers', 'Muse', 'Franz Ferdinand', 'Bloc Party', 'Snow Patrol'] },
  { freq: '95.5',  name: 'HIP-HOP',       artists: ['Kanye West', 'T.I.', 'Ludacris', 'Outkast', 'Chamillionaire'] },
  { freq: '98.3',  name: 'R&B SLOW JAMS', artists: ['Ne-Yo', 'Beyonce', 'Usher', 'Alicia Keys', 'John Legend'] },
  { freq: '101.9', name: 'EMO / PUNK',    artists: ['My Chemical Romance', 'Fall Out Boy', 'Panic At The Disco', 'Paramore', 'Jimmy Eat World'] },
  { freq: '104.1', name: 'INDIE',         artists: ['Arctic Monkeys', 'The Shins', 'Belle and Sebastian', 'Regina Spektor', 'Cat Power'] },
];

const TREND_SEED = [
  { term: 'Amy Winehouse Rehab',              up: '+312%' },
  { term: 'Peter Bjorn and John Young Folks', up: '+204%' },
  { term: 'Lily Allen Smile',                 up: '+178%' },
  { term: 'Mika Grace Kelly',                 up: '+95%' },
  { term: 'Klaxons Golden Skans',             up: '+61%' },
];

/* ============================================================
   glossy 16px icons (hand-drawn svg, famfamfam energy)
   ============================================================ */

const ICON_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9BD1F5"/><stop offset="1" stop-color="#2E7CC4"/></linearGradient>
<linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9FA6A"/><stop offset="1" stop-color="#5BA30F"/></linearGradient>
<linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9C9C"/><stop offset="1" stop-color="#C42A3A"/></linearGradient>
<linearGradient id="gSilver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2F4F6"/><stop offset="1" stop-color="#9BA3AB"/></linearGradient>
<linearGradient id="gManila" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8"/><stop offset="1" stop-color="#D9A845"/></linearGradient>
<radialGradient id="gDisc" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#F8FAFC"/><stop offset="1" stop-color="#8FA0AC"/></radialGradient>
</defs></svg>`;

const SVG_ICONS = {
  home: '<path d="M8 1.8 14 7.5h-1.8V14H9.8v-4H6.2v4H3.8V7.5H2Z" fill="url(#gBlue)" stroke="#17456F" stroke-width=".7"/>',
  search: '<circle cx="6.5" cy="6.5" r="4" fill="url(#gSilver)" stroke="#5A646E" stroke-width="1"/><circle cx="6.5" cy="6.5" r="2.1" fill="#CDE8F8"/><path d="m9.4 9.4 4 4" stroke="#5A646E" stroke-width="2.2" stroke-linecap="round"/>',
  library: '<path d="M1.5 5h4.2l1.2 1.4h7.6V13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" fill="url(#gManila)" stroke="#8A6A20" stroke-width=".7"/><path d="M1.5 5V3.6a.9.9 0 0 1 .9-.9h2.8l1.2 1.4H1.5Z" fill="url(#gManila)" stroke="#8A6A20" stroke-width=".7"/>',
  songs: '<path d="M6.2 12V4.2l6-1.6v7" stroke="#2E6A08" stroke-width="1.3" fill="none"/><ellipse cx="4.7" cy="12.2" rx="2" ry="1.5" fill="url(#gGreen)" stroke="#2E6A08" stroke-width=".6"/><ellipse cx="10.7" cy="9.6" rx="2" ry="1.5" fill="url(#gGreen)" stroke="#2E6A08" stroke-width=".6"/>',
  artists: '<circle cx="8" cy="4.8" r="2.9" fill="url(#gBlue)" stroke="#17456F" stroke-width=".6"/><path d="M2.6 14c.5-3.4 2.8-4.9 5.4-4.9s4.9 1.5 5.4 4.9Z" fill="url(#gBlue)" stroke="#17456F" stroke-width=".6"/>',
  albums: '<circle cx="8" cy="8" r="6.2" fill="url(#gDisc)" stroke="#66727C" stroke-width=".7"/><circle cx="8" cy="8" r="1.6" fill="#FFF" stroke="#66727C" stroke-width=".6"/>',
  playlists: '<rect x="2" y="2.6" width="12" height="2.2" rx="1" fill="url(#gGreen)" stroke="#2E6A08" stroke-width=".5"/><rect x="2" y="6.9" width="12" height="2.2" rx="1" fill="url(#gGreen)" stroke="#2E6A08" stroke-width=".5"/><rect x="2" y="11.2" width="8" height="2.2" rx="1" fill="url(#gGreen)" stroke="#2E6A08" stroke-width=".5"/>',
  mixcd: '<circle cx="8" cy="8" r="6.2" fill="url(#gDisc)" stroke="#2E6A08" stroke-width=".8"/><circle cx="8" cy="8" r="3.4" fill="none" stroke="#5BA30F" stroke-width="1"/><circle cx="8" cy="8" r="1.5" fill="#FFF" stroke="#2E6A08" stroke-width=".5"/>',
  liked: '<path d="M8 13.6C4.1 10.3 1.9 8 1.9 5.6c0-1.7 1.3-3 3-3 1.2 0 2.4.7 3.1 1.9C8.7 3.3 9.9 2.6 11.1 2.6c1.7 0 3 1.3 3 3 0 2.4-2.2 4.7-6.1 8Z" fill="url(#gRed)" stroke="#8A1A2A" stroke-width=".7"/>',
  queue: '<rect x="2" y="2.6" width="8.5" height="2" rx="1" fill="url(#gSilver)" stroke="#66727C" stroke-width=".5"/><rect x="2" y="7" width="8.5" height="2" rx="1" fill="url(#gSilver)" stroke="#66727C" stroke-width=".5"/><rect x="2" y="11.4" width="8.5" height="2" rx="1" fill="url(#gSilver)" stroke="#66727C" stroke-width=".5"/><path d="M12 6.8 15 9l-3 2.2Z" fill="url(#gGreen)" stroke="#2E6A08" stroke-width=".6"/>',
  radio: '<path d="M8 1.6v5.6" stroke="#2E6A08" stroke-width="1.3"/><circle cx="8" cy="8.6" r="1.4" fill="url(#gGreen)" stroke="#2E6A08" stroke-width=".5"/><path d="M4.4 12.2a5.1 5.1 0 0 1 0-7.2M11.6 5a5.1 5.1 0 0 1 0 7.2" stroke="#5BA30F" fill="none" stroke-width="1.2" stroke-linecap="round"/>',
  downloads: '<path d="M8 1.8v7M5 6l3 3.2L11 6" stroke="#2E6A08" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M2.5 11.2h11v2.8h-11z" fill="url(#gSilver)" stroke="#66727C" stroke-width=".6"/>',
};

function icon(name) {
  return '<svg class="ni" viewBox="0 0 16 16" aria-hidden="true">' + (SVG_ICONS[name] || '') + '</svg>';
}

/* ============================================================
   explorer tree
   ============================================================ */

const NAV_TREE = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'liked', label: 'Liked Songs', icon: 'liked' },
  { id: 'queue', label: 'Up Next', icon: 'queue' },
  { id: 'library', label: 'Library', icon: 'library', children: [
    { id: 'songs', label: 'Songs', icon: 'songs' },
    { id: 'artists', label: 'Artists', icon: 'artists' },
    { id: 'albums', label: 'Albums', icon: 'albums' },
  ]},
  { id: 'playlists', label: 'Playlists', icon: 'playlists' },
  { id: 'mixcds', label: 'Mix CDs', icon: 'mixcd' },
  { id: 'radio', label: 'Radio', icon: 'radio' },
  { id: 'downloads', label: 'Downloads', icon: 'downloads' },
];

let treeOpen = store.get('sp06_tree', { library: true });

function treeNode(n, depth) {
  const kids = n.children;
  const open = treeOpen[n.id] !== false; // default open
  let count = '';
  if (n.id === 'mixcds') count = '<span class="tree-count">(' + getMixes().length + ')</span>';
  if (n.id === 'liked' && getLikes().length) count = '<span class="tree-count">(' + getLikes().length + ')</span>';
  if (n.id === 'queue' && state.queue.length) count = '<span class="tree-count">(' + state.queue.length + ')</span>';
  let html = '<button class="tree-row" data-nav="' + n.id + '" style="padding-left:' + (4 + depth * 15) + 'px">'
    + (kids
        ? '<span class="tree-tog" data-tog="' + n.id + '">' + (open ? '−' : '+') + '</span>'
        : '<span class="tree-tog empty"></span>')
    + icon(n.icon) + '<span>' + n.label + '</span>' + count + '</button>';
  if (kids) {
    html += '<div class="tree-kids" data-kids="' + n.id + '"' + (open ? '' : ' hidden') + '>'
      + kids.map(c => treeNode(c, depth + 1)).join('') + '</div>';
  }
  return html;
}

function renderTree() {
  const el = $('#navTree');
  el.innerHTML = NAV_TREE.map(n => treeNode(n, 0)).join('');

  el.querySelectorAll('.tree-tog[data-tog]').forEach(tog => {
    tog.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = tog.dataset.tog;
      treeOpen[id] = treeOpen[id] === false;
      store.set('sp06_tree', treeOpen);
      const kids = el.querySelector('[data-kids="' + id + '"]');
      kids.hidden = !kids.hidden;
      tog.textContent = kids.hidden ? '+' : '−';
    });
  });

  el.querySelectorAll('.tree-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.nav;
      nav(id === 'library' ? 'songs' : id);
    });
  });

  setTreeActive();
}

function setTreeActive() {
  let id = state.view;
  if (id.startsWith('mix:')) id = 'mixcds';
  if (id.startsWith('pl:')) id = 'playlists';
  if (id.startsWith('album:')) id = 'search';
  document.querySelectorAll('.tree-row').forEach(r =>
    r.classList.toggle('active', r.dataset.nav === id));
}

/* ============================================================
   splitters — resizable columns like real desktop software
   ============================================================ */

function initSplitters() {
  const frame = $('#frame');
  const saved = store.get('sp06_cols', null);
  if (saved) {
    if (saved.l) frame.style.setProperty('--col-l', saved.l);
    if (saved.r) frame.style.setProperty('--col-r', saved.r);
  }
  document.querySelectorAll('.splitter').forEach(sp => {
    sp.addEventListener('mousedown', (e) => {
      e.preventDefault();
      sp.classList.add('dragging');
      const side = sp.dataset.side;
      const onMove = (ev) => {
        const rect = frame.getBoundingClientRect();
        if (side === 'l') {
          const w = Math.min(320, Math.max(148, ev.clientX - rect.left));
          frame.style.setProperty('--col-l', w + 'px');
        } else {
          const w = Math.min(400, Math.max(205, rect.right - ev.clientX));
          frame.style.setProperty('--col-r', w + 'px');
        }
      };
      const onUp = () => {
        sp.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        store.set('sp06_cols', {
          l: frame.style.getPropertyValue('--col-l'),
          r: frame.style.getPropertyValue('--col-r'),
        });
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

/* ============================================================
   player
   ============================================================ */

function playQueue(tracks, startIdx) {
  state.queue = tracks.slice();
  state.idx = startIdx;
  renderTree(); // up-next count
  playCurrent();
}

function playCurrent() {
  const t = state.queue[state.idx];
  if (!t) return;
  audio.src = t.preview;
  audio.play().catch(() => setStatus('click PLAY to start audio.'));
  updateLcd(t);
  addRecent(t);
  state.session.push(t);
  if (state.session.length > 50) state.session.shift();
  buddyOnPlay(t);
  renderView(); // refresh playing-row highlight
}

function updateLcd(t) {
  const text = '♫ ' + t.name + ' — ' + t.artist + ' ';
  const el = $('#lcdText');
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
  } else if (!manual && !state.repeat && state.idx === state.queue.length - 1) {
    setStatus('end of queue. repeat is off.');
    return;
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
$('#repeatBtn').addEventListener('click', (e) => {
  state.repeat = !state.repeat;
  e.currentTarget.classList.toggle('on', state.repeat);
  setStatus('repeat ' + (state.repeat ? 'ON — round and round' : 'off'));
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

/* ---------------- recents + hit counter ---------------- */

function addRecent(t) {
  let recent = store.get('sp06_recent', []);
  recent = [t, ...recent.filter(r => r.id !== t.id)].slice(0, 12);
  store.set('sp06_recent', recent);
}

/* ============================================================
   views
   ============================================================ */

const view = $('#view');

function nav(name) {
  state.view = name;
  setTreeActive();
  // mobile: picking something closes the drawer
  if (window.matchMedia('(max-width: 900px)').matches) {
    closeDrawers();
  }
  renderView();
}

function renderView() {
  const v = state.view;
  if (v === 'home') renderHome();
  else if (v === 'search') renderSearch();
  else if (v === 'liked') renderLiked();
  else if (v === 'queue') renderQueue();
  else if (v.startsWith('album:')) renderAlbumDetail(v.slice(6));
  else if (v === 'songs') renderSongs();
  else if (v === 'artists') renderArtists();
  else if (v === 'albums') renderAlbums();
  else if (v === 'playlists') renderPlaylists();
  else if (v.startsWith('pl:')) renderPlaylistDetail(v.slice(3));
  else if (v === 'mixcds') renderMixCds();
  else if (v.startsWith('mix:')) renderMixDetail(v.slice(4));
  else if (v === 'radio') renderRadio();
  else if (v === 'downloads') renderDownloads();
}

/* ---- shared widgets ---- */

function trackTable(tracks, opts = {}) {
  const cur = state.queue[state.idx];
  const rows = tracks.map((t, i) => `
    <tr class="${cur && cur.id === t.id ? 'playing' : ''}">
      <td class="t-art"><img src="${esc(t.art)}" alt="" loading="lazy"></td>
      <td class="t-name">${esc(t.name)}</td>
      <td class="t-artist">${esc(t.artist)}</td>
      <td class="t-album">${esc(t.album)}</td>
      <td class="t-time">${fmtTime(t.ms / 1000)}</td>
      <td class="t-actions">
        <button class="btn-row" data-act="play" data-i="${i}">&#9654;</button>
        <button class="btn-row heart ${isLiked(t.id) ? 'on' : ''}" data-act="like" data-i="${i}" title="Like">&hearts;</button>
        ${opts.removable
          ? `<button class="btn-row pink" data-act="remove" data-i="${i}" title="Remove">&times;</button>`
          : `<button class="btn-row pink" data-act="add" data-i="${i}" title="Add to a Mix CD">+CD</button>`}
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
      else if (act === 'like') {
        toggleLike(tracks[i]);
        btn.classList.toggle('on', isLiked(tracks[i].id));
      }
      else if (act === 'add') promptAddToMix(tracks[i]);
      else if (act === 'remove' && opts.onRemove) opts.onRemove(i);
    });
  });
}

function coverGrid(tracks, opts = {}) {
  return tracks.map((t, i) => `
    <button class="cover" data-i="${i}">
      ${opts.ranked ? '<span class="chart-rank">#' + (i + 1) + '</span>' : ''}
      <img src="${esc(t.art)}" alt="" loading="lazy">
      <div class="c-name">${esc(t.name)}</div>
      <div class="c-artist">${esc(t.artist)}</div>
    </button>`).join('');
}

function bindCoverGrid(container, tracks) {
  container.querySelectorAll('.cover').forEach(card =>
    card.addEventListener('click', () => playQueue(tracks, Number(card.dataset.i))));
}

function secHtml(id, title, note) {
  return `<div class="sec">
    <div class="sec-head"><h3>${title}</h3><span class="sec-note">${note || ''}</span></div>
    <div class="cover-strip" id="${id}"><div class="loading">loading</div></div>
  </div>`;
}

async function fillSection(id, loader, opts = {}) {
  try {
    const tracks = await loader();
    const el = document.getElementById(id);
    if (!el) return tracks; // user navigated away
    if (!tracks.length) { el.innerHTML = '<div class="empty-note">nothing here.</div>'; return tracks; }
    el.innerHTML = coverGrid(tracks, opts);
    bindCoverGrid(el, tracks);
    return tracks;
  } catch {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="empty-note">modem trouble. refresh?</div>';
    return [];
  }
}

/* ---- home: dense sections ---- */

function renderHome() {
  const recent = store.get('sp06_recent', []);
  view.innerHTML = `
    <div class="marquee-strip"><span>&#9835; every song on earth, streaming to your computer. yes, legally. we checked twice &middot; burn mix cds &middot; tune the radio &middot; dj_sp1n is watching the decks &#9835;</span></div>
    ${secHtml('secChart', 'TOP OF THE CHARTS <span class="zap">\'06</span>', 'what everyone\'s playing')}
    ${secHtml('secNew', 'NEW RELEASES', 'fresh off the press')}
    ${secHtml('secStaff', 'STAFF PICKS', 'the interns have taste')}
    ${secHtml('secGems', 'HIDDEN GEMS', 'don\'t tell everyone')}
    <div class="sec">
      <div class="sec-head"><h3>FEATURED ARTIST</h3><span class="sec-note">on rotation at hq</span></div>
      <div id="secFeat"><div class="loading">loading</div></div>
    </div>
    ${recent.length ? `
    <div class="sec">
      <div class="sec-head"><h3>RECENTLY PLAYED</h3><span class="sec-note">your last spins</span></div>
      <div id="secRecent"></div>
    </div>` : ''}
  `;

  if (recent.length) {
    const rt = document.getElementById('secRecent');
    rt.innerHTML = trackTable(recent);
    bindTableActions(rt, recent);
  }

  // load sections one after another — kinder to the api, cached for 6h after
  (async () => {
    state.chart = await fillSection('secChart', () => loadTermSet('chart', CHART_2006), { ranked: true });
    await fillSection('secNew', () => loadTermSet('newrel', NEW_RELEASES));
    await fillSection('secStaff', () => loadTermSet('staff', STAFF_PICKS));
    const gems = await fillSection('secGems', () => loadTermSet('gems', HIDDEN_GEMS));
    gems.forEach(t => state.gemIds.add(t.id));
    try {
      const feat = await cachedTracks('featured', () => searchTracks(FEATURED_ARTIST.name, 6));
      const el = document.getElementById('secFeat');
      if (el && feat.length) {
        el.innerHTML = `
          <div class="featured">
            <img src="${esc(feat[0].art)}" alt="">
            <div class="f-body">
              <div class="f-name">${esc(FEATURED_ARTIST.name)}</div>
              <div class="f-note">${esc(FEATURED_ARTIST.note)}</div>
              <div class="f-tracks">
                ${feat.map((t, i) => `<button class="f-track" data-i="${i}"><span class="f-no">${String(i + 1).padStart(2, '0')}</span>${esc(t.name)}</button>`).join('')}
              </div>
            </div>
          </div>`;
        el.querySelectorAll('.f-track').forEach(b =>
          b.addEventListener('click', () => playQueue(feat, Number(b.dataset.i))));
      }
    } catch { /* featured is a nice-to-have */ }
  })();
}

/* ---- search: chips (all / songs / albums / artists) ---- */

$('#homeBtn').addEventListener('click', () => nav('home'));

async function searchAlbumsApi(term) {
  const url = 'https://itunes.apple.com/search?media=music&entity=album'
    + '&limit=12&term=' + encodeURIComponent(term);
  const data = await jsonp(url);
  return (data.results || []).map(r => ({
    id: r.collectionId,
    name: r.collectionName,
    artist: r.artistName,
    art: (r.artworkUrl100 || '').replace('100x100', '300x300'),
    count: r.trackCount,
    year: (r.releaseDate || '').slice(0, 4),
  }));
}

async function searchArtistsApi(term) {
  const url = 'https://itunes.apple.com/search?media=music&entity=musicArtist'
    + '&limit=12&term=' + encodeURIComponent(term);
  const data = await jsonp(url);
  return (data.results || []).map(r => ({
    name: r.artistName,
    genre: r.primaryGenreName || 'music',
  }));
}

async function albumTracks(albumId) {
  if (state.albumCache[albumId]) return state.albumCache[albumId];
  const data = await jsonp('https://itunes.apple.com/lookup?id=' + albumId + '&entity=song&limit=30');
  const tracks = (data.results || [])
    .filter(r => r.wrapperType === 'track' && r.previewUrl)
    .map(normalizeTrack);
  state.albumCache[albumId] = tracks;
  return tracks;
}

$('#searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if (!q) return;
  state.lastQuery = q;
  state.searchFilter = 'all';
  state.searchAlbums = null;
  state.searchArtists = null;
  nav('search');
  if (/\bparty\b/i.test(q)) observe(['say less.']);
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

const SEARCH_CHIPS = [['all', 'ALL'], ['songs', 'SONGS'], ['albums', 'ALBUMS'], ['artists', 'ARTISTS']];

function renderSearch() {
  if (!state.lastQuery) {
    view.innerHTML = `
      <h2>SEARCH</h2>
      <p class="view-sub">type something in the search box up top. anything. we dare you.</p>
      <div class="empty-note">[ no search yet ]</div>`;
    return;
  }
  view.innerHTML = `
    <h2>RESULTS: <span class="zap">"${esc(state.lastQuery.toUpperCase())}"</span></h2>
    <div class="chip-row">
      ${SEARCH_CHIPS.map(([id, label]) =>
        `<button class="chip ${state.searchFilter === id ? 'on' : ''}" data-chip="${id}">${label}</button>`).join('')}
    </div>
    <div id="searchBody"><div class="loading">searching</div></div>`;
  view.querySelectorAll('[data-chip]').forEach(c =>
    c.addEventListener('click', () => {
      state.searchFilter = c.dataset.chip;
      renderSearch();
    }));
  renderSearchBody();
}

function topResultHtml(t) {
  return `
    <div class="top-result" id="topResult">
      <img src="${esc(t.art)}" alt="">
      <div class="tr-body">
        <div class="tr-name">${esc(t.name)}</div>
        <div class="tr-sub">SONG &middot; ${esc(t.artist)}</div>
        <div class="tr-btns">
          <button class="btn-row" data-top="play">&#9654; PLAY</button>
          <button class="btn-row heart ${isLiked(t.id) ? 'on' : ''}" data-top="like">&hearts;</button>
          <button class="btn-row pink" data-top="add">+CD</button>
        </div>
      </div>
    </div>`;
}

async function renderSearchBody() {
  const el = $('#searchBody');
  if (!el) return;
  const f = state.searchFilter;

  if (f === 'all' || f === 'songs') {
    const tracks = state.searchResults;
    if (!tracks.length) {
      el.innerHTML = '<div class="empty-note">[ nothing found — check the spelling? ]</div>';
      return;
    }
    if (f === 'songs') {
      el.innerHTML = trackTable(tracks);
      bindTableActions(el, tracks);
      return;
    }
    const top = tracks[0];
    el.innerHTML = topResultHtml(top) + '<div id="allSongs"></div>';
    el.querySelectorAll('[data-top]').forEach(b =>
      b.addEventListener('click', () => {
        const act = b.dataset.top;
        if (act === 'play') playQueue(tracks, 0);
        else if (act === 'like') { toggleLike(top); b.classList.toggle('on', isLiked(top.id)); }
        else if (act === 'add') promptAddToMix(top);
      }));
    const rest = tracks.slice(0, 10);
    const songsEl = $('#allSongs');
    songsEl.innerHTML = trackTable(rest);
    bindTableActions(songsEl, rest);
    return;
  }

  if (f === 'albums') {
    el.innerHTML = '<div class="loading">digging</div>';
    try {
      if (!state.searchAlbums) state.searchAlbums = await searchAlbumsApi(state.lastQuery);
    } catch { state.searchAlbums = []; }
    if (state.view !== 'search' || state.searchFilter !== 'albums') return;
    const albums = state.searchAlbums;
    if (!albums.length) {
      el.innerHTML = '<div class="empty-note">[ no albums found ]</div>';
      return;
    }
    el.innerHTML = '<div class="cover-strip">' + albums.map((a, i) => `
      <button class="cover" data-i="${i}">
        <img src="${esc(a.art)}" alt="" loading="lazy">
        <div class="c-name">${esc(a.name)}</div>
        <div class="c-artist">${esc(a.artist)}${a.year ? ' &middot; ' + a.year : ''}</div>
      </button>`).join('') + '</div>';
    el.querySelectorAll('.cover').forEach(c =>
      c.addEventListener('click', () => {
        const a = albums[Number(c.dataset.i)];
        state.curAlbum = a;
        state.view = 'album:' + a.id;
        setTreeActive();
        renderView();
      }));
    return;
  }

  if (f === 'artists') {
    el.innerHTML = '<div class="loading">digging</div>';
    try {
      if (!state.searchArtists) state.searchArtists = await searchArtistsApi(state.lastQuery);
    } catch { state.searchArtists = []; }
    if (state.view !== 'search' || state.searchFilter !== 'artists') return;
    const artists = state.searchArtists;
    if (!artists.length) {
      el.innerHTML = '<div class="empty-note">[ no artists found ]</div>';
      return;
    }
    el.innerHTML = '<div class="pl-grid">' + artists.map((a, i) => `
      <button class="pl-card" data-i="${i}">
        <div class="pl-name">${esc(a.name)}</div>
        <div class="pl-desc">ARTIST &middot; ${esc(a.genre.toLowerCase())}</div>
      </button>`).join('') + '</div>';
    el.querySelectorAll('.pl-card').forEach(c =>
      c.addEventListener('click', async () => {
        const a = artists[Number(c.dataset.i)];
        state.lastQuery = a.name;
        state.searchFilter = 'songs';
        setStatus('loading ' + a.name + '...');
        try { state.searchResults = await searchTracks(a.name); } catch { state.searchResults = []; }
        if (state.view === 'search') renderSearch();
      }));
  }
}

async function renderAlbumDetail(idStr) {
  const a = state.curAlbum && String(state.curAlbum.id) === idStr ? state.curAlbum : null;
  view.innerHTML = `
    <h2><span class="zap">&#9678;</span> ${a ? esc(a.name.toUpperCase()) : 'ALBUM'}</h2>
    <p class="view-sub">${a ? esc(a.artist) + (a.year ? ' &middot; ' + a.year : '') + ' &middot; ' : ''}
      <button class="btn-row" id="albPlayAll">&#9654; PLAY ALL</button>
      <button class="btn-row" id="albBack">&laquo; BACK TO RESULTS</button></p>
    <div id="albTable"><div class="loading">loading tracklist</div></div>`;
  $('#albBack').addEventListener('click', () => nav('search'));
  try {
    const tracks = await albumTracks(idStr);
    if (state.view !== 'album:' + idStr) return;
    const el = $('#albTable');
    if (!tracks.length) {
      el.innerHTML = '<div class="empty-note">[ no previews available for this one ]</div>';
      return;
    }
    el.innerHTML = trackTable(tracks);
    bindTableActions(el, tracks);
    $('#albPlayAll').addEventListener('click', () => playQueue(tracks, 0));
  } catch {
    const el = $('#albTable');
    if (el) el.innerHTML = '<div class="empty-note">modem trouble. refresh?</div>';
  }
}

/* ---- liked songs ---- */

function renderLiked() {
  const likes = getLikes();
  view.innerHTML = `
    <h2><span class="zap">&hearts;</span> LIKED SONGS</h2>
    <p class="view-sub">${likes.length} song${likes.length === 1 ? '' : 's'} you couldn't leave alone
      ${likes.length ? '&middot; <button class="btn-row" id="likedPlayAll">&#9654; PLAY ALL</button>' : ''}</p>
    <div id="likedTable">${likes.length ? '' : '<div class="empty-note">[ nothing liked yet — hit the &hearts; on any track ]</div>'}</div>`;
  if (!likes.length) return;
  $('#likedPlayAll').addEventListener('click', () => playQueue(likes, 0));
  const el = $('#likedTable');
  el.innerHTML = trackTable(likes);
  bindTableActions(el, likes);
}

/* ---- up next (queue) ---- */

function renderQueue() {
  const q = state.queue;
  view.innerHTML = `
    <h2><span class="zap">UP NEXT</span></h2>
    <p class="view-sub">${q.length} in the queue
      ${q.length ? '&middot; <button class="btn-row pink" id="qClear">CLEAR QUEUE</button>' : ''}</p>
    <div id="qTable">${q.length ? '' : '<div class="empty-note">[ queue empty — play something ]</div>'}</div>`;
  if (!q.length) return;
  $('#qClear').addEventListener('click', () => {
    const cur = state.queue[state.idx];
    state.queue = cur ? [cur] : [];
    state.idx = cur ? 0 : -1;
    renderTree();
    renderQueue();
    setStatus('queue cleared.');
  });
  $('#qTable').innerHTML = `
    <table class="track-table">
      <thead><tr><th></th><th>SONG</th><th>ARTIST</th><th style="text-align:right">TIME</th><th></th></tr></thead>
      <tbody>${q.map((t, i) => `
        <tr class="${i === state.idx ? 'playing' : ''}">
          <td class="t-art"><img src="${esc(t.art)}" alt="" loading="lazy"></td>
          <td class="t-name">${esc(t.name)}</td>
          <td class="t-artist">${esc(t.artist)}</td>
          <td class="t-time">${fmtTime(t.ms / 1000)}</td>
          <td class="t-actions">
            <button class="btn-row" data-act="jump" data-i="${i}">&#9654;</button>
            ${i > 0 ? `<button class="btn-row" data-act="up" data-i="${i}" title="Move up">&#9650;</button>` : ''}
            <button class="btn-row pink" data-act="drop" data-i="${i}" title="Remove">&times;</button>
          </td>
        </tr>`).join('')}</tbody>
    </table>`;
  $('#qTable').querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i);
      const act = btn.dataset.act;
      if (act === 'jump') {
        state.idx = i;
        playCurrent();
      } else if (act === 'up' && i > 0) {
        [state.queue[i - 1], state.queue[i]] = [state.queue[i], state.queue[i - 1]];
        if (state.idx === i) state.idx = i - 1;
        else if (state.idx === i - 1) state.idx = i;
        renderQueue();
      } else if (act === 'drop') {
        state.queue.splice(i, 1);
        if (i < state.idx) state.idx--;
        else if (state.idx >= state.queue.length) state.idx = state.queue.length - 1;
        renderTree();
        renderQueue();
      }
    });
  });
}

/* ---- library: songs / artists / albums ---- */

function collectLibrary() {
  const recents = store.get('sp06_recent', []);
  const mixTracks = getMixes().flatMap(m => m.tracks);
  return dedupe([...recents, ...mixTracks, ...sessionFound]);
}

function renderSongs() {
  const lib = collectLibrary();
  view.innerHTML = `
    <h2>LIBRARY &raquo; <span class="zap">SONGS</span></h2>
    <p class="view-sub">${lib.length} tracks — everything you've played, burned, or been handed by the dj</p>
    <div id="libTable">${lib.length ? '' : '<div class="empty-note">[ empty — go play something ]</div>'}</div>`;
  if (lib.length) {
    const el = $('#libTable');
    el.innerHTML = trackTable(lib);
    bindTableActions(el, lib);
  }
}

function renderArtists() {
  const lib = collectLibrary();
  const byArtist = {};
  lib.forEach(t => { (byArtist[t.artist] = byArtist[t.artist] || []).push(t); });
  const names = Object.keys(byArtist).sort();
  view.innerHTML = `
    <h2>LIBRARY &raquo; <span class="zap">ARTISTS</span></h2>
    <p class="view-sub">${names.length} artists in your library — click one to dig deeper</p>
    ${names.length ? '<div id="artistList" class="pl-grid"></div>' : '<div class="empty-note">[ empty — go play something ]</div>'}`;
  if (!names.length) return;
  $('#artistList').innerHTML = names.map(n => `
    <button class="pl-card" data-artist="${esc(n)}">
      <div class="pl-name">${esc(n)}</div>
      <div class="pl-desc">${byArtist[n].length} track${byArtist[n].length === 1 ? '' : 's'} in library</div>
    </button>`).join('');
  $('#artistList').querySelectorAll('[data-artist]').forEach(b =>
    b.addEventListener('click', async () => {
      const name = b.dataset.artist;
      state.lastQuery = name;
      nav('search');
      try { state.searchResults = await searchTracks(name); } catch { state.searchResults = []; }
      if (state.view === 'search') renderSearch();
    }));
}

function renderAlbums() {
  const lib = collectLibrary();
  const byAlbum = {};
  lib.forEach(t => {
    if (!t.album) return;
    (byAlbum[t.album] = byAlbum[t.album] || []).push(t);
  });
  const albums = Object.keys(byAlbum).sort();
  view.innerHTML = `
    <h2>LIBRARY &raquo; <span class="zap">ALBUMS</span></h2>
    <p class="view-sub">${albums.length} albums touched by your library</p>
    ${albums.length ? '<div class="cover-strip" id="albumGrid"></div>' : '<div class="empty-note">[ empty — go play something ]</div>'}`;
  if (!albums.length) return;
  $('#albumGrid').innerHTML = albums.map((a, i) => `
    <button class="cover" data-i="${i}">
      <img src="${esc(byAlbum[a][0].art)}" alt="" loading="lazy">
      <div class="c-name">${esc(a)}</div>
      <div class="c-artist">${esc(byAlbum[a][0].artist)}</div>
    </button>`).join('');
  $('#albumGrid').querySelectorAll('.cover').forEach(card =>
    card.addEventListener('click', () => playQueue(byAlbum[albums[Number(card.dataset.i)]], 0)));
}

/* ---- playlists (editorial) ---- */

function renderPlaylists() {
  view.innerHTML = `
    <h2><span class="zap">PLAYLISTS</span></h2>
    <p class="view-sub">hand-built at spotify hq. allegedly by humans.</p>
    <div class="pl-grid">
      ${EDITORIAL.map((p, i) => `
        <button class="pl-card" data-i="${i}">
          <div class="pl-name">${esc(p.name)}</div>
          <div class="pl-desc">${esc(p.desc)}</div>
        </button>`).join('')}
    </div>`;
  view.querySelectorAll('.pl-card').forEach(b =>
    b.addEventListener('click', () => { state.view = 'pl:' + b.dataset.i; setTreeActive(); renderView(); }));
}

async function renderPlaylistDetail(iStr) {
  const pl = EDITORIAL[Number(iStr)];
  if (!pl) { nav('playlists'); return; }
  view.innerHTML = `
    <h2><span class="zap">&#9835;</span> ${esc(pl.name.toUpperCase())}</h2>
    <p class="view-sub">${esc(pl.desc)} &middot;
      <button class="btn-row" id="plPlayAll">&#9654; PLAY ALL</button>
      <button class="btn-row" id="plBack">&laquo; ALL PLAYLISTS</button></p>
    <div id="plTable"><div class="loading">loading</div></div>`;
  $('#plBack').addEventListener('click', () => nav('playlists'));
  try {
    const tracks = await loadTermSet('pl_' + iStr, pl.terms, 1);
    const el = $('#plTable');
    if (!el || state.view !== 'pl:' + iStr) return;
    el.innerHTML = trackTable(tracks);
    bindTableActions(el, tracks);
    $('#plPlayAll').addEventListener('click', () => { if (tracks.length) playQueue(tracks, 0); });
  } catch {
    const el = $('#plTable');
    if (el) el.innerHTML = '<div class="empty-note">modem trouble. refresh?</div>';
  }
}

/* ---- mix cds ---- */

function renderMixCds() {
  const mixes = getMixes();
  view.innerHTML = `
    <h2>MY <span class="zap">MIX CDs</span></h2>
    <p class="view-sub">like burning CDs for your friends, minus the coaster-shaped failures &middot;
      <button class="btn-row pink" id="newMixBtn2">+ BURN NEW</button></p>
    ${mixes.length ? '<div class="mix-grid" id="mixGrid"></div>'
      : '<div class="empty-note">[ no mix cds yet — hit "+ BURN NEW" ]</div>'}`;
  $('#newMixBtn2').addEventListener('click', () => openBurnDialog(null));
  if (!mixes.length) return;
  $('#mixGrid').innerHTML = mixes.map((m, i) => `
    <div class="mix-card">
      <div class="cd-disc"></div>
      <div class="mix-name">${esc(m.name)}</div>
      <div class="mix-count">${m.tracks.length} track${m.tracks.length === 1 ? '' : 's'}</div>
      <div class="mix-btns">
        <button class="btn-row" data-act="open" data-i="${i}">OPEN</button>
        <button class="btn-row" data-act="playmix" data-i="${i}">&#9654;</button>
        <button class="btn-row pink" data-act="trash" data-i="${i}">&times;</button>
      </div>
    </div>`).join('');
  $('#mixGrid').querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i);
      const act = btn.dataset.act;
      const mixes2 = getMixes();
      if (act === 'open') { state.view = 'mix:' + i; setTreeActive(); renderView(); }
      else if (act === 'playmix' && mixes2[i].tracks.length) playQueue(mixes2[i].tracks, 0);
      else if (act === 'trash') {
        if (confirm('Snap "' + mixes2[i].name + '" in half? (this deletes it)')) {
          mixes2.splice(i, 1); saveMixes(mixes2); renderMixCds();
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
    <p class="view-sub">${mix.tracks.length} tracks &middot;
      <button class="btn-row" id="playAllBtn">&#9654; PLAY ALL</button>
      <button class="btn-row" id="backBtn">&laquo; ALL CDs</button></p>
    <div id="mixTable">${mix.tracks.length ? '' : '<div class="empty-note">[ empty CD — add songs via "+CD" on any track ]</div>'}</div>`;
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

/* ---- radio ---- */

function renderRadio() {
  view.innerHTML = `
    <h2><span class="zap">RADIO</span></h2>
    <p class="view-sub">six stations. zero ads. the fcc can't touch us here.</p>
    <div class="radio-grid">
      ${STATIONS.map((s, i) => `
        <div class="station">
          <div class="st-freq">${s.freq} FM</div>
          <div class="st-name">${esc(s.name)}</div>
          <div class="st-artists">${esc(s.artists.slice(0, 3).join(' · '))}...</div>
          <button class="btn-row" data-i="${i}">&#9654; TUNE IN</button>
        </div>`).join('')}
    </div>`;
  view.querySelectorAll('.station .btn-row').forEach(b =>
    b.addEventListener('click', () => tuneStation(STATIONS[Number(b.dataset.i)])));
}

async function tuneStation(st) {
  setStatus('tuning ' + st.freq + ' FM...');
  observe(['tuning ' + st.freq.toLowerCase() + ' fm...']);
  try {
    const picks = shuffleArr(st.artists).slice(0, 3);
    const results = await Promise.all(picks.map(a => searchTracks(a, 8).catch(() => [])));
    const tracks = shuffleArr(dedupe(results.flat()));
    if (!tracks.length) { observe(['static.', 'try another station.']); return; }
    if (!state.shuffle) { state.shuffle = true; $('#shuffleBtn').classList.add('on'); }
    playQueue(tracks, 0);
    observe(['station tuned.', "i'll keep it coming."]);
  } catch {
    observe(['static.', 'try another station.']);
  }
}

/* ---- downloads (a joke, but a period-accurate one) ---- */

function renderDownloads() {
  view.innerHTML = `
    <h2><span class="zap">DOWNLOADS</span></h2>
    <p class="view-sub">manage your downloaded music files</p>
    <div class="dl-box">
      0 files. 0 bytes. <span class="zap">0 viruses.</span><br><br>
      why download when you can stream?<br>
      limewire.exe not found — you don't need it anymore.<br><br>
      welcome to the future.
    </div>`;
}

/* ============================================================
   burn dialog + add-to-mix
   ============================================================ */

let pendingTrack = null;

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

function burnTracks(name, tracks) {
  const mixes = getMixes();
  mixes.push({ name, tracks });
  saveMixes(mixes);
  observe(['burned.', '"' + esc(name) + '" is on the shelf.', "don't scratch it."]);
}

/* ============================================================
   DJ_Sp1n — resident dj. the console is his desk.
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
  {
    keys: ['late', 'night', 'midnight', '2am', 'insomnia'],
    reply: ['late one tonight.'],
    terms: ['Imogen Heap Hide and Seek', 'The Postal Service Such Great Heights',
            'Coldplay Fix You', 'Frou Frou Let Go'],
    name: 'after hours',
  },
];

const AMBIENT = [
  ['this song slaps.'],
  ['that bassline...', "chef's kiss."],
  ["this one's criminally underrated."],
  ["didn't think you'd like this one.", 'guess i was wrong.'],
  ["you've got expensive taste."],
  ['this mix is shaping up nicely.'],
  ["don't skip this one."],
  ['there it is.', "knew we'd find it."],
  ['this transition is smooth.', 'keeping it.'],
  ["didn't expect", 'you to like this.', 'nice.'],
  ['good choice.'],
];

/* rotating presence — he's always doing something */
const STATUS_IDLE = ['♫ listening...', '♫ digging through crates', '♫ reading id3 tags', '♫ scanning artists'];
const STATUS_PLAY = ['♫ on air', '♫ matching bpm', '♫ listening...', '♫ finding hidden gems', '♫ scanning artists'];

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

const PROCESS_STEPS = [
  'digging through the crates...',
  'loading music dna...',
  'reading id3 tags...',
  'checking bpm...',
  'matching artists...',
  'finding hidden gems...',
  'building mix cd...',
];

/* ---- session log: his running journal ---- */

function consoleVisible() {
  return window.matchMedia('(min-width: 901px)').matches
    || $('#console').classList.contains('open');
}

function feedTime() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

function observe(lines, opts = {}) {
  const feed = $('#djFeed');
  const entry = document.createElement('div');
  entry.className = 'feed-entry new';
  entry.innerHTML = '<div class="feed-time">' + feedTime() + '</div>'
    + '<div class="feed-txt">' + lines.join('<br>') + '</div>';
  if (opts.actions) {
    const row = document.createElement('div');
    row.className = 'feed-actions';
    opts.actions.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn-row' + (a.pink ? ' pink' : '');
      b.textContent = a.label;
      b.addEventListener('click', a.fn);
      row.appendChild(b);
    });
    entry.appendChild(row);
  }
  feed.appendChild(entry);
  while (feed.children.length > 40) feed.firstChild.remove();
  feed.scrollTop = feed.scrollHeight;
  $('#syncNote').textContent = '· synced ' + feedTime();
  if (!consoleVisible()) showBubble(lines);
  return entry;
}

/* crate-digging theater: a temporary journal entry that cycles steps */
async function obsProcess() {
  const feed = $('#djFeed');
  const entry = document.createElement('div');
  entry.className = 'feed-entry new';
  const txt = document.createElement('div');
  txt.className = 'feed-txt';
  entry.appendChild(txt);
  feed.appendChild(entry);
  for (const s of PROCESS_STEPS) {
    txt.innerHTML = '<i>' + s + '</i>';
    feed.scrollTop = feed.scrollHeight;
    await sleep(230 + Math.random() * 160);
  }
  txt.innerHTML = '<i>done.</i>';
  await sleep(300);
  entry.remove();
}

/* ---- status line under his name ---- */

let djBusy = false;

function setDjStatus(text) { $('#djStatus').textContent = text; }

(function statusLoop() {
  const delay = 14000 + Math.random() * 16000;
  setTimeout(() => {
    if (!djBusy) {
      const pool = (audio.paused || !audio.src) ? STATUS_IDLE : STATUS_PLAY;
      setDjStatus(pool[Math.floor(Math.random() * pool.length)]);
    }
    statusLoop();
  }, delay);
})();

/* ---- boot sequence: the panel wakes up ---- */

async function djBoot() {
  await sleep(1000);
  observe(['yo.']);
  await sleep(2600);
  setDjStatus('♫ digging through crates');
  observe(['currently digging through', 'your library...']);
  await sleep(9000 + Math.random() * 5000);
  const lib = collectLibrary();
  const genres = {};
  lib.forEach(t => { if (t.genre) genres[t.genre] = (genres[t.genre] || 0) + 1; });
  const top = Object.entries(genres).sort((a, b) => b[1] - a[1]).map(e => e[0].toLowerCase());
  if (top.length >= 2) {
    observe(['huh.', "you've been bouncing between", top[0] + ' and ' + top[1] + ' lately.']);
  } else if (lib.length) {
    observe(['solid collection.', 'small. but solid.']);
  } else {
    observe(["library's empty.", "play something. i'll wait."]);
  }
  setDjStatus('♫ listening...');
}

/* ---- ambient life: things happen while music plays ---- */

let lastLife = Date.now();

setInterval(async () => {
  if (audio.paused || !audio.src) return;
  if (Date.now() - lastLife < 200000) return;   // breathe ~3.5min between events
  if (Math.random() < 0.45) return;             // jitter so it never feels scheduled
  lastLife = Date.now();
  const cur = state.queue[state.idx];
  const roll = Math.random();
  try {
    if (roll < 0.3 && cur) {
      // dig up something related → recently found
      setDjStatus('♫ digging through crates');
      const dug = (await searchTracks(cur.artist, 6))
        .filter(t => t.id !== cur.id && !state.queue.some(q => q.id === t.id));
      if (dug.length) {
        addFound([dug[Math.floor(Math.random() * dug.length)]]);
        observe(['found another one.']);
      }
      setDjStatus('♫ on air');
    } else if (roll < 0.55 && cur) {
      // quietly extend the queue
      setDjStatus('♫ matching bpm');
      const more = (await searchTracks(cur.artist, 8))
        .filter(t => t.id !== cur.id && !state.queue.some(q => q.id === t.id));
      if (more.length) {
        const pick = more[Math.floor(Math.random() * more.length)];
        state.queue.push(pick);
        renderTree(); // up-next count
        addFound([pick]);
        observe(['queued something', 'you might like.']);
      }
      setDjStatus('♫ on air');
    } else {
      observe(AMBIENT[Math.floor(Math.random() * AMBIENT.length)]);
    }
  } catch { /* the crates were locked. try later. */ }
}, 45000);

/* ---- speech bubble (mobile / console closed) ---- */

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
  $('#console').classList.add('open');
});

/* ---- recently found ---- */

let sessionFound = [];   // this session only — what he just dug up

function addFound(tracks) {
  sessionFound = dedupe([...tracks, ...sessionFound]).slice(0, 8);
  renderFound();
}

function renderFound() {
  const found = sessionFound;
  const el = $('#djFound');
  if (!found.length) {
    el.innerHTML = '<div class="con-empty">nothing yet. he\'s listening.</div>';
    return;
  }
  el.innerHTML = found.map((t, i) => `
    <button class="found-row" data-i="${i}">
      <img src="${esc(t.art)}" alt="" loading="lazy">
      <span class="fr-txt"><b>${esc(t.name)}</b><i>${esc(t.artist)}</i></span>
    </button>`).join('');
  el.querySelectorAll('.found-row').forEach(b =>
    b.addEventListener('click', () => playQueue(found, Number(b.dataset.i))));
}

/* ---- trending ---- */

async function renderTrending() {
  const el = $('#djTrend');
  try {
    const tracks = await cachedTracks('trending', async () => {
      const r = await Promise.all(TREND_SEED.map(s => searchTracks(s.term, 1).catch(() => [])));
      return r.map(a => a[0] || null);
    });
    const rows = tracks
      .map((t, i) => t ? { t, up: TREND_SEED[i].up } : null)
      .filter(Boolean);
    if (!rows.length) { el.innerHTML = '<div class="con-empty">the wire is quiet.</div>'; return; }
    el.innerHTML = rows.map((r, i) => `
      <button class="trend-row" data-i="${i}">
        <span class="tr-txt"><b>${esc(r.t.name)}</b><i>${esc(r.t.artist)}</i></span>
        <span class="tr-up">&#9650;${r.up}</span>
      </button>`).join('');
    const list = rows.map(r => r.t);
    el.querySelectorAll('.trend-row').forEach(b =>
      b.addEventListener('click', () => playQueue(list, Number(b.dataset.i))));
  } catch {
    el.innerHTML = '<div class="con-empty">the wire is quiet.</div>';
  }
}

/* ---- quick mixes + build mix ---- */

document.querySelectorAll('[data-quick]').forEach(b =>
  b.addEventListener('click', () => quickMix(b.dataset.quick)));

async function quickMix(key) {
  const mood = MOODS.find(m => m.keys.includes(key));
  if (!mood || djBusy) return;
  djBusy = true;
  setDjStatus('♫ building mix');
  await obsProcess();
  try {
    const results = await Promise.all(mood.terms.map(t => searchTracks(t, 2).catch(() => [])));
    const tracks = dedupe(results.flat()).slice(0, 8);
    if (!tracks.length) { observe(['crates came up empty.', 'try again in a sec.']); return; }
    playQueue(tracks, 0);
    addFound(tracks.slice(0, 3));
    observe([...mood.reply, 'playing now.'], {
      actions: [{ label: '● BURN TO CD', pink: true, fn: () => burnTracks(mood.name, tracks) }],
    });
  } catch {
    observe(['modem dropped.', 'try again.']);
  } finally {
    djBusy = false;
    setDjStatus('♫ on air');
  }
}

$('#buildMixBtn').addEventListener('click', buildMix);

const BUILD_BTN_HOME = '&#9889; BUILD MIX <span>from this session</span>';

/* the button becomes a tiny progress dialog: BUILDING → ████░░ → DONE ▶ */
async function animateBuildBtn(btn, work) {
  btn.disabled = true;
  const SEGS = 10;
  const tick = (i) =>
    'BUILDING MIX...<span class="bm-bar">' + '█'.repeat(i) + '░'.repeat(SEGS - i) + '</span>';
  btn.innerHTML = tick(0);
  let i = 0;
  const bar = setInterval(() => {
    if (i < SEGS - 1) { i++; btn.innerHTML = tick(i); }
  }, 260);
  try {
    const ok = await work();
    clearInterval(bar);
    btn.innerHTML = tick(SEGS);
    await sleep(200);
    btn.innerHTML = ok ? 'DONE <span>&#9654; playing</span>' : 'HMM. <span>try again?</span>';
  } catch {
    clearInterval(bar);
    btn.innerHTML = 'HMM. <span>try again?</span>';
  }
  await sleep(2400);
  btn.innerHTML = BUILD_BTN_HOME;
  btn.disabled = false;
}

async function buildMix() {
  const btn = $('#buildMixBtn');
  if (btn.disabled || djBusy) return;
  const session = dedupe(state.session);
  if (!session.length) {
    observe(['play something first.', "then i'll know what today sounds like."]);
    return;
  }
  djBusy = true;
  setDjStatus('♫ building mix');
  observe(['reading the session...']);
  await animateBuildBtn(btn, async () => {
    await obsProcess();
    const freq = {};
    session.forEach(t => { freq[t.artist] = (freq[t.artist] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const fetched = (await Promise.all(top.map(a => searchTracks(a, 5).catch(() => [])))).flat();
    const known = new Set(session.map(t => t.id));
    const fresh = dedupe(fetched).filter(t => !known.has(t.id));
    const tracks = dedupe([...session.slice(-4), ...fresh]).slice(0, 10);
    if (!tracks.length) return false;
    playQueue(tracks, 0);
    addFound(fresh.slice(0, 3));
    observe(['done.', 'this is what today sounded like.'], {
      actions: [{ label: '● BURN TO CD', pink: true, fn: () => burnTracks("today's session", tracks) }],
    });
    return true;
  });
  djBusy = false;
  setDjStatus('♫ on air');
}

/* ---- chat mode (talk to dj) ---- */

const conLog = $('#conLog');

function chatMsg(who, html, cls) {
  const div = document.createElement('div');
  div.className = 'im-msg ' + cls;
  div.innerHTML = '<span class="who">' + who + ':</span> ' + html;
  conLog.appendChild(div);
  conLog.scrollTop = conLog.scrollHeight;
  return div;
}

function chatSay(lines) {
  return chatMsg('DJ_Sp1n', lines.join('<br>'), 'bot');
}

$('#talkBtn').addEventListener('click', () => {
  const chat = $('#conChat');
  const opening = chat.hidden;
  chat.hidden = !opening;
  $('#conMid').hidden = opening;
  $('#talkBtn').innerHTML = opening ? '&laquo; back to console' : '&#9993; talk to dj &raquo;';
  if (opening) {
    if (!conLog.children.length) chatSay(['yo.', "what's the vibe?"]);
    $('#imInput').focus();
  }
});

$('#imForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('#imInput').value.trim();
  if (!text) return;
  $('#imInput').value = '';
  chatMsg('me', esc(text), 'me');
  await buddyRespond(text);
});

async function runProcess(statusDiv, fetchPromise) {
  for (const step of PROCESS_STEPS) {
    statusDiv.innerHTML = '<span class="who">DJ_Sp1n:</span> <i>' + step + '</i>';
    conLog.scrollTop = conLog.scrollHeight;
    await sleep(300 + Math.random() * 200);
  }
  const tracks = await fetchPromise;
  statusDiv.innerHTML = '<span class="who">DJ_Sp1n:</span> <i>done.</i>';
  await sleep(400);
  statusDiv.remove();
  return tracks;
}

async function buddyRespond(text) {
  const lower = text.toLowerCase();

  const egg = EGGS.find(e => e.re.test(text));
  if (egg) {
    const t = chatMsg('DJ_Sp1n', '...', 'bot typing');
    await sleep(700);
    t.remove();
    chatSay(egg.lines);
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

  chatSay(reply);
  const status = chatMsg('DJ_Sp1n', '', 'bot typing');

  try {
    const tracks = await runProcess(status, fetchPromise);

    if (!tracks.length) {
      chatSay(['crates came up empty.', 'try different words?']);
      return;
    }

    const msg = chatSay(['got something.', 'trust me.']);
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
      burnTracks(mixName, tracks);
      burnBtn.textContent = '✓ BURNED';
      burnBtn.disabled = true;
      chatSay(['burned.', '"' + esc(mixName) + '" is in my mix cds.', "don't scratch it."]);
    });
    actions.append(playBtn, burnBtn);
    msg.appendChild(actions);
    addFound(tracks.slice(0, 3));
    conLog.scrollTop = conLog.scrollHeight;
  } catch {
    status.remove();
    chatSay(['modem dropped.', 'try again in a sec.']);
  }
}

/* ---- he watches the player. lovingly. ---- */

const buddyState = {
  lastTrackId: null,
  lastGenre: '',
  loopStreak: 0,
  skipTimes: [],
  lastAmbient: 0,
  saidLateNight: false,
  saidLongSession: false,
  sessionStart: null,
  gemsSeen: new Set(),
};

function buddyOnPlay(t) {
  if (!buddyState.sessionStart) buddyState.sessionStart = Date.now();

  // looping one song
  if (t.id === buddyState.lastTrackId) {
    buddyState.loopStreak++;
    if (buddyState.loopStreak === 2) { observe(['again?', 'respect.']); return; }
  } else {
    buddyState.loopStreak = 1;
    buddyState.lastTrackId = t.id;
  }

  // play counts (persistent)
  const counts = store.get('sp06_playcounts', {});
  counts[t.id] = (counts[t.id] || 0) + 1;
  store.set('sp06_playcounts', counts);
  if (counts[t.id] === 5) {
    observe(['fifth time.', 'still not tired of it?']);
    return;
  }
  if (counts[t.id] === 17) {
    observe(["you've played", '"' + esc(t.name.toLowerCase()) + '" 17 times.', 'rough week?']);
    return;
  }

  // hidden gems
  if (state.gemIds.has(t.id) && !buddyState.gemsSeen.has(t.id)) {
    buddyState.gemsSeen.add(t.id);
    observe(['this one never got the attention it deserved.', 'good find.']);
    return;
  }

  // late night listening
  const now = new Date();
  const h = now.getHours();
  if (!buddyState.saidLateNight && h >= 0 && h < 5) {
    buddyState.saidLateNight = true;
    observe(['late one tonight.']);
    return;
  }

  // long session
  if (!buddyState.saidLongSession && Date.now() - buddyState.sessionStart > 30 * 60 * 1000) {
    buddyState.saidLongSession = true;
    observe(["we've been at this a while.", 'no complaints.']);
    return;
  }

  // genre change
  if (buddyState.lastGenre && t.genre && t.genre !== buddyState.lastGenre
      && Date.now() - buddyState.lastAmbient > 120000 && Math.random() < 0.4) {
    buddyState.lastGenre = t.genre;
    buddyState.lastAmbient = Date.now();
    observe(['switching gears.', 'ok. i see you.']);
    return;
  }
  if (t.genre) buddyState.lastGenre = t.genre;

  // unprompted commentary, occasionally
  if (Date.now() - buddyState.lastAmbient > 120000 && Math.random() < 0.22) {
    buddyState.lastAmbient = Date.now();
    observe(AMBIENT[Math.floor(Math.random() * AMBIENT.length)]);
  }
}

function buddyOnSkip() {
  const now = Date.now();
  buddyState.skipTimes = buddyState.skipTimes.filter(ts => now - ts < 30000);
  buddyState.skipTimes.push(now);
  if (buddyState.skipTimes.length >= 5) {
    buddyState.skipTimes = [];
    observe(['alright...', 'tough crowd today.']);
  }
}

/* ============================================================
   mobile drawers
   ============================================================ */

function syncScrim() {
  const open = $('#sidebar').classList.contains('open')
    || $('#console').classList.contains('open');
  $('#drawerScrim').hidden = !open;
}

function closeDrawers() {
  $('#sidebar').classList.remove('open');
  $('#console').classList.remove('open');
  $('#buddyBubble').hidden = true;
  syncScrim();
}

$('#navToggle').addEventListener('click', () => {
  $('#console').classList.remove('open');       // only one drawer at a time
  $('#sidebar').classList.toggle('open');
  syncScrim();
});
$('#buddyToggle').addEventListener('click', () => {
  $('#sidebar').classList.remove('open');
  $('#console').classList.toggle('open');
  $('#buddyBubble').hidden = true;
  syncScrim();
});
$('#navClose').addEventListener('click', closeDrawers);
$('#conClose').addEventListener('click', closeDrawers);
$('#drawerScrim').addEventListener('click', closeDrawers);

/* ============================================================
   intro — disco ball landing, once per session (?intro replays)
   ============================================================ */

function runIntro() {
  const ov = $('#introOverlay');
  const force = new URLSearchParams(location.search).has('intro');
  let seen = false;
  try { seen = !!sessionStorage.getItem('sp06_intro'); } catch (e) {}

  if (!ov || (seen && !force)) { djBoot(); return; }
  try { sessionStorage.setItem('sp06_intro', '1'); } catch (e) {}

  ov.hidden = false;
  const frame = $('#introFrame');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let done = false;
  function enter() {
    if (done) return;
    done = true;
    ov.classList.add('intro-out');
    setTimeout(() => { ov.remove(); djBoot(); }, 1100);
  }

  if (reduce) {
    $('#introStill').hidden = false;
    setTimeout(enter, 1400);
  } else {
    let ready = false;
    window.addEventListener('message', e => { if (e.data === 'disco-ready') ready = true; });
    frame.src = 'disco.html';
    // webgl/cdn dead? don't strand the user on a black screen
    setTimeout(() => { if (!ready) enter(); }, 3500);
    // pure animation, no cta — it just plays and gets out of the way
    setTimeout(enter, 2700);
  }

  $('#introSkip').addEventListener('click', enter);
  ov.addEventListener('click', enter);
}

/* ============================================================
   init
   ============================================================ */

document.body.insertAdjacentHTML('afterbegin', ICON_DEFS);
initSplitters();
renderTree();
renderFound();
renderTrending();
nav('home');
runIntro();
