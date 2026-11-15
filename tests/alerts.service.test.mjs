import assert from 'node:assert/strict';
import test from 'node:test';

process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid';
const { listAlerts, listAlertLocations, acknowledgeAlert } = await import('../src/services/alertsService.js');

test('servicio usa HTTP compartido con bearer y filtros codificados', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => '{"items":[]}' };
  };
  try {
    await listAlerts('test-token', 'branch/one', { status: 'all', since: '2026-11-14T10:00:00+02:00', node_id: '' });
    const { url, options } = calls[0];
    assert.ok(url.includes('/branches/branch%2Fone/alerts?'));
    assert.equal(new URL(url).searchParams.get('since'), '2026-11-14T10:00:00+02:00');
    assert.equal(new URL(url).searchParams.has('node_id'), false);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    await acknowledgeAlert('test-token', 'branch', 'alert/one');
    assert.ok(calls[1].url.endsWith('/alerts/alert%2Fone/acknowledge'));
    assert.equal(calls[1].options.method, 'POST');
    await listAlertLocations('test-token', 'branch');
    assert.ok(calls[2].url.endsWith('/branches/branch/alert-locations'));
  } finally {
    globalThis.fetch = original;
  }
});

test('fallo HTTP no se transforma en lista vacía ni éxito de atención', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => '{"detail":"No autorizado"}' });
  try {
    await assert.rejects(listAlerts('test', 'branch'), error => error.status === 403);
    await assert.rejects(acknowledgeAlert('test', 'branch', 'alert'), error => error.status === 403);
  } finally {
    globalThis.fetch = original;
  }
});
