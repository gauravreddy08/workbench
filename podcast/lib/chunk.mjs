// Groups turns into TTS requests of at most maxChars of spoken text, cutting only between turns,
// or between sentences when a single turn is too long on its own. Each chunk is a list of
// { speaker, text } pieces; the provider decides how to send them.

// One character per piece for the separator/speaker marker, so both providers stay under limits.
export const chunkChars = (pieces) => pieces.reduce((n, p) => n + p.text.length + 1, 0);

function splitSentences(text) {
  return text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g).map((s) => s.trim()).filter(Boolean);
}

// Break one turn into pieces that each fit, keeping the speaker on every piece.
function pieces({ speaker, text }, maxChars) {
  if (text.length + 1 <= maxChars) return [{ speaker, text }];
  const out = [];
  let buf = '';
  for (const s of splitSentences(text)) {
    const next = buf ? `${buf} ${s}` : s;
    if (buf && next.length + 1 > maxChars) {
      out.push({ speaker, text: buf });
      buf = s;
    } else {
      buf = next;
    }
  }
  if (buf) out.push({ speaker, text: buf });
  return out;
}

export function chunkTurns(turns, maxChars = 1900) {
  const chunks = [];
  let buf = [];
  for (const turn of turns) {
    for (const piece of pieces(turn, maxChars)) {
      if (buf.length && chunkChars(buf) + piece.text.length + 1 > maxChars) {
        chunks.push(buf);
        buf = [];
      }
      buf.push(piece);
    }
  }
  if (buf.length) chunks.push(buf);
  return chunks;
}
