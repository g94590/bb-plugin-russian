import { DICTIONARY } from './dictionary';
import { nameSet, normalize, isProse, letterId, preservesFragments } from './policy';
import { translateTemplate } from './templates';
import { decodeInline } from './inline';

export type Bootstrap = { names: string[]; dictionary: Record<string, string>; enabled: boolean; online: boolean };
export type BatchResult = { translations: Record<string, string>; retryAt: number; error: string | null };
export type Transport = { bootstrap(): Promise<Bootstrap>; translate(texts: string[]): Promise<BatchResult>; report(stats: LocalStats): Promise<unknown> };
export type LocalStats = { translated: number; pending: number; missing: number; active: boolean };
type RecordState = { original: string; translated: string; key: string };
type InlineRun = { node: Text; original: string; expected: string; fixed: boolean };
type InlineSnapshot = { runs: InlineRun[]; markers: string[] };
type Target = { node: Text | Element; attribute?: string; source: string; key: string; inline?: InlineSnapshot };
const ATTRS = ['title', 'aria-label', 'placeholder', 'data-placeholder', 'aria-description'];
// Verified on BB 0.50 / SDK 0.6.157. New editors can opt out with translate="no".
const EXCLUDED = 'script,style,noscript,code,pre,samp,kbd,textarea,svg,canvas,iframe,webview,[contenteditable]:not([contenteditable="false"]),[role="textbox"],.monaco-editor,.xterm,.cm-editor,[data-message-column],[data-timeline-items],[data-markdown-preview],[data-source-code],[data-diff],[translate="no"],[data-bb-russian-skip]';
const NAMES = '[data-sidebar-thread-id],[data-sidebar-section-id],[data-thread-title],a[href*="/threads/"],a[href*="/projects/"],a[href*="?author="],[data-provider-id],[data-model-id],h1';
const PROSE_STYLE = 'p,small,label,[role="tooltip"],[role="alert"],[role="status"],[aria-describedby],.text-muted-foreground,.text-subtle-foreground';
const INLINE_BLOCK = 'p,small,label,[role="tooltip"],.text-muted-foreground';

export class RussianDOM {
  private textRecords = new Map<Text, RecordState>();
  private attrRecords = new Map<Element, Map<string, RecordState>>();
  private cache = new Map(Object.entries(DICTIONARY));
  private names = nameSet([]);
  private pending = new Map<string, Set<Target>>();
  private retry = new Map<string, number>();
  private dictionary = DICTIONARY;
  private observer: MutationObserver | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private active = false;
  private online = true;
  private disposed = false;
  private revision = 0;
  private bootstrapVersion = 0;
  private flushing = false;
  private transport: Transport | null = null;
  private roots = new Set<Node>();
  private inlineSeen = new Set<Element>();
  private listeners = new Set<() => void>();
  private stats: LocalStats = { translated: 0, pending: 0, missing: 0, active: false };
  constructor(private doc: Document) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getStats = () => this.stats;
  async connect(transport: Transport) {
    this.transport = transport;
    await this.configure();
    if (!this.disposed && !this.refreshTimer) this.refreshTimer = setInterval(() => { void this.configure(); }, 60000);
  }
  async configure() {
    const version = ++this.bootstrapVersion;
    try {
      const config = await this.transport?.bootstrap();
      if (!config || this.disposed || version !== this.bootstrapVersion) return;
      const nextNames = nameSet(config.names);
      const changed = nextNames.size !== this.names.size || [...nextNames].some(name => !this.names.has(name));
      if (changed) {
        if (this.active) this.stop();
        this.cache.clear(); this.retry.clear();
      }
      this.names = nextNames;
      this.dictionary = config.dictionary;
      for (const pair of Object.entries(config.dictionary)) this.cache.set(...pair);
      this.online = config.online;
      if (config.enabled && !this.active) this.start();
      else if (!config.enabled && this.active) this.stop();
      else if (this.active) this.schedule(this.doc.body);
    } catch { /* Keep the current language during a BB disconnection; retry next sync. */ }
  }
  private start() {
    this.active = true; this.revision++;
    const Mutation = this.doc.defaultView!.MutationObserver;
    this.observer = new Mutation(records => {
      for (const record of records) {
        if (record.type === 'childList') for (const node of record.addedNodes) this.roots.add(node);
        else this.roots.add(record.target);
      }
      this.schedule();
    });
    this.observer.observe(this.doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS, 'translate', 'data-bb-russian-skip'] });
    this.schedule(this.doc.body);
  }
  private schedule(root?: Node) {
    if (!this.active || this.disposed) return;
    if (root) this.roots.add(root);
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.scan(); }, 100);
  }
  private read(target: Target) {
    if (target.inline) {
      const current = this.textNodes(target.node as Element);
      return current.length === target.inline.runs.length && target.inline.runs.every((run, i) => current[i] === run.node && run.node.nodeValue === run.expected) ? target.source : null;
    }
    return target.attribute ? (target.node as Element).getAttribute(target.attribute) : target.node.nodeValue;
  }
  private state(target: Target): RecordState | undefined { return target.attribute ? this.attrRecords.get(target.node as Element)?.get(target.attribute) : this.textRecords.get(target.node as Text); }
  private eligible(el: Element, attribute?: string): boolean {
    if (el.closest('[translate="no"],[data-bb-russian-skip]')) return false;
    // Input values never enter the pipeline. Only explanatory attributes do.
    if (attribute && el.matches('input,textarea,[role="textbox"],[contenteditable]')) {
      if (el.matches('input[type="password"],input[type="hidden"]')) return false;
      return !el.parentElement?.closest(EXCLUDED);
    }
    if (el.closest(EXCLUDED)) return false;
    if (el.closest(NAMES) && !el.closest('button')) return false;
    if (!attribute && el.closest('.font-mono')) return false;
    return true;
  }
  private candidate(target: Target) {
    const el = target.attribute ? target.node as Element : target.node.parentElement;
    if (!el || !this.eligible(el, target.attribute)) return;
    if (!target.attribute && !target.inline) {
      const block = el.closest(INLINE_BLOCK);
      if (block && this.inlineCandidate(block)) return;
    }
    const current = this.read(target);
    if (!current || current.length > 5000) return;
    const old = this.state(target);
    if (old && current === old.translated) return;
    target.source = current; target.key = normalize(current);
    if (!target.key || this.names.has(target.key)) return;
    // Translate the explanatory label while leaving the shortcut byte-identical.
    const shortcut = target.key.match(/^(.*?)\s+(\([^)]*[⌘⌥⇧⌃][^)]*\))$/u);
    if (shortcut && Object.hasOwn(this.dictionary, shortcut[1]!)) {
      const text = `${this.dictionary[shortcut[1]!]!} ${shortcut[2]}`;
      if (preservesFragments(target.key, text, this.names)) this.apply(target, text);
      return;
    }
    const templated = translateTemplate(target.key, this.names);
    if (templated) { if (preservesFragments(target.key, templated, this.names)) this.apply(target, templated); return; }
    const local = Object.hasOwn(this.dictionary, target.key);
    if (!local) {
      if (el.closest('[data-sidebar-thread-id],[data-sidebar-thread-shortcut-target]')) return;
      if (!isProse(target.key, this.names) || target.key.split(' ').length < 3) return;
      if (!target.attribute && (el.closest('h1,h2,h3,h4,a') || (!el.closest('p,small,label,[role="tooltip"]') && el.closest('.font-medium,.font-semibold')))) return;
      const path = this.doc.defaultView!.location.pathname;
      const corePage = /^\/(?:settings|skills|plugins)(?:\/|$)/.test(path) && !/^\/plugins\/(?!russian(?:\/|$))/.test(path);
      if (!target.attribute && !corePage && !el.closest(PROSE_STYLE)) return;
    }
    const cached = this.cache.get(target.key);
    if (cached && preservesFragments(target.key, cached, this.names)) { this.apply(target, cached); return; }
    if (cached) this.cache.delete(target.key);
    if ((this.retry.get(target.key) ?? 0) > Date.now()) return;
    const pending = this.pending.get(target.key) ?? new Set<Target>();
    if (![...pending].some(t => t.node === target.node && t.attribute === target.attribute)) pending.add(target);
    this.pending.set(target.key, pending);
  }
  private textNodes(root: Element): Text[] {
    const nodes: Text[] = [];
    const walker = this.doc.createTreeWalker(root, 4);
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    return nodes;
  }
  private inlineCandidate(block: Element): boolean {
    if (this.inlineSeen.has(block)) return true;
    if (!this.eligible(block) || block.closest('h1,h2,h3,h4,a') || block.querySelector('p,div,button,input,textarea,select,iframe,svg,[contenteditable]')) return false;
    const nodes = this.textNodes(block);
    if (nodes.length < 2) return false;
    const runs = nodes.map(node => {
      const current = node.nodeValue ?? '';
      const old = this.textRecords.get(node);
      const original = old?.translated === current ? old.original : current;
      return { node, original, expected: current, fixed: !this.eligible(node.parentElement!) || this.names.has(normalize(original)) };
    });
    const prose = runs.filter(run => !run.fixed).map(run => run.original).join('');
    if (!isProse(prose, this.names) || normalize(prose).split(' ').length < 3) return false;
    this.inlineSeen.add(block);
    if (runs.every(run => run.fixed || this.textRecords.get(run.node)?.translated === run.expected)) return true;
    const markers = runs.map((run, i) => `__BB_${run.fixed ? 'FIXED' : 'NODE'}_${letterId(i)}__`);
    markers.push(`__BB_NODE_${letterId(runs.length)}__`);
    const source = runs.map((run, i) => markers[i]! + (run.fixed ? '' : run.original)).join('') + markers.at(-1)!;
    if (source.length > 2400) return true;
    this.candidate({ node: block, source, key: normalize(source), inline: { runs, markers } });
    return true;
  }
  private scan() {
    if (!this.active || this.disposed) return;
    this.inlineSeen.clear();
    const roots = [...this.roots]; this.roots.clear();
    for (const root of roots) {
      if (!root.isConnected) continue;
      if (root.nodeType === 3) this.candidate({ node: root as Text, source: '', key: '' });
      else if (root.nodeType === 1) {
        const element = root as Element;
        const walker = this.doc.createTreeWalker(element, 5, { acceptNode: node => {
          if (node.nodeType === 1 && (node as Element).matches(EXCLUDED)) { this.attributes(node as Element); return 2; }
          return 1;
        }});
        this.attributes(element);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node.nodeType === 3) this.candidate({ node: node as Text, source: '', key: '' });
          else this.attributes(node as Element);
        }
      }
    }
    for (const node of this.textRecords.keys()) if (!node.isConnected) this.textRecords.delete(node);
    for (const node of this.attrRecords.keys()) if (!node.isConnected) this.attrRecords.delete(node);
    for (const [key, targets] of this.pending) {
      for (const target of targets) if (!target.node.isConnected) targets.delete(target);
      if (!targets.size) this.pending.delete(key);
    }
    this.publish(); void this.flush();
  }
  private attributes(el: Element) {
    for (const attribute of ATTRS) if (el.hasAttribute(attribute)) this.candidate({ node: el, attribute, source: '', key: '' });
  }
  private apply(target: Target, translation: string) {
    if (!target.node.isConnected || this.read(target) !== target.source || !this.active) return;
    const el = target.attribute || target.inline ? target.node as Element : target.node.parentElement;
    if (!el || !this.eligible(el, target.attribute)) return;
    if (target.inline) {
      if (target.inline.runs.some(run => !run.fixed && !this.eligible(run.node.parentElement!))) return;
      const slots = decodeInline(translation, target.inline.markers);
      if (!slots || slots.length !== target.inline.runs.length) return;
      for (let i = 0; i < slots.length; i++) {
        const run = target.inline.runs[i]!;
        if (run.fixed) continue;
        const prefix = run.original.match(/^\s*/u)![0], suffix = run.original.match(/\s*$/u)![0];
        const translated = prefix + slots[i]!.trim() + suffix;
        this.textRecords.set(run.node, { original: run.original, translated, key: target.key });
        run.node.nodeValue = translated;
      }
      return;
    }
    const prefix = target.source.match(/^\s*/u)![0], suffix = target.source.match(/\s*$/u)![0];
    const translated = prefix + translation + suffix;
    if (translated === target.source) return;
    const record = { original: target.source, translated, key: target.key };
    if (target.attribute) {
      const el = target.node as Element;
      const records = this.attrRecords.get(el) ?? new Map<string, RecordState>();
      records.set(target.attribute, record); this.attrRecords.set(el, records);
      el.setAttribute(target.attribute, translated);
    } else { this.textRecords.set(target.node as Text, record); target.node.nodeValue = translated; }
  }
  private async flush() {
    if (this.flushing || !this.transport || !this.active || !this.pending.size) return;
    this.flushing = true;
    const revision = this.revision;
    const batch = [...this.pending.keys()].slice(0, 16);
    const targets = new Map(batch.map(key => [key, this.pending.get(key)!]));
    for (const key of batch) this.pending.delete(key);
    try {
      const result = await this.transport.translate(batch);
      if (this.disposed || !this.active || revision !== this.revision) return;
      for (const key of batch) {
        const value = result.translations[key];
        if (value) {
          this.cache.set(key, value); this.retry.delete(key);
          for (const target of targets.get(key)!) this.apply(target, value);
        } else this.retry.set(key, Math.max(result.retryAt, Date.now() + 60000));
      }
    } catch { for (const key of batch) this.retry.set(key, Date.now() + 60000); }
    finally {
      this.flushing = false;
      if (this.active && !this.disposed) { this.publish(); this.schedule(); }
    }
  }
  private publish() {
    this.stats = { translated: this.textRecords.size + [...this.attrRecords.values()].reduce((n, attrs) => n + attrs.size, 0), pending: this.pending.size, missing: this.retry.size, active: this.active };
    for (const listener of this.listeners) listener();
    void this.transport?.report(this.stats).catch(() => {});
  }
  private stop() {
    this.active = false; this.revision++;
    this.observer?.disconnect(); this.observer = null;
    if (this.timer) clearTimeout(this.timer); this.timer = null;
    this.roots.clear(); this.pending.clear();
    for (const [node, record] of this.textRecords) if (node.nodeValue === record.translated) node.nodeValue = record.original;
    for (const [el, records] of this.attrRecords) for (const [attribute, record] of records) if (el.getAttribute(attribute) === record.translated) el.setAttribute(attribute, record.original);
    this.textRecords.clear(); this.attrRecords.clear(); this.publish();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.bootstrapVersion++; this.stop();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null; this.transport = null; this.listeners.clear();
  }
}
