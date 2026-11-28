import { useState } from 'react';
import { DeviceProvider } from '../context/DeviceContext';
import ConfirmDevice from '../screens/devices/ConfirmDeviceScreen';
import CameraDetail from '../screens/devices/CameraDetailScreen';
import { useAuth } from '../context/AuthContext';
import { canOpenStaffRoute } from '../utils/staffAccess';
import Login from '../screens/auth/LoginScreen';
import Register from '../screens/auth/RegisterScreen';
import Recovery from '../screens/auth/RecoveryScreen';
import Home from '../screens/home/HomeScreen';
import Branch from '../screens/branches/CreateBranchScreen';
import Settings from '../screens/settings/SettingsScreen';
import ProfileSettings from '../screens/settings/ProfileSettingsScreen';
import NotificationsSettings from '../screens/settings/NotificationsSettingsScreen';
import SecuritySettings from '../screens/settings/SecuritySettingsScreen';
import Logout from '../screens/settings/LogoutScreen';
import Panel from '../screens/PanelScreen';
import Alerts from '../screens/alerts/LiveAlertsScreen';
import Tokens from '../screens/admin/TokenScreen';
import Approve from '../screens/admin/ApproveUserScreen';
import Logs from '../screens/admin/LogsScreen';
import People from '../screens/admin/PeopleScreen';
import MapDraft from '../screens/maps/MapDraftScreen';
import Gateway from '../screens/gateways/GatewayScreen';
import Devices from '../screens/devices/DevicesScreen';
import AddDevice from '../screens/devices/AddDeviceScreen';
import RegisteredDevices from '../screens/devices/RegisteredDevicesScreen';
import Guide from '../screens/devices/GuideScreen';
import GuideNode from '../screens/devices/GuideNodeScreen';
import PreparingSearch from '../screens/devices/PreparingSearchScreen';
import Searching from '../screens/devices/SearchingScreen';
import DeviceFound from '../screens/devices/DeviceFoundScreen';
import AddCamera from '../screens/devices/AddCameraScreen';
import AddingDevice from '../screens/devices/AddingDeviceScreen';
import DeviceAdded from '../screens/devices/DeviceAddedScreen';
import NoResults from '../screens/devices/NoResultsScreen';
import SearchError from '../screens/devices/SearchErrorScreen';
import ConfirmError from '../screens/devices/ConfirmErrorScreen';
import AforoDetail from '../screens/devices/AforoDetailScreen';
import EditAforo from '../screens/devices/EditAforoScreen';
import AforoUpdated from '../screens/devices/AforoUpdatedScreen';
import EditDevice from '../screens/devices/EditDeviceScreen';
import DeviceUpdated from '../screens/devices/DeviceUpdatedScreen';
import DeleteDevice from '../screens/devices/DeleteDeviceScreen';
import EditLight from '../screens/devices/EditLightScreen';
import AddLight from '../screens/devices/AddLightScreen';
import TestLight from '../screens/devices/TestLightScreen';
import LightUpdated from '../screens/devices/LightUpdatedScreen';
import LightAdded from '../screens/devices/LightAddedScreen';
import Products from '../screens/devices/ProductsScreen';
import Shelves from '../screens/devices/ShelvesScreen';
import TestProductLight from '../screens/devices/TestProductLightScreen';
import ShelfZones from '../screens/devices/ShelfZonesScreen';
import Calibration from '../screens/devices/CalibrationScreen';
import Diagnostics from '../screens/devices/DiagnosticsScreen';

// Pantallas exclusivas del cliente
import CustomerHome from '../screens/customer/CustomerHomeScreen';
import CustomerSearch from '../screens/customer/CustomerSearchScreen';
import CustomerMap from '../screens/customer/CustomerMapScreen';
import CustomerPurchases from '../screens/customer/CustomerPurchasesScreen';
import CustomerProfile from '../screens/customer/CustomerProfileScreen';

const publicScreens = { login: Login, register: Register, recovery: Recovery };

const customerScreens = {
  home: CustomerHome,
  search: CustomerSearch,
  map: CustomerMap,
  purchases: CustomerPurchases,
  profile: CustomerProfile,
};

const privateScreens = { home: Home, branch: Branch, settings: Settings, panel: Panel, alerts: Alerts, tokens: Tokens, logs: Logs, people: People, 'map-draft': MapDraft, approve: Approve, gateway: Gateway,
  'settings-profile': ProfileSettings, 'settings-notifications': NotificationsSettings, 'settings-security': SecuritySettings, 'settings-logout': Logout,
  'confirm-device': ConfirmDevice, 'camera-detail': CameraDetail, devices: Devices, 'add-device': AddDevice, 'registered-devices': RegisteredDevices, guide: GuideNode, 'guide-old': Guide,
  'preparing-search': PreparingSearch, searching: Searching, 'device-found': DeviceFound, 'add-camera': AddCamera,
  'adding-device': AddingDevice, 'device-added': DeviceAdded, 'no-results': NoResults, 'search-error': SearchError,
  'confirm-error': ConfirmError, 'aforo-detail': AforoDetail, 'edit-aforo': EditAforo, 'aforo-updated': AforoUpdated,
  'edit-device': EditDevice, 'device-updated': DeviceUpdated, 'delete-device': DeleteDevice,
  'edit-light': EditLight, 'add-light': AddLight, 'test-light': TestLight,
  'light-updated': LightUpdated, 'light-added': LightAdded, products: Products, shelves: Shelves,
  'test-product-light': TestProductLight, 'shelf-zones': ShelfZones,
  calibration: Calibration, 'device-diagnostics': Diagnostics };

const deviceRoutes = new Set(['gateway', 'devices', 'add-device', 'registered-devices', 'guide', 'preparing-search', 'searching', 'device-found', 'add-camera', 'adding-device', 'device-added', 'no-results', 'search-error', 'confirm-error', 'confirm-device', 'camera-detail', 'aforo-detail', 'edit-aforo', 'aforo-updated', 'edit-device', 'device-updated', 'delete-device', 'edit-light', 'add-light', 'test-light', 'light-updated', 'light-added', 'products', 'shelves', 'test-product-light', 'shelf-zones', 'calibration', 'device-diagnostics']);

function PublicNavigator() {
  const [route, go] = useState('login');
  const Screen = publicScreens[route] || Login;
  return <Screen key={route} go={go} />;
}

function CustomerNavigator() {
  const [route, setRoute] = useState('home');
  const [params, setParams] = useState(null);
  const [history, setHistory] = useState([]);
  const go = (next, nextParams) => {
    if (next === route) return;
    setHistory((h) => [...h, route]);
    setParams(nextParams || null);
    setRoute(customerScreens[next] ? next : 'home');
  };
  const back = () => {
    if (history.length === 0) {
      setRoute('home');
      setParams(null);
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRoute(customerScreens[prev] ? prev : 'home');
    setParams(null);
  };
  const Screen = customerScreens[route] || CustomerHome;
  return <Screen key={route} go={go} back={back} params={params} />;
}

function StaffNavigator() {
  const { user } = useAuth();
  const [route, setRoute] = useState('home');
  const [params, setParams] = useState(null);
  const allowed = (candidate) => canOpenStaffRoute(candidate, user, deviceRoutes);
  const go = (next, nextParams) => {
    if (!allowed(next)) return;
    setParams(nextParams || null);
    setRoute(privateScreens[next] ? next : 'home');
  };
  const allowedRoute = allowed(route) ? route : 'home';
  const Screen = privateScreens[allowedRoute] || Home;
  return <Screen key={allowedRoute} go={go} params={params} />;
}

export function AppNavigator() {
  const { session, user } = useAuth();
  if (!session) return <PublicNavigator />;

  const isCustomer = user?.role?.toLowerCase() === 'customer';
  if (isCustomer) {
    return <CustomerNavigator />;
  }

  return (
    <DeviceProvider key={`${user?.id || 'staff'}:${user?.branch_id || 'none'}`}>
      <StaffNavigator />
    </DeviceProvider>
  );
}
