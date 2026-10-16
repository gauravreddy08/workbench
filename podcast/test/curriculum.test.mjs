import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonMeta, setLessonAudio } from '../lib/curriculum.mjs';

const src = `export const tracks = [
  {
    lessons: [
      {
        slug: 'waiting',
        title: 'Waiting.',
        question: 'Why wait?',
        why: 'Because "reasons".',
        build: 'x',
      },
      {
        slug: 'waiting-vs-working',
        title: 'Waiting vs working.',
        question: 'What do sync and async actually mean?',
        why: 'Every LLM app waits.',
        build: 'A server that\\'s slow.',
      },
    ],
  },
];
`;

test('inserts audio into the right lesson only', () => {
  const out = setLessonAudio(src, 'waiting-vs-working', 'https://cdn/x.mp3');
  assert.match(out, /build: 'A server that\\'s slow.',\n        audio: 'https:\/\/cdn\/x.mp3',\n      },/);
  assert.equal(out.match(/audio:/g).length, 1);
  assert.ok(out.indexOf('audio:') > out.indexOf("slug: 'waiting-vs-working'"));
});

test('replaces an existing audio value instead of adding another', () => {
  const once = setLessonAudio(src, 'waiting', 'https://cdn/1.mp3');
  const twice = setLessonAudio(once, 'waiting', 'https://cdn/2.mp3');
  assert.equal(twice.match(/audio:/g).length, 1);
  assert.ok(twice.includes("audio: 'https://cdn/2.mp3'"));
});

test('throws for an unknown slug', () => {
  assert.throws(() => setLessonAudio(src, 'nope', 'u'), /nope/);
});

test('reads title, question and why', () => {
  assert.deepEqual(lessonMeta(src, 'waiting-vs-working'), {
    title: 'Waiting vs working.',
    question: 'What do sync and async actually mean?',
    why: 'Every LLM app waits.',
  });
});
