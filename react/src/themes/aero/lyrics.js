// LRCLIB lookup — no shared hook covers lyrics, so this theme fetches it
// directly (read-only, not player/library state, so it doesn't belong in core/store.js).
function cleanArtist(a){ return a.split(/\s+(?:ft\.?|feat\.?|featuring)\s+/i)[0].trim(); }

export async function fetchLyrics(track){
  const direct = `artist_name=${encodeURIComponent(cleanArtist(track.artist))}&track_name=${encodeURIComponent(track.name)}`;
  let data = null;
  try{
    let res = await fetch(`https://lrclib.net/api/get?${direct}`);
    if(res.ok) data = await res.json();
    else{
      res = await fetch(`https://lrclib.net/api/search?${direct}`);
      if(res.ok){ const list = await res.json(); data = list[0] || null; }
    }
  }catch{ /* offline — caller shows the empty state */ }
  if(!data) return null;
  if(data.instrumental) return ['♪ instrumental ♪'];
  const text = data.plainLyrics || (data.syncedLyrics || '').replace(/\[[\d:.]+\]\s?/g, '');
  const lines = text.split('\n').map(l => l.trim());
  return lines.length && lines.some(l => l) ? lines : null;
}
