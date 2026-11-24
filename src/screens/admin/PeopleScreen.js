import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Page, Card, Action, Button, Field, Message } from '../../components/ui';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DeviceContext';
import { peopleService } from '../../services/peopleService';
import { deviceAdapter } from '../../services/deviceAdapter';
import { useAsyncAction } from '../../utils/useAsyncAction';
import { describeError } from '../../utils/errorMessages';
import { isEmail } from '../../utils/validation';
import { colors as C } from '../../theme/colors';

const SECTIONS = [
  ['employees', 'Empleados'],
  ['customers', 'Clientes'],
  ['suppliers', 'Proveedores'],
];

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phoneNumber: '', password: '',
  role: 'employee', name: '', contactEmail: '', whatsappNumber: '',
};

// Roles asignables desde el alta de personal. `owner` y `sudo` se excluyen:
// owner inicia la plataforma y sudo es el administrador único. `staff` era un
// alias de `employee`: ya no se ofrece, pero los registros antiguos se listan.
// El valor es el que espera el backend; la etiqueta es para quien usa la app.
const ROLE_OPTIONS = [
  ['manager', 'Gerente'],
  ['rh', 'RRHH'],
  ['gerencia', 'Gerencia'],
  ['employee', 'Empleado'],
];

const fullName = (item) => `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email;
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const dateLabel = (value) => {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return String(value); }
};

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  tabOn: { backgroundColor: C.navy, borderColor: C.navy },
  tabText: { color: C.text, fontWeight: '600' },
  tabTextOn: { color: C.white },
  layer: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: C.white, borderRadius: 20, padding: 20, maxHeight: '88%' },
  title: { fontSize: 18, fontWeight: '700', color: C.navy, marginBottom: 12 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border },
  muted: { color: C.muted, marginTop: 3 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 4 },
  role: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  roleOn: { backgroundColor: C.navy, borderColor: C.navy },
  roleText: { color: C.text, fontWeight: '600' },
  roleTextOn: { color: C.white },
});

export default function PeopleScreen({ go }) {
  const { accessToken } = useAuth();
  const d = useDevices();
  const branchId = d.branchId;
  const [section, setSection] = useState('employees');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [reload, setReload] = useState(0);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(null); // 'form' | 'purchases' | 'products'
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState('');
  const [purchases, setPurchases] = useState([]);
  const [links, setLinks] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const task = useAsyncAction();

  const load = useCallback(async () => {
    if (!branchId) {
      setError('Selecciona una sucursal en el Panel para ver el personal.');
      return;
    }
    setLoading(true); setError('');
    try {
      let result;
      if (section === 'employees') {
        result = await peopleService.listEmployees({ branchId, accessToken, includeInactive });
      } else if (section === 'customers') {
        result = await peopleService.listCustomers({ branchId, accessToken, includeInactive });
      } else {
        result = await peopleService.listSuppliers({ branchId, accessToken, includeInactive });
      }
      setItems(Array.isArray(result?.items) ? result.items : []);
    } catch (failure) {
      setError(failure.message || 'No pudimos cargar la lista.');
    } finally { setLoading(false); }
  }, [branchId, accessToken, section, includeInactive]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, reload]);

  const change = (key) => (value) => setForm((previous) => ({ ...previous, [key]: value }));
  const refresh = () => setReload((value) => value + 1);
  const close = () => {
    setModal(null); setEditing(null); setForm(EMPTY_FORM);
    setConfirming(false); setFormError(''); task.setError('');
  };

  function openForm(item = null) {
    setEditing(item);
    setConfirming(false); setFormError(''); task.setError('');
    if (section === 'suppliers') {
      setForm({ ...EMPTY_FORM, name: item?.name || '', contactEmail: item?.contactEmail || '',
        whatsappNumber: item?.whatsappNumber || '' });
    } else {
      setForm({ ...EMPTY_FORM, firstName: item?.firstName || '', lastName: item?.lastName || '',
        email: item?.email || '', phoneNumber: item?.phoneNumber || '',
        role: item?.role || 'employee' });
    }
    setModal('form');
  }

  async function save() {
    if (section === 'suppliers') {
      if (!form.name.trim()) return setFormError('Escribe el nombre del proveedor.');
    } else {
      if (!form.firstName.trim() || !form.lastName.trim()) return setFormError('Escribe nombre y apellido.');
      if (!isEmail(form.email)) return setFormError('Escribe un correo válido.');
      if (!editing && form.password.length < 8) return setFormError('La contraseña debe tener al menos 8 caracteres.');
    }
    setFormError('');
    const common = { branchId, accessToken, data: {} };
    if (section === 'suppliers') {
      common.data = { name: form.name.trim(), contact_email: form.contactEmail.trim() || null,
        whatsapp_number: form.whatsappNumber.trim() || null };
    } else {
      common.data = { first_name: form.firstName.trim(), last_name: form.lastName.trim(),
        email: form.email.trim().toLowerCase(), phone_number: form.phoneNumber.trim() || null };
      if (!editing && section === 'employees') common.data.role = form.role;
      if (!editing) common.data.password = form.password;
    }
    const saved = await task.run(() => {
      if (section === 'employees') {
        return editing
          ? peopleService.updateEmployee({ ...common, userId: editing.id })
          : peopleService.createEmployee(common);
      }
      if (section === 'customers') {
        return editing
          ? peopleService.updateCustomer({ ...common, userId: editing.id })
          : peopleService.createCustomer(common);
      }
      return editing
        ? peopleService.updateSupplier({ ...common, supplierId: editing.id })
        : peopleService.createSupplier(common);
    });
    if (!saved) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
    }
    const label = section === 'suppliers' ? saved.name : fullName(saved);
    close(); refresh();
    setFeedback({ variant: 'success', title: editing ? 'Cambios guardados' : 'Registro creado',
      message: `${label} quedó guardado.`, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  }

  async function deactivate() {
    if (!editing || !confirming) return;
    const result = await task.run(() => {
      if (section === 'employees') return peopleService.deactivateEmployee({ branchId, accessToken, userId: editing.id });
      if (section === 'customers') return peopleService.deactivateCustomer({ branchId, accessToken, userId: editing.id });
      return peopleService.deactivateSupplier({ branchId, accessToken, supplierId: editing.id });
    });
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
    }
    close(); refresh();
    setFeedback({ variant: 'success', title: 'Registro dado de baja',
      message: 'El registro se conserva en el historial y ya no aparece en la lista activa.',
      actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  }

  async function openPurchases(item) {
    setEditing(item); setModal('purchases'); setPurchases([]); setError('');
    const result = await task.run(() => peopleService.customerPurchases({ branchId, accessToken, userId: item.id }));
    if (result) setPurchases(Array.isArray(result.items) ? result.items : []);
  }

  async function openProducts(item) {
    setEditing(item); setModal('products'); setLinks([]); setError('');
    const result = await task.run(async () => {
      const [current, catalog] = await Promise.all([
        peopleService.supplierProducts({ branchId, accessToken, supplierId: item.id }),
        deviceAdapter.listProducts({ branchId, accessToken }),
      ]);
      return { current, catalog };
    });
    if (!result) return;
    const linked = new Map((result.current.items || []).map((row) => [row.productId, row]));
    setLinks((result.catalog || []).map((product) => ({
      productId: product.id, name: product.name, sku: product.sku,
      supplierSku: linked.get(product.id)?.supplierSku || null,
      unitCost: linked.get(product.id)?.unitCost ?? null,
      isPreferred: Boolean(linked.get(product.id)?.isPreferred),
      associated: linked.has(product.id),
    })));
  }

  async function saveProducts() {
    const products = links.filter((row) => row.associated).map((row) => ({
      product_id: row.productId, supplier_sku: row.supplierSku || null,
      unit_cost: row.unitCost, is_preferred: row.isPreferred,
    }));
    const result = await task.run(() => peopleService.replaceSupplierProducts({
      branchId, accessToken, supplierId: editing.id, products,
    }));
    if (!result) {
      const info = describeError(task.getFailure());
      task.setError('');
      return setFeedback({ variant: 'error', ...info, actionLabel: 'Entendido', onClose: () => setFeedback(null) });
    }
    close();
    setFeedback({ variant: 'success', title: 'Productos actualizados',
      message: `${products.length} producto(s) asociados a ${editing.name}.`,
      actionLabel: 'Entendido', onClose: () => setFeedback(null) });
  }

  return <Page title="Personas" go={go} back="panel" active="panel" busy={task.loading}>
    <View style={styles.tabs}>
      {SECTIONS.map(([key, label]) => <Pressable accessibilityRole="button" key={key}
        onPress={() => { setSection(key); setModal(null); setEditing(null); }}
        style={[styles.tab, section === key && styles.tabOn]}>
        <Text style={[styles.tabText, section === key && styles.tabTextOn]}>{label}</Text>
      </Pressable>)}
    </View>

    <Card>
      <Text style={{ lineHeight: 21 }}>
        {section === 'employees' && 'Aquí das de alta al personal de esta sucursal y lo das de baja cuando ya no trabaje aquí.'}
        {section === 'customers' && 'Aquí administras los clientes de la empresa. Puedes consultar sus compras, pero no cambiar el inventario.'}
        {section === 'suppliers' && 'Aquí administras los proveedores y los productos que suministran.'}
      </Text>
    </Card>

    <Button onPress={() => openForm()} dark={false}>+ Nuevo {section === 'employees' ? 'empleado' : section === 'customers' ? 'cliente' : 'proveedor'}</Button>
    <Button dark={false} onPress={() => { setIncludeInactive((value) => !value); refresh(); }}>
      {includeInactive ? 'Ver solo activos' : 'Ver también dados de baja'}
    </Button>
    <Message error={error || task.error || formError} />

    {loading ? <Card><Text>Cargando lista…</Text></Card> : null}
    {!loading && items.length === 0 ? <Card><Text>No hay registros para mostrar.</Text></Card> : null}
    {items.map((item) => <Action key={item.id}
      title={section === 'suppliers' ? item.name : fullName(item)}
      detail={section === 'suppliers'
        ? `${item.contactEmail || 'Sin correo'}${item.active ? '' : ' · Dado de baja'}`
        : `${item.email}${item.active ? '' : ' · Dado de baja'}`}
      onPress={() => (section === 'customers' && item.active ? openPurchases(item)
        : section === 'suppliers' && item.active ? openProducts(item) : openForm(item))} />)}
    <Card><Text style={{ lineHeight: 21 }}>
      Toca un registro para ver sus datos. Desde la ventana puedes editarlo, darlo de baja y, según el caso, consultar sus compras o sus productos.
    </Text></Card>

    <Modal visible={modal === 'form'} transparent animationType="fade" onRequestClose={() => !task.loading && close()}>
      <View style={styles.layer}>
        <ScrollView contentContainerStyle={styles.dialog}>
          <Text style={styles.title}>{editing ? 'Editar registro' : 'Nuevo registro'}</Text>
          {section === 'suppliers' ? <>
            <Field label="Nombre del proveedor" value={form.name} onChangeText={change('name')} />
            <Field label="Correo de contacto" value={form.contactEmail} onChangeText={change('contactEmail')} keyboardType="email-address" />
            <Field label="WhatsApp" value={form.whatsappNumber} onChangeText={change('whatsappNumber')} keyboardType="phone-pad" />
          </> : <>
            <Field label="Nombre" value={form.firstName} onChangeText={change('firstName')} />
            <Field label="Apellido" value={form.lastName} onChangeText={change('lastName')} />
            <Field label="Correo" value={form.email} onChangeText={change('email')} keyboardType="email-address" />
            <Field label="Teléfono" value={form.phoneNumber} onChangeText={change('phoneNumber')} keyboardType="phone-pad" />
            {section === 'employees' && !editing ? <>
              <Text style={styles.muted}>Elige el rol de la lista.</Text>
              <View style={styles.roles}>
                {ROLE_OPTIONS.map(([value, label]) => <Pressable accessibilityRole="button" key={value}
                  onPress={() => setForm((previous) => ({ ...previous, role: value }))}
                  style={[styles.role, form.role === value && styles.roleOn]}>
                  <Text style={[styles.roleText, form.role === value && styles.roleTextOn]}>{label}</Text>
                </Pressable>)}
              </View>
            </> : null}
            {!editing ? <Field label="Contraseña inicial" value={form.password} onChangeText={change('password')} password /> : null}
          </>}
          <Message error={task.error || formError} />
          {editing && !editing.active ? <Text style={{ marginBottom: 12 }}>Este registro está dado de baja. Solo puedes consultarlo.</Text> : null}
          <Button loading={task.loading} disabled={Boolean(editing && !editing.active)} onPress={save}>Guardar</Button>
          {editing?.active ? <>
            {confirming ? <>
              <Text style={{ marginVertical: 12 }}>¿Dar de baja a {section === 'suppliers' ? editing.name : fullName(editing)}? El historial se conserva.</Text>
              <Button loading={task.loading} onPress={deactivate}>Sí, dar de baja</Button>
              <Button dark={false} onPress={() => setConfirming(false)}>Cancelar</Button>
            </> : <Button dark={false} onPress={() => setConfirming(true)}>Dar de baja</Button>}
          </> : null}
          <Button dark={false} disabled={task.loading} onPress={close}>Cerrar</Button>
        </ScrollView>
      </View>
    </Modal>

    <Modal visible={modal === 'purchases'} transparent animationType="fade" onRequestClose={() => !task.loading && close()}>
      <View style={styles.layer}>
        <ScrollView contentContainerStyle={styles.dialog}>
          <Text style={styles.title}>Compras de {editing ? fullName(editing) : ''}</Text>
          <Text style={styles.muted}>Solo lectura: vienen del sistema de ventas.</Text>
          <Message error={task.error || error} />
          {purchases.length === 0 ? <Text style={{ marginVertical: 12 }}>Sin compras registradas.</Text> : null}
          {purchases.map((sale) => <View key={sale.id} style={styles.row}>
            <Text style={{ fontWeight: '600' }}>{sale.saleNumber} · {dateLabel(sale.occurredAt)}</Text>
            <Text style={styles.muted}>{money(sale.total)} · {sale.status}</Text>
            {sale.items.map((line) => <Text key={line.productId} style={styles.muted}>
              {line.quantity} × {line.name} ({line.sku})
            </Text>)}
          </View>)}
          <Button dark={false} onPress={() => openForm(editing)}>Editar datos del cliente</Button>
          <Button dark={false} onPress={close}>Cerrar</Button>
        </ScrollView>
      </View>
    </Modal>

    <Modal visible={modal === 'products'} transparent animationType="fade" onRequestClose={() => !task.loading && close()}>
      <View style={styles.layer}>
        <ScrollView contentContainerStyle={styles.dialog}>
          <Text style={styles.title}>Productos de {editing?.name || ''}</Text>
          <Text style={styles.muted}>Toca un producto para asociarlo o quitarlo.</Text>
          <Message error={task.error} />
          {links.length === 0 ? <Text style={{ marginVertical: 12 }}>No hay productos en el catálogo de esta empresa.</Text> : null}
          {links.map((link, index) => <Pressable accessibilityRole="button" key={link.productId}
            onPress={() => setLinks((previous) => previous.map((row, i) => i === index ? { ...row, associated: !row.associated } : row))}
            style={styles.linkRow}>
            <Text style={{ flex: 1 }}>{link.name} ({link.sku})</Text>
            <Text style={{ color: link.associated ? '#18794E' : C.muted, fontWeight: '600' }}>
              {link.associated ? 'Asociado' : 'Agregar'}
            </Text>
          </Pressable>)}
          <Button loading={task.loading} onPress={saveProducts}>Guardar asociaciones</Button>
          <Button dark={false} onPress={() => openForm(editing)}>Editar datos del proveedor</Button>
          <Button dark={false} disabled={task.loading} onPress={close}>Cerrar</Button>
        </ScrollView>
      </View>
    </Modal>

    <FeedbackDialog visible={Boolean(feedback)} variant={feedback?.variant} title={feedback?.title}
      message={feedback?.message} code={feedback?.code} hint={feedback?.hint}
      actionLabel={feedback?.actionLabel} onClose={feedback?.onClose} />
  </Page>;
}
