// Gradient fallback for tracks whose iTunes artwork URL is missing.
const GRADIENTS = [
  'linear-gradient(135deg,#1FC4CE,#0E5C63)', 'linear-gradient(135deg,#3E96D8,#14406E)',
  'linear-gradient(135deg,#7CC421,#245214)', 'linear-gradient(135deg,#FFD23F,#B85C00)',
  'linear-gradient(135deg,#7CC421,#2E5C0A)', 'linear-gradient(135deg,#B45CFF,#3B1E6E)',
  'linear-gradient(135deg,#FF6B4A,#7A1E0E)', 'linear-gradient(135deg,#4ADEDE,#0E4E5C)',
  'linear-gradient(135deg,#9CCEF0,#3E96D8)', 'linear-gradient(135deg,#FFB6D9,#8E2A5A)',
];

export function artStyle(track){
  if(!track) return {};
  if(track.art) return { backgroundImage: `url('${track.art}')`, backgroundSize: 'cover', backgroundPosition: 'center' };
  const id = typeof track.id === 'number' ? track.id : String(track.id || '').length;
  return { background: GRADIENTS[id % GRADIENTS.length] };
}
