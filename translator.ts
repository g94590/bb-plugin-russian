import { protect, normalize, isProse, letterId } from './policy';
import { inlineMarkers, decodeInline } from './inline';

export type Fetcher = typeof fetch;
export class TranslationUnavailable extends Error {}

/** Unofficial public Google Translate endpoints: no key, no paid subscription. */
export async function machineTranslate(texts: string[], names: Set<string>, signal: AbortSignal, fetcher: Fetcher = fetch): Promise<Array<string | null>> {
  if (!texts.length) return [];
  const protectedTexts = texts.map(text => protect(text, names));
  const separators = texts.slice(1).map((_, i) => `__BB_SPLIT_${letterId(i)}__`);
  const source = protectedTexts.map((part, i) => (i ? `\n${separators[i - 1]}\n` : '') + part.masked).join('');
  let translated: string | undefined;
  for (const host of ['translate.google.ru', 'translate.googleapis.com', 'translate.google.com']) {
    if (signal.aborted) throw new TranslationUnavailable('Перевод отменён.');
    try {
      const url = new URL(`https://${host}/translate_a/single`);
      url.search = new URLSearchParams({ client: 'gtx', sl: 'en', tl: 'ru', dt: 't', q: source }).toString();
      const response = await fetcher(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
      if (!response.ok) continue;
      const result: unknown = await response.json();
      if (!Array.isArray(result) || !Array.isArray(result[0])) continue;
      const segments = result[0] as unknown[];
      if (!segments.every(s => Array.isArray(s) && typeof s[0] === 'string')) continue;
      translated = segments.map(s => (s as string[])[0]).join('');
      break;
    } catch { if (signal.aborted) break; }
  }
  if (translated === undefined) throw new TranslationUnavailable('Сервис машинного перевода недоступен. Исходный текст сохранён; повтор будет автоматическим.');
  let parts = [translated];
  for (const separator of separators) parts = parts.flatMap(part => part.split(separator));
  if (parts.length !== texts.length) throw new TranslationUnavailable('Сервис изменил разделители текста; перевод не применён.');
  return parts.map((part, i) => {
    const restored = protectedTexts[i]!.restore(part.trim());
    if (restored === null || (!/[А-Яа-яЁё]/.test(restored) && isProse(texts[i]!, names))) {
      return null;
    }
    const markers = inlineMarkers(texts[i]!);
    if (markers.length && !decodeInline(restored, markers)) return null;
    return normalize(restored);
  });
}

export function groupsOf(texts: string[], maxChars = 2800): string[][] {
  const groups: string[][] = [];
  for (const text of texts) {
    const group = groups.at(-1);
    if (!group || group.length >= 16 || group.join('').length + text.length + group.length * 40 > maxChars) groups.push([text]);
    else group.push(text);
  }
  return groups;
}
