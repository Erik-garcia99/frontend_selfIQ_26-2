import assert from 'node:assert/strict';
import test from 'node:test';

process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid';
const { getCustomerBranches, getCustomerHome, getCustomerCategories, getCustomerProducts, getCustomerShelves } = await import('../src/services/customerService.js');

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

test('getCustomerCategories consulta categorías por sucursal', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => '{"categories":["Bebidas","Lácteos"]}' };
  };
  try {
    const data = await getCustomerCategories('test-token', 'b-123');
    assert.equal(calls[0].url, 'https://example.invalid/customer/branches/b-123/categories');
    assert.deepEqual(data.categories, ['Bebidas', 'Lácteos']);
  } finally {
    globalThis.fetch = original;
  }
});

test('getCustomerShelves consulta estantes por sucursal', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => JSON.stringify({
      items: [{
        id: 's-1', name: 'Estante 1', location: 'Pasillo 1',
        product_count: 2, guide_count: 1,
        channel: 3, gpio_pin: 17, lights: [{ id: 'l-1' }],
      }],
      total: 1, page: 1, page_size: 5, total_pages: 1,
    }) };
  };
  try {
    const result = await getCustomerShelves('test-token', 'b-123', { page: 1, pageSize: 5 });
    assert.deepEqual(Object.keys(result.items[0]).sort(),
      ['guide_count', 'id', 'location', 'name', 'product_count']);
    assert.equal(result.items[0].name, 'Estante 1');
    assert.equal(result.items[0].product_count, 2);
    const { url, options } = calls[0];
    assert.ok(url.includes('/customer/branches/b-123/shelves?'));
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('page'), '1');
    assert.equal(parsed.searchParams.get('page_size'), '5');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
  } finally {
    globalThis.fetch = original;
  }
});

test('getCustomerShelves rechaza llamada sin branchId', async () => {
  await assert.rejects(
    () => getCustomerShelves('test-token', null),
    (err) => err.message.includes('Se requiere un identificador de sucursal')
  );
});
