// Groups turns into Fish requests of at most maxChars, cutting only between turns,
// or between sentences when a single turn is too long on its own.

import { speakerTag } from './script.mjs';

function splitSentences(text) {
  return text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g).map((s) => s.trim()).filter(Boolean);
}

// Break one turn into pieces that each fit, keeping the speaker on every piece.
function pieces(turn, maxChars) {
  const tag = speakerTag(turn.speaker);
  if (tag.length + turn.text.length <= maxChars) return [tag + turn.text];
  const out = [];
  let buf = '';
  for (const s of splitSentences(turn.text)) {
    const next = buf ? `${buf} ${s}` : s;
    if (buf && tag.length + next.length > maxChars) {
      out.push(tag + buf);
      buf = s;
    } else {
      buf = next;
    }
  }
  if (buf) out.push(tag + buf);
  return out;
}

export function chunkTurns(turns, maxChars = 2000) {
  const chunks = [];
  let buf = '';
  for (const turn of turns) {
    for (const piece of pieces(turn, maxChars)) {
      const next = buf ? `${buf}\n${piece}` : piece;
      if (buf && next.length > maxChars) {
        chunks.push(buf);
        buf = piece;
      } else {
        buf = next;
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}
