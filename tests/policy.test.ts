import test from 'node:test';
import assert from 'node:assert/strict';
import { nameSet, isProse, protect } from '../policy';
import { machineTranslate, groupsOf } from '../translator';

test('names, paths, commands and flags stay byte-identical inside translated prose', () => {
  const source = 'Use Claude Code with `bb plugin update --all` in /tmp/demo.ts and set OPENAI_API_KEY. See https://getbb.app and use --json.';
  const p = protect(source, nameSet(['Claude Code']));
  const restored = p.restore('Перевод: ' + p.masked);
  assert.equal(restored, 'Перевод: ' + source);
  assert.equal(p.restore(p.masked.replace('__BB_KEEP_A__', 'изменено')), null);
});
test('R2: unquoted commands and paths with spaces are protected completely', () => {
  for (const [source, fragment] of [
    ['Run bb notify to send a notification.', 'bb notify'],
    ['Run git status --short to inspect changes.', 'git status --short'],
    ['Open /Users/Shared/My Project/README.md for instructions.', '/Users/Shared/My Project/README.md'],
    ['Run bb plugin update --all to update.', 'bb plugin update --all'],
  ]) {
    const p = protect(source!, nameSet([]));
    assert.equal(p.masked, source!.replace(fragment!, '__BB_KEEP_A__'), source); assert.equal(p.restore(p.masked), source);
  }
});
test('R2: ordinary bb thread prose is not swallowed by command protection', () => {
  const p = protect('Sends a notification when a bb thread finishes or fails, plus a bb notify command.', nameSet([]));
  assert.ok(p.masked.includes('thread finishes or fails'));
  assert.ok(!p.masked.includes('bb notify'));
  const homepage = protect('Ranks the top threads that need you on the bb homepage: errors, pending input, and unread finished turns, most urgent first.', nameSet([]));
  assert.ok(homepage.masked.includes('homepage: errors'));
});
test('ordinary hyphenated prose is translated, while identifiers remain protected', () => {
  const p = protect('Read read-only files with one-shot jobs and config_value.', nameSet([]));
  assert.ok(p.masked.includes('read-only'));
  assert.ok(p.masked.includes('one-shot'));
  assert.ok(!p.masked.includes('config_value'));
});
test('standalone identifiers and names never become translation candidates', () => {
  const names = nameSet(['Account Pooler [Experimental]']);
  for (const source of ['Account Pooler', 'Codex', 'gpt-6.1', '/tmp/test', 'bb plugin list', 'https://example.com']) assert.equal(isProse(source, names), false, source);
  assert.equal(isProse('Inspect machine storage and old threads.', names), true);
  assert.equal(isProse('Автоматически переводить новые описания через Google Translate', names), false);
});
test('template URLs and plain BB invocations are preserved as complete fragments', () => {
  const p = protect('Run bb plugin update --all to update. Open https://<label>.next.<your bb account\'s domain> for access.', nameSet([]));
  assert.ok(!p.masked.includes('plugin update'));
  assert.ok(!p.masked.includes('account'));
  assert.ok(p.masked.includes('to update'));
  assert.ok(p.restore(p.masked)!.includes('https://<label>.next.<your bb account\'s domain>'));
});
test('machine response preserves protected names and batch order', async () => {
  const fetcher = async (url: string | URL) => {
    const source = new URL(url).searchParams.get('q')!;
    return new Response(JSON.stringify([[[source.replace('Use ', 'Используйте ').replace('Install ', 'Установите '), '', null]]]));
  };
  const actual = await machineTranslate(['Use Claude Code.', 'Install Codex.'], nameSet([]), new AbortController().signal, fetcher as typeof fetch);
  assert.deepEqual(actual, ['Используйте Claude Code.', 'Установите Codex.']);
});
test('bad placeholders and offline endpoints fail without invented translations', async () => {
  await assert.rejects(machineTranslate(['Use Claude Code.'], nameSet([]), new AbortController().signal, (async () => new Response('offline', {status:503})) as typeof fetch), /недоступен/);
  assert.deepEqual(await machineTranslate(['Use Claude Code.'], nameSet([]), new AbortController().signal, (async () => new Response(JSON.stringify([[['Используйте Клод.']]]))) as typeof fetch), [null]);
});
test('network batches are bounded', () => { assert.ok(groupsOf(Array(100).fill('a'.repeat(300))).every(g => g.length <= 16 && g.join('').length <= 2800)); });
test('a failed item does not discard valid translations in the same batch', async () => {
  const result = await machineTranslate(['Use Claude Code.', 'Inspect installed extensions.'], nameSet([]), new AbortController().signal,
    (async () => new Response(JSON.stringify([[['Изменённое название.\n__BB_SPLIT_A__\nПросмотр установленных расширений.']]]))) as typeof fetch);
  assert.deepEqual(result, [null, 'Просмотр установленных расширений.']);
});
