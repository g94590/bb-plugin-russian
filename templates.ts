import { DICTIONARY } from './dictionary';

/** Translate surrounding UI prose locally; variables never leave the window. */
export function translateTemplate(text: string, names: Set<string>): string | null {
  let m = text.match(/^(Enable|Disable|Install|Uninstall|Update|Reload|Configure) (.+)$/);
  if (m && names.has(m[2]!)) {
    const verbs: Record<string, string> = { Enable: 'Включить', Disable: 'Отключить', Install: 'Установить', Uninstall: 'Удалить', Update: 'Обновить', Reload: 'Перезагрузить', Configure: 'Настроить' };
    return `${verbs[m[1]!]} ${m[2]}`;
  }
  m = text.match(/^Open (.+) details$/);
  if (m && names.has(m[1]!)) return `Открыть сведения: ${m[1]}`;
  m = text.match(/^(.+)'s GitHub avatar$/);
  if (m && names.has(m[1]!)) return `Аватар ${m[1]} на GitHub`;
  m = text.match(/^(\d+) updates? available$/);
  if (m) return `Доступные обновления: ${m[1]}`;
  m = text.match(/^(.+) installed — (.+)$/);
  if (m && names.has(m[1]!)) {
    const label = DICTIONARY[m[2]!];
    const count = m[2]!.match(/^([\d\s,.]+) installs?$/);
    if (label || count) return `${m[1]} установлен — ${label ?? `установок: ${count![1]}`}`;
  }
  m = text.match(/^Filter plugins by (category|source): (.+)$/);
  if (m && DICTIONARY[m[2]!]) return `${m[1] === 'category' ? 'Категория' : 'Источник'}: ${DICTIONARY[m[2]!]}`;
  m = text.match(/^(Sort|Project|Model|Provider): (.+)$/);
  if (m && (DICTIONARY[m[2]!] || names.has(m[2]!))) return `${DICTIONARY[m[1]!] ?? m[1]}: ${DICTIONARY[m[2]!] ?? m[2]}`;
  m = text.match(/^(Expand|Collapse) (.+) section$/);
  if (m && (names.has(m[2]!) || m[2] === 'Pinned')) return `${m[1] === 'Expand' ? 'Развернуть' : 'Свернуть'} раздел ${DICTIONARY[m[2]!] ?? m[2]}`;
  m = text.match(/^New thread in (.+)$/);
  if (m && (names.has(m[1]!) || m[1] === 'Pinned')) return `Новый диалог в ${DICTIONARY[m[1]!] ?? m[1]}`;
  m = text.match(/^(.+) actions$/);
  if (m && (names.has(m[1]!) || m[1] === 'Pinned')) return `Действия: ${DICTIONARY[m[1]!] ?? m[1]}`;
  return null;
}
