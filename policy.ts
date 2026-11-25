/** Exact names and executable fragments are never translated. Shared by both sides. */
export const BASE_NAMES = [
  'BB', 'bb', 'Russian', 'Claude', 'Claude Code', 'Codex', 'OpenAI', 'Anthropic',
  'Grok', 'Cursor', 'opencode', 'Pi', 'Gemini', 'GitHub', 'GitLab', 'Google',
  'Telegram', 'Microsoft', 'macOS', 'Windows', 'Linux', 'Ubuntu', 'Beget',
  'React', 'TypeScript', 'JavaScript', 'Python', 'Node.js', 'Monaco', 'Docker',
  'Supabase', 'Notion', 'MCP', 'ACP', 'API', 'CLI', 'SDK', 'JSON', 'HTML',
  'CSS', 'HTTP', 'HTTPS', 'SSH', 'FTP', 'SFTP', 'OAuth', 'URL', 'PDF', 'SQLite',
  'BB Official', 'BB Community', 'GPT', 'Suno', 'Salesfocus', 'SalesFocus',
  'ChatGPT', 'Markdown', 'Browser', 'Tasks', 'Diff',
];
export function normalize(text: string): string { return text.replace(/\s+/gu, ' ').trim(); }
export function nameSet(names: Iterable<string>): Set<string> {
  const result = new Set(BASE_NAMES);
  for (const name of names) {
    if (!name || name.length > 200) continue;
    result.add(normalize(name));
    result.add(normalize(name.replace(/\s*\[[^\]]+\]$/, '')));
  }
  return result;
}
export function isProse(text: string, names: Set<string>): boolean {
  const s = normalize(text);
  // Russian explanations often contain English brand names. Never retranslate them.
  if (/[А-Яа-яЁё]/u.test(s)) return false;
  if (s.length < 3 || s.length > 2400 || !/[A-Za-z]{2}/.test(s) || names.has(s)) return false;
  // A single identifier, invocation, path, address or model is a name, not prose.
  if (/^(?:https?:\/\/|[~/.]|(?:bb|git|npm|npx|ssh|scp|curl|node|python3?)\s)/.test(s)) return false;
  if (/^[\w@./:+\-]+$/.test(s) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return false;
  return /[A-Za-z]{2,}[\s,;:!?]/.test(s) || /\s[A-Za-z]{2,}/.test(s);
}
function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function letterId(index: number): string {
  let result = '';
  do { result = String.fromCharCode(65 + index % 26) + result; index = Math.floor(index / 26) - 1; } while (index >= 0);
  return result;
}
/** Increment when protection or DOM marker semantics change; old translations stay isolated. */
export const POLICY_VERSION = 'russian-0.2.0-3';

function commandFragments(text: string, names: Set<string>): string[] {
  const stop = 'to|and|or|for|with|on|in|from|then|after|before|command|commands|tool|tools|print|prints|finishes|fails|needs|requires|becomes|is|are|was|which|when|while|that|the|a|an';
  const args = String.raw`(?:--?[\w-]+(?:=[^\s,;]+)?|<[^>]+>|"[^"\n]*"|'[^'\n]*'|[~/.@\w:-]+)`;
  const re = new RegExp(String.raw`\b(bb|git|npm|npx|pnpm|yarn|ssh|scp|curl|node|python3?|docker|kubectl)\s+([a-z][\w-]*)(?:[ \t]+(?!(?:${stop})\b)${args}){0,8}`, 'g');
  const result: string[] = [];
  const bbRoots = new Set(['plugin', 'russian', 'thread', 'machine', 'guide', 'settings', 'browser', 'browser-automation', 'env-catalog', 'file', 'workflows', 'automation', 'status', ...[...names].filter(name => /^[a-z][a-z0-9-]*$/.test(name))]);
  for (const match of text.matchAll(re)) {
    if (match[1] === 'bb') {
      if (/^(?:becomes|uses|supports|is|are|has|can|will|runs|keeps|turns|app|projects|threads|files|machines)$/.test(match[2]!)) continue;
      const before = text.slice(0, match.index).trimEnd();
      const after = text.slice(match.index! + match[0].length).trimStart();
      const invocationContext = /\b(?:run|runs|execute|use|using|via|through|with|command|type|enter)[\s"']*$/i.test(before) || /^commands?\b/.test(after);
      if (!bbRoots.has(match[2]!) && !invocationContext) continue;
      if (/^(?:thread|file|machine|project)$/.test(match[2]!) &&
          (/\b(?:a|an|the|this|each|every|your|my)$/i.test(before) || /^(?:finishes|fails|needs|runs|is|can)\b/.test(after))) continue;
    }
    result.push(match[0]);
  }
  return result;
}

export function protect(text: string, names: Set<string>): { masked: string; fragments: readonly string[]; restore: (translated: string) => string | null } {
  const values: string[] = [];
  const add = (value: string) => { const token = `__BB_KEEP_${letterId(values.length)}__`; values.push(value); return token; };
  const named = [...new Set([...names, ...commandFragments(text, names)])].filter(Boolean).sort((a, b) => b.length - a.length).map(escapeRegex).join('|');
  const path = String.raw`(?:[~/]|[A-Za-z]:\\)[^\s\x60"'<>;,!?]+(?:[ \t]+(?!(?:for|to|with|and|or|in|on|from|using|is|are|can|at|of)\b)[^\s\x60"'<>;,!?]+)*`;
  // Long exact fragments go first: a command or path must not become several markers.
  const re = new RegExp([
    String.raw`\x60[^\x60]+\x60`,
    String.raw`https?://(?:<[^>]*>|[^\s<>])+`,
    String.raw`__BB_(?:NODE|FIXED)_[A-Z]+__`,
    String.raw`(?<![\p{L}\p{N}_])(?:${named})(?![\p{L}\p{N}_])`,
    path,
    String.raw`\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b`,
    String.raw`--[A-Za-z][\w-]*(?:=[^\s,;]+)?`,
    String.raw`\b(?:gpt|claude|gemini|grok|codex)[-\w.]*\d[-\w.]*\b`,
    String.raw`\b[\w.-]+\.(?:md|tsx?|jsx?|json|ya?ml|toml|py|sh|csv|txt|html|css|sql)\b`,
    String.raw`\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b`,
    String.raw`\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b`,
  ].join('|'), 'gu');
  const masked = text.replace(re, add);
  return { masked, fragments: values, restore(translated) {
    let result = translated;
    for (let i = 0; i < values.length; i++) {
      const token = `__BB_KEEP_${letterId(i)}__`;
      if (result.split(token).length !== 2) return null;
      result = result.replace(token, () => values[i]!);
    }
    return /__BB_KEEP_/i.test(result) ? null : result;
  }};
}
/** The built-in dictionary must obey the same current exceptions as machine output. */
export function preservesFragments(source: string, translation: string, names: Set<string>): boolean {
  const required = new Map<string, number>();
  for (const fragment of protect(source, names).fragments) required.set(fragment, (required.get(fragment) ?? 0) + 1);
  for (const [fragment, count] of required) if (translation.split(fragment).length - 1 < count) return false;
  return true;
}
