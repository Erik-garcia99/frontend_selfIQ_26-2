import { useState } from 'react';
import { DeviceProvider } from '../context/DeviceContext';
import ConfirmDevice from '../screens/devices/ConfirmDeviceScreen';
import CameraDetail from '../screens/devices/CameraDetailScreen';
import { useAuth } from '../context/AuthContext';
import { canManage, canCreateBranch } from '../utils/validation';
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
import Alerts from '../screens/PlaceholderScreen';
import Tokens from '../screens/admin/TokenScreen';
import Approve from '../screens/admin/ApproveUserScreen';
import Gateway from '../screens/gateways/GatewayScreen';
import Devices from '../screens/devices/DevicesScreen';
import AddDevice from '../screens/devices/AddDeviceScreen';
import RegisteredDevices from '../screens/devices/RegisteredDevicesScreen';
import Guide from '../screens/devices/GuideScreen';
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
import EditLight from '../screens/devices/EditLightScreen';
import SelectShelf from '../screens/devices/SelectShelfScreen';
import AddLight from '../screens/devices/AddLightScreen';
import TestLight from '../screens/devices/TestLightScreen';
import LightUpdated from '../screens/devices/LightUpdatedScreen';
import LightAdded from '../screens/devices/LightAddedScreen';
const publicScreens = { login: Login, register: Register, recovery: Recovery };
const privateScreens = { home: Home, branch: Branch, settings: Settings, panel: Panel, alerts: Alerts, tokens: Tokens, approve: Approve, gateway: Gateway,
  'settings-profile': ProfileSettings, 'settings-notifications': NotificationsSettings, 'settings-security': SecuritySettings, 'settings-logout': Logout,
  'confirm-device': ConfirmDevice, 'camera-detail': CameraDetail, devices: Devices, 'add-device': AddDevice, 'registered-devices': RegisteredDevices, guide: Guide,
  'preparing-search': PreparingSearch, searching: Searching, 'device-found': DeviceFound, 'add-camera': AddCamera,
  'adding-device': AddingDevice, 'device-added': DeviceAdded, 'no-results': NoResults, 'search-error': SearchError,
  'confirm-error': ConfirmError, 'aforo-detail': AforoDetail, 'edit-aforo': EditAforo, 'aforo-updated': AforoUpdated,
  'edit-light': EditLight, 'select-shelf': SelectShelf, 'add-light': AddLight, 'test-light': TestLight,
  'light-updated': LightUpdated, 'light-added': LightAdded };
const deviceRoutes = new Set(['gateway', 'devices', 'add-device', 'registered-devices', 'guide', 'preparing-search', 'searching', 'device-found', 'add-camera', 'adding-device', 'device-added', 'no-results', 'search-error', 'confirm-error', 'confirm-device', 'camera-detail', 'aforo-detail', 'edit-aforo', 'aforo-updated', 'edit-light', 'select-shelf', 'add-light', 'test-light', 'light-updated', 'light-added']);
function PublicNavigator() {
  const [route, go] = useState('login'); const Screen = publicScreens[route] || Login;
  return <Screen key={route} go={go} />;
}
function PrivateNavigator() {
  const { user } = useAuth(); const [route, setRoute] = useState('home');
  const go = (next) => {
    if (next === 'branch' && !canCreateBranch(user)) return;
    if ((['tokens', 'approve'].includes(next) || deviceRoutes.has(next)) && !canManage(user)) return;
    setRoute(privateScreens[next] ? next : 'home');
  };
  const allowedRoute = route === 'branch' && !canCreateBranch(user) || (['tokens', 'approve'].includes(route) || deviceRoutes.has(route)) && !canManage(user) ? 'home' : route;
  const Screen = privateScreens[allowedRoute] || Home;
  return <Screen key={allowedRoute} go={go} />;
}
export function AppNavigator() {
  const { session } = useAuth(); return session ? <DeviceProvider key={`${session.user.id}:${session.user.branch_id || 'none'}`}><PrivateNavigator /></DeviceProvider> : <PublicNavigator />;
}
