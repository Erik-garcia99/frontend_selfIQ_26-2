import { useState } from 'react';
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
const publicScreens = { login: Login, register: Register, recovery: Recovery };
const privateScreens = { home: Home, branch: Branch, settings: Settings, panel: Panel, alerts: Alerts, tokens: Tokens, approve: Approve, gateway: Gateway,
  'settings-profile': ProfileSettings, 'settings-notifications': NotificationsSettings, 'settings-security': SecuritySettings, 'settings-logout': Logout };
function PublicNavigator() {
  const [route, go] = useState('login'); const Screen = publicScreens[route] || Login;
  return <Screen key={route} go={go} />;
}
function PrivateNavigator() {
  const { user } = useAuth(); const [route, setRoute] = useState('home');
  const go = (next) => {
    if (next === 'branch' && !canCreateBranch(user)) return;
    if (['tokens', 'approve', 'gateway'].includes(next) && !canManage(user)) return;
    setRoute(privateScreens[next] ? next : 'home');
  };
  const allowedRoute = route === 'branch' && !canCreateBranch(user) || ['tokens', 'approve', 'gateway'].includes(route) && !canManage(user) ? 'home' : route;
  const Screen = privateScreens[allowedRoute] || Home;
  return <Screen key={allowedRoute} go={go} />;
}
export function AppNavigator() {
  const { session } = useAuth(); return session ? <PrivateNavigator key={session.user.id} /> : <PublicNavigator />;
}
