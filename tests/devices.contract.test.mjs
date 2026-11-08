import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../src/services/deviceService.js', import.meta.url), 'utf8');
const service = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
await assert.rejects(service.deviceRequest('listGateways', {}), /sucursal/);
await assert.rejects(service.deviceRequest('listGateways', { branchId: 'branch' }), /todavía/);
let request;
service.configureDeviceAdapter({ listGateways: async value => { request = value; return []; } });
assert.deepEqual(await service.deviceRequest('listGateways', { branchId: 'branch', accessToken: 'token' }), []);
assert.equal(request.branchId, 'branch');
assert.equal(request.accessToken, 'token');
assert.equal(service.validLight({ name: ' ', shelfId: 'shelf', channel: 0 }), false);
assert.equal(service.validLight({ name: 'Luz', shelfId: 'shelf', channel: 0 }), true);
assert.equal(service.validLight({ name: 'Luz', shelfId: 'shelf' }), false);
assert.equal(service.statusLabel({}), 'Sin información de conexión');
assert.equal(service.LIGHT_LIMIT, 10);
service.configureDeviceAdapter({
  listProducts: async () => [{ id: 'p1', sku: 'SKU-1', name: 'Agua' }],
  createProduct: async () => ({ id: 'p2', sku: 'SKU-2', name: 'Pan' }),
});
assert.equal((await service.deviceRequest('listProducts', { branchId: 'branch' }))[0].sku, 'SKU-1');
assert.equal((await service.deviceRequest('createProduct', { branchId: 'branch' }, { sku: 'SKU-2', name: 'Pan' })).id, 'p2');
service.configureDeviceAdapter({ listProducts: async () => [{ sku: 'sin-id' }] });
await assert.rejects(service.deviceRequest('listProducts', { branchId: 'branch' }), /Invalid list response/);
service.configureDeviceAdapter({ createProduct: async () => ({ sku: 'sin-id' }) });
await assert.rejects(service.deviceRequest('createProduct', { branchId: 'branch' }), /Missing confirmed identifier/);
console.log('PASS: adapter scope, unavailable operations, empty real data, channel zero, validation, products and unknown status.');
