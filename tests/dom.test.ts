import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { RussianDOM, type Transport } from '../dom';
import { DICTIONARY } from '../dictionary';
const wait = (ms = 350) => new Promise(resolve => setTimeout(resolve, ms));
function fixture(html: string, overrides: Partial<Transport> = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost/settings/plugins/russian' });
  const calls: string[][] = [];
  let enabled = true;
  const controller = new RussianDOM(dom.window.document);
  const transport: Transport = {
    bootstrap: async () => ({ names: ['Custom Named Plugin'], dictionary: DICTIONARY, enabled, online: true }),
    translate: async texts => { calls.push(texts); return { translations: Object.fromEntries(texts.map(text => [text, `Перевод: ${text}`])), retryAt: 0, error: null }; },
    report: async () => {}, ...overrides,
  };
  return { dom, doc: dom.window.document, controller, transport, calls, disable() { enabled = false; }, close() { controller.dispose(); dom.window.close(); } };
}
test('translates UI descriptions, labels and dynamically inserted tooltips', async () => {
  const f = fixture('<button>Save</button><p>New explanatory text arrives here.</p><h2>Custom Named Plugin</h2>');
  try {
    await f.controller.connect(f.transport); await wait();
    assert.equal(f.doc.querySelector('button')!.textContent, 'Сохранить');
    assert.equal(f.doc.querySelector('h2')!.textContent, 'Custom Named Plugin');
    assert.equal(f.doc.querySelector('p')!.textContent, 'Перевод: New explanatory text arrives here.');
    const tip = f.doc.createElement('div'); tip.setAttribute('role', 'tooltip'); tip.textContent = 'Cancel'; f.doc.body.append(tip);
    await wait(); assert.equal(tip.textContent, 'Отмена');
  } finally { f.close(); }
});
test('R1: explicit opt-outs apply to field attributes and editable roots', async () => {
  const f = fixture('<input translate="no" title="Read archived files automatically."><input data-bb-russian-skip title="Inspect installed extensions automatically."><textarea translate="no" placeholder="Search..."></textarea><div contenteditable="true" data-bb-russian-skip data-placeholder="Ask anything.">Save</div>');
  try {
    await f.controller.connect(f.transport); await wait();
    assert.deepEqual(f.calls, []);
    assert.equal(f.doc.querySelector('input')!.title, 'Read archived files automatically.');
    assert.equal(f.doc.querySelector('textarea')!.placeholder, 'Search...');
    assert.equal(f.doc.querySelector('[contenteditable]')!.getAttribute('data-placeholder'), 'Ask anything.');
  } finally { f.close(); }
});
test('R4: changing protected names invalidates existing and newly reused translations', async () => {
  let names: string[] = [];
  const source = 'Use Memory Explorer to inspect saved memories.';
  const f = fixture(`<p>${source}</p>`, {
    bootstrap: async () => ({ names, dictionary: DICTIONARY, enabled: true, online: true }),
    translate: async () => ({ translations: { [source]: names.length ? 'Используйте Memory Explorer для просмотра воспоминаний.' : 'Используйте Обозреватель памяти для просмотра воспоминаний.' }, retryAt: 0, error: null }),
  });
  try {
    await f.controller.connect(f.transport); await wait();
    assert.match(f.doc.querySelector('p')!.textContent!, /Обозреватель/);
    names = ['Memory Explorer']; await f.controller.configure(); await wait();
    assert.match(f.doc.querySelector('p')!.textContent!, /Memory Explorer/);
    const p = f.doc.createElement('p'); p.textContent = source; f.doc.body.append(p); await wait();
    assert.match(p.textContent!, /Memory Explorer/);
  } finally { f.close(); }
});
test('R4: custom exceptions also override a built-in description translation', async () => {
  const source = 'Run bb threads with Codex.';
  const f = fixture(`<p>${source}</p>`, {
    bootstrap: async () => ({ names: ['threads'], dictionary: DICTIONARY, enabled: true, online: true }),
    translate: async () => ({ translations: { [source]: 'Запускает threads в bb через Codex.' }, retryAt: 0, error: null }),
  });
  try { await f.controller.connect(f.transport); await wait(); assert.match(f.doc.querySelector('p')!.textContent!, /threads/); } finally { f.close(); }
});
test('R5: explanatory font weight must not suppress translation', async () => {
  const f = fixture('<p class="font-medium">Read archived files automatically.</p>');
  try { await f.controller.connect(f.transport); await wait(); assert.deepEqual(f.calls, [['Read archived files automatically.']]); } finally { f.close(); }
});
test('R5: an inline-formatted sentence is one translation; DOM identity and restore survive', async () => {
  const source = 'Read archived files automatically.';
  const f = fixture('<p>Read <strong>archived files</strong> automatically.</p>', { translate: async texts => ({ translations: Object.fromEntries(texts.map(text => [text, text.replace('Read ', 'Прочитайте ').replace('archived files', 'архивные файлы').replace(' automatically.', ' автоматически.')])), retryAt: 0, error: null }) });
  try {
    const strong = f.doc.querySelector('strong')!;
    await f.controller.connect(f.transport); await wait();
    assert.equal(f.doc.querySelector('p')!.textContent, 'Прочитайте архивные файлы автоматически.');
    assert.equal(f.doc.querySelector('strong'), strong); assert.equal(strong.textContent, 'архивные файлы');
    f.controller.dispose(); assert.equal(f.doc.querySelector('p')!.textContent, source);
  } finally { f.close(); }
});
test('R5: links retain identity, href and click handlers; inline code is never sent', async () => {
  const sent: string[] = [];
  const f = fixture('<p>Read <a href="https://getbb.app">archived files</a> automatically.</p><p>Run <code>git status --short</code> to inspect changes.</p>', { translate: async texts => {
    sent.push(...texts);
    return { translations: Object.fromEntries(texts.map(text => [text, text.replace('Read ', 'Прочитайте ').replace('archived files', 'архивные файлы').replace(' automatically.', ' автоматически.').replace('Run ', 'Запустите ').replace(' to inspect changes.', ' для проверки.')])), retryAt: 0, error: null };
  }});
  try {
    const link = f.doc.querySelector('a')!; let clicks = 0; link.addEventListener('click', e => { e.preventDefault(); clicks++; });
    await f.controller.connect(f.transport); await wait();
    assert.equal(f.doc.querySelector('a'), link); assert.equal(link.getAttribute('href'), 'https://getbb.app'); link.click(); assert.equal(clicks, 1);
    assert.equal(f.doc.querySelector('code')!.textContent, 'git status --short'); assert.ok(sent.every(text => !text.includes('git status')));
    assert.equal(f.doc.querySelectorAll('p')[1]!.textContent, 'Запустите git status --short для проверки.');
  } finally { f.close(); }
});
test('R1: an opt-out added while translation is pending rejects the late result', async () => {
  let finish!: (result: any) => void;
  const f = fixture('<input title="Read archived files automatically.">', { translate: () => new Promise(resolve => { finish = resolve; }) });
  try {
    await f.controller.connect(f.transport); await wait();
    const input = f.doc.querySelector('input')!; input.setAttribute('translate', 'no');
    finish({ translations: { 'Read archived files automatically.': 'Автоматически читать архивные файлы.' }, retryAt: 0, error: null });
    await wait(); assert.equal(input.title, 'Read archived files automatically.');
  } finally { f.close(); }
});
test('does not translate or send messages, code, field values, names or terminals', async () => {
  const f = fixture('<div data-timeline-items><p>Private English conversation content.</p><button>Save</button></div><pre>Save</pre><div class="monaco-editor">Save</div><div class="xterm">Save</div><input value="Private English input value"><div contenteditable="true">Save</div><a href="/projects/p/threads/t">Save</a><span translate="no">Save</span>');
  try { await f.controller.connect(f.transport); await wait(); assert.equal(f.calls.length, 0); assert.equal(f.doc.querySelector('pre')!.textContent, 'Save'); assert.equal(f.doc.querySelector('a')!.textContent, 'Save'); assert.equal(f.doc.querySelector('input')!.value, 'Private English input value'); } finally { f.close(); }
});
test('an existing text node changing after an update is translated again; click handlers survive', async () => {
  const f = fixture('<button>Save</button>');
  try {
    const button = f.doc.querySelector('button')!; let clicks = 0; button.addEventListener('click', () => clicks++);
    await f.controller.connect(f.transport); await wait(); button.firstChild!.nodeValue = 'Cancel'; await wait();
    assert.equal(button.textContent, 'Отмена'); button.click(); assert.equal(clicks, 1);
    f.disable(); await f.controller.configure(); assert.equal(button.textContent, 'Cancel');
  } finally { f.close(); }
});
test('disposal restores originals and preserves changes made by the application', async () => {
  const f = fixture('<button title="Save">Save</button><label>Cancel</label>');
  try {
    await f.controller.connect(f.transport); await wait();
    f.doc.querySelector('label')!.textContent = 'Changed by app';
    f.controller.dispose(); assert.equal(f.doc.querySelector('button')!.textContent, 'Save'); assert.equal(f.doc.querySelector('button')!.title, 'Save'); assert.equal(f.doc.querySelector('label')!.textContent, 'Changed by app');
    f.doc.querySelector('button')!.textContent = 'Cancel'; await wait(); assert.equal(f.doc.querySelector('button')!.textContent, 'Cancel');
  } finally { f.close(); }
});
test('late translations never overwrite newer source text or reappear after disposal', async () => {
  let resolve!: (value: any) => void;
  const f = fixture('<p>Original unknown description text.</p>', { translate: () => new Promise(done => { resolve = done; }) });
  try {
    await f.controller.connect(f.transport); await wait(); f.doc.querySelector('p')!.textContent = 'Updated by BB'; f.controller.dispose();
    resolve({ translations: { 'Original unknown description text.': 'Старый перевод' }, retryAt: 0, error: null });
    await wait(); assert.equal(f.doc.querySelector('p')!.textContent, 'Updated by BB');
  } finally { f.close(); }
});
test('editable placeholders translate but editable content and values stay original', async () => {
  const f = fixture('<div contenteditable="true" data-placeholder="Ask anything.">Save</div><textarea placeholder="Search...">Cancel</textarea>');
  try {
    await f.controller.connect(f.transport); await wait();
    assert.equal(f.doc.querySelector('div')!.getAttribute('data-placeholder'), 'Напишите запрос.');
    assert.equal(f.doc.querySelector('div')!.textContent, 'Save');
    assert.equal(f.doc.querySelector('textarea')!.placeholder, 'Поиск…');
    assert.equal(f.doc.querySelector('textarea')!.value, 'Cancel');
  } finally { f.close(); }
});
