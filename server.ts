import { createHash } from 'node:crypto';
import { defineRpcContract, defineCli, cliCommand, type BbPluginApi } from '@get-bb/plugin-sdk';
import { z } from 'zod';
import { DICTIONARY } from './dictionary';
import { BASE_NAMES, nameSet, normalize, isProse, POLICY_VERSION, preservesFragments } from './policy';
import { machineTranslate, groupsOf } from './translator';

const statsSchema = z.object({ enabled: z.boolean(), online: z.boolean(), dictionary: z.number(), cached: z.number(), lastError: z.string().nullable(), retryAt: z.number(), engine: z.string() });
const clientStatsSchema = z.object({ translated: z.number().int().nonnegative(), pending: z.number().int().nonnegative(), missing: z.number().int().nonnegative(), active: z.boolean() });
export const rpcContract = defineRpcContract({
  bootstrap: { input: z.null(), output: z.object({ names: z.array(z.string()), dictionary: z.record(z.string(), z.string()), enabled: z.boolean(), online: z.boolean() }) },
  translate: { input: z.object({ texts: z.array(z.string().min(1).max(2400)).max(40) }).strict(), output: z.object({ translations: z.record(z.string(), z.string()), retryAt: z.number(), error: z.string().nullable() }) },
  status: { input: z.null(), output: statsSchema },
  report: { input: clientStatsSchema, output: z.object({ ok: z.literal(true) }) },
});

export default function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    enabled: { type: 'boolean', label: 'Русификация интерфейса', default: true },
    online: { type: 'boolean', label: 'Автоматически переводить новые описания через Google Translate', default: true },
    preserve: { type: 'string', label: 'Дополнительные названия, которые нужно сохранить (по одному в строке)', experimental_multiline: true, default: '', experimental_schema: z.string().max(10000) },
  });
  const db = bb.storage.database();
  bb.storage.migrate(db, [
    'CREATE TABLE translations (source TEXT NOT NULL, glossary TEXT NOT NULL, translation TEXT NOT NULL, accessed_at INTEGER NOT NULL, PRIMARY KEY (source, glossary))',
  ]);
  const read = db.prepare('SELECT translation FROM translations WHERE source = ? AND glossary = ?');
  const write = db.prepare('INSERT INTO translations(source, glossary, translation, accessed_at) VALUES (?, ?, ?, ?) ON CONFLICT(source, glossary) DO UPDATE SET translation = excluded.translation, accessed_at = excluded.accessed_at');
  const lifecycle = new AbortController();
  let network = new AbortController();
  const cancelNetwork = () => { network.abort(); network = new AbortController(); };
  bb.onDispose(() => { lifecycle.abort(); network.abort(); });
  let names = nameSet(BASE_NAMES);
  let glossary = '';
  let namesAt = 0;
  let refreshing: Promise<void> | null = null;
  const feeds: Set<string>[] = Array.from({ length: 5 }, () => new Set<string>());
  let lastError: string | null = null;
  let retryAt = 0;
  let tail = Promise.resolve();
  let clients: Array<{ at: number; stats: z.infer<typeof clientStatsSchema> }> = [];
  async function refreshNames() {
    if (Date.now() - namesAt < 60000) return;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      // Public SDK only. No changes to other plugins or their manifests.
      const sources = await Promise.allSettled([
        bb.sdk.plugins.list(), bb.sdk.plugins.catalog.search({ query: '' }), bb.sdk.providers.list(), bb.sdk.projects.list(), bb.sdk.hosts.list(),
      ]);
      const installed = sources[0];
      if (installed.status === 'fulfilled') {
        feeds[0] = new Set();
        for (const p of installed.value.plugins) { if (p.name) { feeds[0]!.add(p.name); feeds[0]!.add(p.name.replace(/\s*\[[^\]]+\]$/, '')); } feeds[0]!.add(p.id); }
      }
      const catalog = sources[1];
      if (catalog.status === 'fulfilled') { feeds[1] = new Set(); for (const p of catalog.value.results) {
        feeds[1]!.add(p.displayName); feeds[1]!.add(p.displayName.replace(/\s*\[[^\]]+\]$/, ''));
        if (p.author?.name) feeds[1]!.add(p.author.name);
      }
      }
      const providers = sources[2];
      if (providers.status === 'fulfilled') feeds[2] = new Set(providers.value.map(p => p.displayName));
      const projects = sources[3];
      if (projects.status === 'fulfilled') feeds[3] = new Set(projects.value.map(p => p.name));
      const hosts = sources[4];
      if (hosts.status === 'fulfilled') feeds[4] = new Set(hosts.value.map(h => h.name));
      // Retain only the unavailable metadata feed, never removed custom exceptions.
      const values = await settings.get();
      const next = nameSet(values.preserve.split('\n'));
      for (const feed of feeds) for (const name of feed) next.add(name);
      names = next;
      const nextGlossary = createHash('sha256').update(POLICY_VERSION + '\n' + [...names].sort().join('\n')).digest('hex').slice(0, 16);
      if (glossary && glossary !== nextGlossary) cancelNetwork();
      glossary = nextGlossary;
      namesAt = Date.now();
    })().finally(() => { refreshing = null; });
    return refreshing;
  }
  settings.onChange((next, previous) => {
    if (!next.online || !next.enabled || next.preserve !== previous.preserve) cancelNetwork();
    namesAt = 0; bb.realtime.publish('configuration', {});
  });
  const status = async () => {
    const s = await settings.get();
    return { enabled: s.enabled, online: s.online, dictionary: Object.keys(DICTIONARY).length, cached: (db.prepare('SELECT COUNT(*) AS n FROM translations').get() as { n: number }).n, lastError, retryAt, engine: 'Google Translate (машинный перевод)' };
  };
  async function translate(input: { texts: string[] }) {
    const result: Record<string, string> = {};
    const s = await settings.get();
    if (!s.enabled || lifecycle.signal.aborted) return { translations: result, retryAt: 0, error: null };
    await refreshNames();
    const requestNames = names;
    const requestGlossary = glossary;
    const signal = AbortSignal.any([lifecycle.signal, network.signal]);
    const missing = new Set<string>();
    for (const raw of input.texts) {
      const source = normalize(raw);
      if (requestNames.has(source)) continue;
      if (Object.hasOwn(DICTIONARY, source) && preservesFragments(source, DICTIONARY[source]!, requestNames)) { result[source] = DICTIONARY[source]!; continue; }
      const cached = read.get(source, requestGlossary) as { translation: string } | undefined;
      if (cached) result[source] = cached.translation;
      else if (isProse(source, requestNames)) missing.add(source);
    }
    if (missing.size && s.online && retryAt <= Date.now()) {
      // Serialize network work across all windows and clients; recheck cache inside the queue.
      const work = tail.then(async () => {
        if (signal.aborted || retryAt > Date.now() || !(await settings.get()).online) return;
        const uncached = [...missing].filter(text => {
          const hit = read.get(text, requestGlossary) as { translation: string } | undefined;
          if (hit) result[text] = hit.translation;
          return !hit;
        });
        for (const group of groupsOf(uncached)) {
          const current = await settings.get();
          if (signal.aborted || !current.enabled || !current.online) return;
          try {
            const outputs = await machineTranslate(group, requestNames, signal);
            if (signal.aborted || glossary !== requestGlossary) return;
            db.transaction(() => group.forEach((text, i) => { const output = outputs[i]; if (output) { write.run(text, requestGlossary, output, Date.now()); result[text] = output; } }))();
            lastError = outputs.some(output => output === null) ? 'Часть переводов отклонена для сохранения названий. Остальные тексты переведены; повтор будет автоматическим.' : null;
            retryAt = 0;
          } catch (cause) {
            if (signal.aborted) return;
            lastError = cause instanceof Error ? cause.message : 'Ошибка машинного перевода.';
            retryAt = Date.now() + 60000;
            bb.log.warn(lastError);
            break;
          }
        }
        // Bound the persistent cache without ever touching user files or core BB data.
        db.prepare('DELETE FROM translations WHERE rowid IN (SELECT rowid FROM translations ORDER BY accessed_at DESC LIMIT -1 OFFSET 20000)').run();
      });
      tail = work.catch(() => {});
      await work;
    }
    return { translations: result, retryAt, error: lastError };
  }
  bb.rpc.register(rpcContract, {
    bootstrap: async () => { await refreshNames(); const s = await settings.get(); return { names: [...names], dictionary: DICTIONARY, enabled: s.enabled, online: s.online }; },
    translate, status,
    report: stats => { clients = clients.filter(c => Date.now() - c.at < 120000).slice(-9); clients.push({ at: Date.now(), stats }); return { ok: true as const }; },
  });
  bb.cli.register(defineCli({ name: 'russian', summary: 'Русификация описаний и пояснений BB с сохранением названий и команд', commands: {
    status: cliCommand({ summary: 'Показать состояние русификации', options: { json: { type: 'boolean', description: 'Вывести JSON' } }, async run(input) {
      const s = await status();
      return { exitCode: 0, stdout: input.options.json ? JSON.stringify({ ...s, recentWindows: clients.filter(c => Date.now() - c.at < 120000) }) : `Русификация: ${s.enabled ? 'включена' : 'выключена'}\nНовые описания: ${s.online ? 'переводятся автоматически' : 'только локальный словарь и кеш'}\nЛокальный словарь: ${s.dictionary}\nКеш переводов: ${s.cached}\n${s.lastError ?? 'Ошибок перевода не зарегистрировано.'}` };
    }}),
    enable: cliCommand({ summary: 'Включить русификацию', async run() { await settings.experimental_set({ enabled: true }); return { exitCode: 0, stdout: 'Русификация включена.' }; } }),
    disable: cliCommand({ summary: 'Выключить русификацию и вернуть оригиналы', async run() { await settings.experimental_set({ enabled: false }); return { exitCode: 0, stdout: 'Русификация выключена. Оригиналы восстанавливаются в открытых окнах.' }; } }),
    translate: cliCommand({ summary: 'Проверить перевод текста интерфейса', positionals: [{ name: 'text', description: 'Текст описания, заключённый в кавычки', required: true }], async run(input) { const result = await translate({ texts: [input.positionals.text] }); return { exitCode: result.error ? 1 : 0, stdout: JSON.stringify(result) }; } }),
  }}));
}
