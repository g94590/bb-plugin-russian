import test from 'node:test';
import assert from 'node:assert/strict';
import { inlineMarkers, decodeInline } from '../inline';
import { machineTranslate } from '../translator';
import { nameSet } from '../policy';
test('inline decoding rejects reordered markers, injected text and changed fixed slots', () => {
  const markers = inlineMarkers('__BB_NODE_A__Run __BB_FIXED_B____BB_NODE_C__ safely.__BB_NODE_D__');
  assert.deepEqual(decodeInline('__BB_NODE_A__Запустите __BB_FIXED_B____BB_NODE_C__ безопасно.__BB_NODE_D__', markers), ['Запустите ', '', ' безопасно.']);
  assert.equal(decodeInline('Чужой текст __BB_NODE_A__Запустите __BB_FIXED_B____BB_NODE_C__ безопасно.__BB_NODE_D__', markers), null);
  assert.equal(decodeInline('__BB_NODE_A__Запустите __BB_FIXED_B__изменённый код__BB_NODE_C__ безопасно.__BB_NODE_D__', markers), null);
  assert.equal(decodeInline('__BB_NODE_C__безопасно __BB_NODE_A__Запустите __BB_FIXED_B____BB_NODE_D__', markers), null);
});
test('the translation boundary rejects an external response that rearranges DOM slots', async () => {
  const source = '__BB_NODE_A__Read __BB_NODE_B__files.__BB_NODE_C__';
  const result = await machineTranslate([source], nameSet([]), new AbortController().signal,
    (async () => new Response(JSON.stringify([[['__BB_KEEP_B__Файлы __BB_KEEP_A__прочитайте.__BB_KEEP_C__']]]))) as typeof fetch);
  assert.deepEqual(result, [null]);
});
