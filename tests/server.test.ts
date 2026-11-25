import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createFakePluginHost, experimental_scanPublicSdkOnly } from '@get-bb/plugin-sdk/testing';
import plugin from '../server';
import { POLICY_VERSION } from '../policy';
test('RPC and CLI use public SDK and a real temporary SQLite database', async () => {
  const { bb, harness } = createFakePluginHost({ pluginId: 'russian', settings: { online: false }, sdk: {
    plugins: { list: async () => ({ plugins: [{ id: 'bb-account', name: 'bb account', cliCommand: { name: 'account', summary: 'Account settings' } }] }), catalog: { search: async () => ({ results: [{ displayName: 'Save', author: {name:'Demo Author'} }], collections: [], categories: [] }) } },
    providers: { list: async () => [] },
    projects: { list: async () => [] }, hosts: { list: async () => [] },
  }});
  try {
    plugin(bb);
    const boot = await harness.behavior.callRpc('bootstrap', null) as any;
    assert.ok(boot.names.includes('Save')); assert.ok(boot.names.includes('Demo Author'));
    assert.ok(boot.names.includes('bb account')); assert.ok(!boot.names.includes('account'), 'CLI command roots must not turn ordinary prose words into protected product names');
    const result = await harness.behavior.callRpc('translate', {texts: ['Save', 'Cancel', 'An uncached explanatory text.']}) as any;
    assert.deepEqual(result.translations, { Cancel: 'Отмена' });
    const glossary = createHash('sha256').update(POLICY_VERSION + '\n' + [...boot.names].sort().join('\n')).digest('hex').slice(0, 16);
    bb.storage.database().prepare('INSERT INTO translations VALUES (?, ?, ?, ?)').run('Read archived files automatically.', glossary, 'Автоматически читает архивные файлы.', Date.now());
    const offline = await harness.behavior.callRpc('translate', {texts: ['Read archived files automatically.']}) as any;
    assert.deepEqual(offline.translations, { 'Read archived files automatically.': 'Автоматически читает архивные файлы.' });
    const legacy = createHash('sha256').update([...boot.names].sort().join('\n')).digest('hex').slice(0, 16);
    bb.storage.database().prepare('INSERT INTO translations VALUES (?, ?, ?, ?)').run('Run git status to inspect changes.', legacy, 'Запустите статус для проверки.', Date.now());
    const oldCache = await harness.behavior.callRpc('translate', {texts: ['Run git status to inspect changes.']}) as any;
    assert.deepEqual(oldCache.translations, {});
    await harness.behavior.setSettings({ preserve: 'Exact Extra Name' });
    assert.ok(((await harness.behavior.callRpc('bootstrap', null)) as any).names.includes('Exact Extra Name'));
    await harness.behavior.setSettings({ preserve: '' });
    assert.ok(!((await harness.behavior.callRpc('bootstrap', null)) as any).names.includes('Exact Extra Name'));
    const disabled = await harness.behavior.runCli(['disable']); assert.equal(disabled.exitCode, 0);
    const status = await harness.behavior.callRpc('status', null) as any; assert.equal(status.enabled, false);
    const translated = await harness.behavior.callRpc('translate', { texts: ['Cancel'] }) as any; assert.deepEqual(translated.translations, {});
    assert.equal((await harness.behavior.runCli(['enable'])).exitCode, 0);
    assert.equal((await harness.behavior.runCli(['status', '--json'])).exitCode, 0);
    await assert.rejects(harness.behavior.callRpc('translate', {texts: Array(41).fill('text')}));
  } finally { await harness.lifecycle.dispose(); }
});
test('R3: switching online off during a request prevents subsequent batch requests', async () => {
  const { bb, harness } = createFakePluginHost({ pluginId: 'russian', settings: { online: true }, sdk: {
    plugins: { list: async () => ({ plugins: [] }), catalog: { search: async () => ({ results: [], collections: [], categories: [] }) } },
    providers: { list: async () => [] }, projects: { list: async () => [] }, hosts: { list: async () => [] },
  }});
  let calls = 0, release!: () => void, firstSignal: AbortSignal | null | undefined;
  const gate = new Promise<void>(resolve => { release = resolve; }); const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls++; if (calls === 1) { firstSignal = init?.signal; await gate; } return new Response(JSON.stringify([[['Перевод ' + new URL(String(url)).searchParams.get('q')]]])); };
  try {
    plugin(bb);
    const task = harness.behavior.callRpc('translate', { texts: [('Inspect the current file history. ').repeat(55), ('Read the archived project history. ').repeat(55)] });
    for (let i = 0; i < 100 && !calls; i++) await new Promise(r => setTimeout(r, 10));
    assert.equal(calls, 1); await harness.behavior.setSettings({ online: false }); release(); await task;
    assert.equal(calls, 1);
    assert.equal(firstSignal?.aborted, true);
  } finally { release(); globalThis.fetch = originalFetch; await harness.lifecycle.dispose(); }
});
test('plugin imports only public SDK contracts', async () => {
  const result = await experimental_scanPublicSdkOnly(fileURLToPath(new URL('..', import.meta.url)), { allow: [/^react$/, /^jsdom$/] });
  assert.deepEqual(result.violations, []); assert.deepEqual(result.privateDependencies, []);
});
