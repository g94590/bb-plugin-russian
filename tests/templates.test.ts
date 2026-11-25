import test from 'node:test';
import assert from 'node:assert/strict';
import { translateTemplate } from '../templates';
import { nameSet } from '../policy';
test('UI templates preserve exact product names and do not infer unknown names', () => {
  const names = nameSet(['Account Pooler', 'russian', 'ВВ РУС']);
  assert.equal(translateTemplate('Disable Account Pooler', names), 'Отключить Account Pooler');
  assert.equal(translateTemplate('Disable russian', names), 'Отключить russian');
  assert.equal(translateTemplate('Open Account Pooler details', names), 'Открыть сведения: Account Pooler');
  assert.equal(translateTemplate('New thread in ВВ РУС', names), 'Новый диалог в ВВ РУС');
  assert.equal(translateTemplate('Disable unknown object', names), null);
});
