import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('el registro público es solo de clientes: sin opción ni token de empleado', () => {
  const screen = source('../src/screens/auth/RegisterScreen.js');
  assert.ok(screen.includes('Crear cuenta de cliente'));
  assert.ok(screen.includes('registerCustomer'), 'Usa el registro de cliente con código de organización');
  assert.ok(screen.includes('organization_code'));
  assert.ok(!screen.includes('ChoiceRow'), 'Ya no hay selector de tipo de cuenta');
  assert.ok(!screen.includes('registration_token'), 'No se pide token de sucursal');
  assert.ok(!screen.includes("['employee', 'Empleado']"), 'No se ofrece la opción de empleado');
  assert.ok(!screen.includes('accountType'), 'No hay estado de tipo de cuenta');
  assert.ok(!screen.includes('pendiente de aprobación'), 'La cuenta de cliente nace activa');
  const auth = source('../src/services/authService.js');
  assert.ok(auth.includes('registerCustomer'), 'El servicio de cliente existe');
  assert.ok(auth.includes('/auth/register'), 'El endpoint viejo se conserva por compatibilidad');
});
