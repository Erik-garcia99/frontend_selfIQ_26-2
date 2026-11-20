import assert from 'node:assert/strict';
import test from 'node:test';

process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid';
const { getCustomerBranches, getCustomerHome } = await import('../src/services/customerService.js');

test('getCustomerBranches usa HTTP compartido con bearer y parámetros codificados', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => '{"items":[],"total":0,"page":1,"page_size":5,"total_pages":1}' };
  };
  try {
    await getCustomerBranches('test-token', { page: 2, pageSize: 5, q: 'Centro' });
    const { url, options } = calls[0];
    assert.ok(url.includes('/customer/branches?'));
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('page'), '2');
    assert.equal(parsed.searchParams.get('page_size'), '5');
    assert.equal(parsed.searchParams.get('q'), 'Centro');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
  } finally {
    globalThis.fetch = original;
  }
});

test('getCustomerHome codifica branch_id y consulta aforo de cliente', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        branch_id: 'b-123',
        branch_name: 'Sucursal Centro',
        occupancy: 5,
        measured_at: '2026-11-20T20:00:00Z',
        age_seconds: 4,
        stale_after_seconds: 20,
        status: 'ok',
        occupancy_level: 'available',
        has_catalog: true,
      }),
    };
  };
  try {
    const data = await getCustomerHome('test-token', 'b-123');
    assert.equal(calls[0].url, 'https://example.invalid/customer/home?branch_id=b-123');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
    assert.equal(data.branch_name, 'Sucursal Centro');
    assert.equal(data.occupancy_level, 'available');
  } finally {
    globalThis.fetch = original;
  }
});

test('getCustomerHome rechaza llamada sin branchId', async () => {
  await assert.rejects(
    () => getCustomerHome('test-token', null),
    (err) => err.message.includes('Se requiere un identificador de sucursal')
  );
});
