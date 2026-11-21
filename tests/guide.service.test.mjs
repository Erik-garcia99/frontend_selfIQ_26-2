import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../src/', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8');

const calls = [];
globalThis.__guideApiRequest = async (path, options) => {
  calls.push({ path, options });
  return { id: 'req-1', status: 'pending', light: 'unknown', location: { shelfName: 'Estante 3' } };
};

const source = read('services/guideService.js').replace(
  "import { apiRequest } from './http';",
  'const apiRequest = globalThis.__guideApiRequest;',
);
const guide = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const ctx = { branchId: 'sucursal-1', requestId: 'req-1', accessToken: 'token', productId: 'producto-1' };
assert.deepEqual(await guide.createGuideRequest(ctx), { id: 'req-1', status: 'pending', light: 'unknown', location: { shelfName: 'Estante 3' } });
assert.equal(calls[0].path, '/branches/sucursal-1/guide-requests');
assert.equal(calls[0].options.method, 'POST');
assert.deepEqual(calls[0].options.body, { product_id: 'producto-1' });
assert.match(calls[0].options.headers['Idempotency-Key'], /^[A-Za-z0-9_-]{8,64}$/);

await guide.getGuideRequest(ctx);
assert.equal(calls[1].path, '/branches/sucursal-1/guide-requests/req-1');
assert.equal(calls[1].options.method, undefined);

await guide.confirmGuideRequest(ctx);
assert.equal(calls[2].path, '/branches/sucursal-1/guide-requests/req-1/confirm');
assert.equal(calls[2].options.method, 'POST');

await guide.cancelGuideRequest(ctx);
assert.equal(calls[3].path, '/branches/sucursal-1/guide-requests/req-1');
assert.equal(calls[3].options.method, 'DELETE');

assert.match(guide.newIdempotencyKey(), /^[A-Za-z0-9_-]{8,64}$/);
assert.equal(guide.guideMessage({ status: 'pending' }), 'Activando la guía…');
assert.equal(guide.guideMessage({ status: 'active', light: 'on' }), 'Sigue la luz hasta el estante.');
assert.equal(guide.guideMessage({ status: 'active', closing: true, light: 'on' }), 'Apagando la guía…');
assert.match(guide.guideMessage({ status: 'failed', reason: 'off_unverified' }), /No se pudo confirmar/);
assert.equal(guide.GUIDE_TERMINAL.has('confirmed'), true);
assert.equal(guide.GUIDE_TERMINAL.has('active'), false);

// El desfase del contrato viejo no debe reaparecer en la app staff.
assert.doesNotMatch(read('services/deviceAdapter.js'), /result\?\.confirmed|confirmed: true/);
assert.doesNotMatch(read('screens/devices/TestLightScreen.js'), /confirmed/);
assert.match(read('services/deviceAdapter.js'), /result\.status/);

// Sin capacidades declaradas solo se ofrecen los 8 canales previstos.
globalThis.__guideApiRequest = async () => [];
const adapterSource = read('services/deviceAdapter.js').replace(
  "import { apiRequest, ApiError, API_BASE_URL } from './http.js';",
  'const apiRequest = globalThis.__guideApiRequest; class ApiError extends Error {} const API_BASE_URL = "";',
);
const adapter = await import(`data:text/javascript;base64,${Buffer.from(adapterSource).toString('base64')}`);
const fallback = await adapter.deviceAdapter.listLightChannels({ branchId: 'b', deviceId: 'd' });
assert.equal(fallback.length, 8);
assert.equal(fallback[0].id, 0);
assert.equal(fallback[7].label, 'Luz 8');
assert.equal(fallback[0].declared, false);

let assignmentCall;
globalThis.__guideApiRequest = async (path, options) => {
  assignmentCall = { path, options };
  return { productId: 'new-product' };
};
const replacementSource = adapterSource.replace(
  'const apiRequest = globalThis.__guideApiRequest;',
  'const apiRequest = (...args) => globalThis.__guideApiRequest(...args);',
);
const replacement = await import(`data:text/javascript;base64,${Buffer.from(replacementSource).toString('base64')}`);
await replacement.deviceAdapter.assignGuideProduct({
  branchId: 'b', guidePointId: 'led-3', productId: 'new-product', replaceProductId: 'old-product',
});
assert.deepEqual(assignmentCall.options.body, {
  product_id: 'new-product', guide_point_id: 'led-3', replace_product_id: 'old-product',
});
await replacement.deviceAdapter.assignGuideProduct({
  branchId: 'b', guidePointId: 'led-4', productId: 'new-product',
});
assert.deepEqual(assignmentCall.options.body, {
  product_id: 'new-product', guide_point_id: 'led-4',
});

// La lista real debe pasar también por el validador de deviceRequest.
const serviceSource = read('services/deviceService.js');
const service = await import(`data:text/javascript;base64,${Buffer.from(serviceSource).toString('base64')}`);
service.configureDeviceAdapter(replacement.deviceAdapter);
const association = {
  nodeId: 'node-1',
  guidePointId: 'led-3', lightName: 'Luz 3', channel: 2,
  shelfId: 'shelf-3', shelfName: 'Estante 3',
  productId: 'product-1', productName: 'Agua', sku: 'SKU-1',
};
globalThis.__guideApiRequest = async () => [association];
assert.deepEqual(await service.deviceRequest('listGuideAssociations', { branchId: 'b' }), [
  { id: 'product-1', ...association },
]);
globalThis.__guideApiRequest = async () => [];
assert.deepEqual(await service.deviceRequest('listGuideAssociations', { branchId: 'b' }), []);
globalThis.__guideApiRequest = async () => [{ guidePointId: 'led-3' }];
await assert.rejects(
  service.deviceRequest('listGuideAssociations', { branchId: 'b' }),
  /Invalid list response/,
);

let shelfRequest;
globalThis.__guideApiRequest = async path => {
  shelfRequest = path;
  return [{ id: 'product-1', name: 'Agua', sku: 'SKU-1', active: true }];
};
assert.deepEqual(await service.deviceRequest('listShelfProducts', { branchId: 'b' }, { shelfId: 's/3' }), [
  { id: 'product-1', name: 'Agua', sku: 'SKU-1', active: true, physicalConfigured: false },
]);
assert.equal(shelfRequest, '/branches/b/shelves/s%2F3/products');
shelfRequest = null;
assert.deepEqual(await service.deviceRequest('listShelfProducts', { branchId: 'b' }), []);
assert.equal(shelfRequest, null);

// GL-6 (cliente) reutilizará este mismo servicio y estas mismas rutas.
assert.match(read('services/guideService.js'), /guide-requests/);
assert.match(read('screens/devices/TestProductLightScreen.js'), /services\/guideService/);
assert.match(read('screens/devices/ProductsScreen.js'), /test-product-light/);
assert.match(read('app/AppNavigator.js'), /test-product-light/);

// La guía tiene asociación propia, independiente del ROI de la cámara.
assert.match(read('services/deviceAdapter.js'), /listGuideAssociations/);
assert.match(read('services/deviceAdapter.js'), /assignGuideProduct/);
assert.match(read('services/deviceAdapter.js'), /unassignGuideProduct/);
assert.equal(typeof adapter.deviceAdapter.listGuideAssociations, 'function');
assert.equal(typeof adapter.deviceAdapter.assignGuideProduct, 'function');
assert.equal(typeof adapter.deviceAdapter.unassignGuideProduct, 'function');
assert.match(read('screens/devices/GuideNodeScreen.js'), /listGuideAssociations/);
assert.match(read('screens/devices/GuideNodeScreen.js'), /guide-products/);
assert.match(read('app/AppNavigator.js'), /guide: GuideNode/);

// Nodos agrupados por tipo y de 5 en 5, en una sola lista.
assert.match(read('screens/devices/RegisteredDevicesScreen.js'), /GROUPS/);
assert.match(read('screens/devices/RegisteredDevicesScreen.js'), /PAGE_SIZE = 5/);

console.log('PASS: guía compartida (crear/leer/confirmar/cancelar), estados y contrato sin confirmed.');
