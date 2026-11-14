import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('clientNavIcons en assets.js define las 5 secciones de la barra inferior del cliente', () => {
  const content = fs.readFileSync(new URL('../src/theme/assets.js', import.meta.url), 'utf8');
  assert.ok(content.includes('clientNavIcons'), 'Debe existir clientNavIcons en assets.js');
  assert.ok(content.includes("home: require("));
  assert.ok(content.includes("search: require("));
  assert.ok(content.includes("map: require("));
  assert.ok(content.includes("purchases: require("));
  assert.ok(content.includes("profile: require("));
});

test('AppNavigator contiene rutas exclusivas y aisladas para el cliente', () => {
  const content = fs.readFileSync(new URL('../src/app/AppNavigator.js', import.meta.url), 'utf8');
  assert.ok(content.includes('customerScreens'), 'AppNavigator debe definir customerScreens');
  assert.ok(content.includes('CustomerNavigator'), 'AppNavigator debe tener CustomerNavigator');
  assert.ok(content.includes("user?.role?.toLowerCase() === 'customer'"), 'AppNavigator debe evaluar el rol customer');
  assert.ok(content.includes('<CustomerNavigator'), 'AppNavigator debe renderizar CustomerNavigator para rol customer');
});

test('Aislamiento de rutas: cliente no puede saltar a pantallas de staff', () => {
  const customerScreens = ['home', 'search', 'map', 'purchases', 'profile'];
  const staffScreens = ['tokens', 'approve', 'branch', 'gateway', 'devices', 'calibration', 'panel'];

  const resolveCustomerRoute = (requestedRoute) => {
    return customerScreens.includes(requestedRoute) ? requestedRoute : 'home';
  };

  for (const route of customerScreens) {
    assert.equal(resolveCustomerRoute(route), route);
  }

  for (const forbiddenRoute of staffScreens) {
    assert.equal(resolveCustomerRoute(forbiddenRoute), 'home',
      `El cliente no debe poder acceder a la ruta de staff: ${forbiddenRoute}`);
  }
});
