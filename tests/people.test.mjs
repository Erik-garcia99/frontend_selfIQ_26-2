import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { dirname } from 'node:path';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const { transformSync } = expoRequire('@babel/core');
const filename = new URL('../src/services/peopleService.js', import.meta.url).pathname;

function loadService() {
  const calls = [];
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(dirname(filename));
  mod.require = (id) => {
    if (id === './http.js') return {
      apiRequest: async (path, options) => { calls.push({ path, options }); return { items: [] }; },
    };
    return require(id);
  };
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [expoRequire.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  mod._compile(code, filename);
  return { service: mod.exports.peopleService, calls };
}

test('peopleService reutiliza el cliente HTTP y cubre F-02', () => {
  const service = source('../src/services/peopleService.js');
  assert.ok(service.includes("from './http.js'"), 'No crea otro cliente HTTP');
  assert.ok(service.includes('apiRequest'));
  for (const endpoint of ['/employees', '/customers', '/suppliers', '/purchases', '/products']) {
    assert.ok(service.includes(endpoint), `Falta ${endpoint}`);
  }
  assert.ok(service.includes('method: \'PATCH\''));
  assert.ok(service.includes('method: \'DELETE\''));
  assert.ok(service.includes('method: \'PUT\''));
});

test('las rutas usan la sucursal activa y codifican identificadores', async () => {
  const { service, calls } = loadService();
  await service.listEmployees({ branchId: 'b1', accessToken: 't' });
  assert.equal(calls[0].path, '/branches/b1/employees');
  await service.listCustomers({ branchId: 'b1', accessToken: 't', includeInactive: true });
  assert.equal(calls[1].path, '/branches/b1/customers?include_inactive=true');
  await service.updateEmployee({ branchId: 'b 1', userId: 'u/1', accessToken: 't',
    data: { first_name: 'Ana' } });
  assert.equal(calls[2].path, '/branches/b%201/employees/u%2F1');
  assert.equal(calls[2].options.method, 'PATCH');
  assert.deepEqual(calls[2].options.body, { first_name: 'Ana' });
  await service.replaceSupplierProducts({ branchId: 'b1', supplierId: 's1', accessToken: 't',
    products: [{ product_id: 'p1' }] });
  assert.equal(calls[3].path, '/branches/b1/suppliers/s1/products');
  assert.equal(calls[3].options.method, 'PUT');
  await service.customerPurchases({ branchId: 'b1', userId: 'u1', accessToken: 't' });
  assert.equal(calls[4].path, '/branches/b1/customers/u1/purchases');
});

test('la pantalla de Personas respeta textos simples y baja lógica', () => {
  const screen = source('../src/screens/admin/PeopleScreen.js');
  for (const label of ['Empleados', 'Clientes', 'Proveedores', 'Nuevo',
    'Dar de baja', 'Compras de', 'Productos de', 'Guardar asociaciones',
    'Gerente', 'RRHH', 'Gerencia', 'Empleado']) {
    assert.ok(screen.includes(label), `Falta ${label}`);
  }
  assert.ok(screen.includes('useDevices'), 'Usa la sucursal seleccionada, no user.branch_id');
  assert.ok(screen.includes('d.branchId'));
  assert.ok(!screen.includes('user?.branch_id'), 'sudo no tiene branch_id fijo');
  assert.ok(screen.includes('includeInactive'), 'Los dados de baja se pueden consultar');
  assert.ok(screen.includes('deviceAdapter.listProducts'), 'Catálogo para asociar proveedor→producto');
  assert.ok(screen.includes('peopleService.customerPurchases'), 'Historial de compras del POS');
  assert.ok(!screen.includes('robo') && !screen.includes('merma'), 'Sin etiquetas automáticas');
  assert.ok(!screen.includes('Rol (employee o staff)'), 'El rol ya no se escribe a mano');
  for (const value of ['manager', 'rh', 'gerencia', 'employee']) {
    assert.ok(screen.includes(`['${value}',`), `Falta el valor ${value}`);
  }
  assert.ok(!screen.includes("['staff',"), 'staff era un alias histórico, no se ofrece al dar de alta');
  assert.ok(screen.includes('role: value'), 'La etiqueta es española; el valor va sin traducir al backend');
  assert.ok(screen.includes("['manager', 'gerencia']"), 'Gerente/gerencia crean cuentas pendientes');
  assert.ok(screen.includes('pendiente de aprobación de owner o RRHH'));
});

test('Personas está en Panel y oculto para quien no administra', () => {
  const navigator = source('../src/app/AppNavigator.js');
  assert.ok(navigator.includes('people: People'));
  const panel = source('../src/screens/PanelScreen.js');
  assert.ok(panel.includes('Personas'));
  assert.ok(panel.includes("go('people')"));
  const access = source('../src/utils/staffAccess.js');
  assert.ok(access.includes("route === PEOPLE_ROUTE"));
  assert.ok(access.includes('people: canManage(user)'));
});
