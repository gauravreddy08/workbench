// Small text edits on src/data/curriculum.ts. Lessons there are object literals with single-quoted
// string fields, one per line, closed by a line that is just "}," at the lesson's indent.

const STR = `'((?:[^'\\\\]|\\\\.)*)'`;
const unquote = (s) => s.replace(/\\(.)/g, '$1');
const quote = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function lessonBlock(source, slug) {
  const start = source.indexOf(`slug: '${slug}',`);
  if (start < 0) throw new Error(`Lesson "${slug}" not found in curriculum.ts`);
  const indent = source.slice(source.lastIndexOf('\n', start) + 1, start); // field indent
  const closer = `\n${indent.slice(2)}}`;
  const end = source.indexOf(closer, start);
  return { start, end, indent };
}

export function lessonMeta(source, slug) {
  const { start, end } = lessonBlock(source, slug);
  const block = source.slice(start, end);
  const field = (name) => {
    const m = block.match(new RegExp(`\\n\\s*${name}: ${STR},`));
    return m ? unquote(m[1]) : '';
  };
  return { title: field('title'), question: field('question'), why: field('why') };
}

export function setLessonAudio(source, slug, url) {
  const { start, end, indent } = lessonBlock(source, slug);
  const block = source.slice(start, end);
  const line = `audio: '${quote(url)}',`;
  const existing = new RegExp(`audio: ${STR},`);
  const next = existing.test(block) ? block.replace(existing, line) : `${block}\n${indent}${line}`;
  return source.slice(0, start) + next + source.slice(end);
}
