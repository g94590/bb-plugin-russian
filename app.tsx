import { useCallback, useEffect, useState } from 'react';
import { definePluginApp, useRpc, useRealtime, useSettings } from '@get-bb/plugin-sdk/app';
import type { rpcContract } from './server';
import { RussianDOM } from './dom';
import './app.css';

let engine: RussianDOM | null = null;
let attach: (() => void) | null = null;
function Bridge() {
  const rpc = useRpc<typeof rpcContract>();
  const settings = useSettings();
  const connect = useCallback(() => {
    void engine?.connect({ bootstrap: () => rpc.call('bootstrap'), translate: texts => rpc.call('translate', { texts }), report: stats => rpc.call('report', stats) });
  }, [rpc]);
  useEffect(() => { attach = connect; connect(); return () => { if (attach === connect) attach = null; }; }, [connect]);
  useEffect(() => { void engine?.configure(); }, [settings.values]);
  useRealtime('configuration', connect);
  return null;
}

type Status = { enabled: boolean; online: boolean; dictionary: number; cached: number; lastError: string | null };
function RussianSettings() {
  const rpc = useRpc<typeof rpcContract>();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState(engine?.getStats());
  const reload = useCallback(() => {
    rpc.call('status').then(value => { setStatus(value); setError(null); }, () => setError('Не удалось получить состояние. Проверьте соединение с BB.'));
  }, [rpc]);
  useEffect(() => { reload(); const timer = setInterval(reload, 10000); return () => clearInterval(timer); }, [reload]);
  useEffect(() => engine?.subscribe(() => setLocal(engine?.getStats())), []);
  useRealtime('configuration', reload);
  return <div className="russian-settings" data-bb-russian-skip="">
    <p className="russian-lead">Описания, пояснения и подсказки — на русском. Названия плагинов, продуктов и моделей, команды и пути остаются оригинальными.</p>
    <div role="status" aria-live="polite" className="russian-status">
      {status ? <><strong>{status.enabled ? 'Русификация включена' : 'Русификация выключена'}</strong>
        <dl><div><dt>Локальный словарь</dt><dd>{status.dictionary} текстов</dd></div><div><dt>Сохранённые переводы</dt><dd>{status.cached}</dd></div>
        <div><dt>В этом окне</dt><dd>{local?.translated ?? 0} замен</dd></div></dl></> : 'Проверка состояния…'}
    </div>
    {error && <p role="alert">{error}</p>}
    {status?.lastError && <p role="alert">{status.lastError}</p>}
    <p>Новые тексты и изменения интерфейса обрабатываются автоматически. Названия из каталога плагинов обновляются каждую минуту. При отключении русификации исходный текст восстанавливается.</p>
    <p>{status?.online ? 'Новые описания отправляются в Google Translate; готовые переводы сохраняются на этом сервере BB. Это машинный перевод, возможны неточности. Сервис неофициальный и может временно ограничивать запросы.' : 'Сетевой перевод выключен. Работают локальный словарь и уже сохранённые переводы.'}</p>
    <p>Сообщения в диалогах, редакторы, терминалы, код и значения полей исключены. Встроенные страницы сторонних сайтов и системные меню macOS не переводятся. Неизвестные короткие названия сохраняются, чтобы не переименовать продукт или команду.</p>
    <button type="button" className="russian-refresh" onClick={() => { reload(); void engine?.configure(); }}>Проверить состояние</button>
    <p className="russian-cli">Состояние: <code>bb russian status</code><br/>Отключение: <code>bb russian disable</code><br/>Включение: <code>bb russian enable</code></p>
  </div>;
}
export default definePluginApp(app => {
  app.contentScripts.register({ id: 'russian-interface', mount({ signal }) {
    const instance = new RussianDOM(document); engine = instance;
    const stop = () => { instance.dispose(); if (engine === instance) engine = null; };
    signal.addEventListener('abort', stop, { once: true }); attach?.();
    return () => { signal.removeEventListener('abort', stop); stop(); };
  }});
  app.slots.experimental_appOverlay({ id: 'russian-bridge', component: Bridge });
  app.slots.settingsSection({ id: 'russian-status', title: 'Автоматическая русификация', component: RussianSettings });
});
