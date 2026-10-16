// Parses podcast/scripts/<slug>.md into speaker turns. Format is described in podcast/STYLE.md.

const TURN = /^([AB]):\s*(.*)$/;
const SECTION = /^<!--\s*section:\s*(.+?)\s*-->$/;
const COMMENT = /^<!--.*-->$/;

export function parseScript(md) {
  const turns = [];
  let section = null;
  let current = null;
  let currentLine = 0;

  const close = () => {
    if (!current) return;
    if (!current.text) throw new Error(`Empty turn at line ${currentLine}`);
    turns.push(current);
    current = null;
  };

  md.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    const sectionMatch = line.match(SECTION);
    if (sectionMatch) {
      close();
      section = sectionMatch[1];
      return;
    }
    if (COMMENT.test(line)) return;
    if (!line) {
      close();
      return;
    }
    const turnMatch = line.match(TURN);
    if (turnMatch) {
      close();
      current = { speaker: turnMatch[1], text: turnMatch[2].trim(), section };
      currentLine = i + 1;
      return;
    }
    if (!current) throw new Error(`Text outside a turn at line ${i + 1}: "${line.slice(0, 40)}"`);
    current.text = current.text ? `${current.text} ${line}` : line;
  });
  close();
  return turns;
}

export const speakerTag = (speaker) => `<|speaker:${speaker === 'A' ? 0 : 1}|>`;

export function toFishText(turns) {
  return turns.map((t) => speakerTag(t.speaker) + t.text).join('\n');
}
