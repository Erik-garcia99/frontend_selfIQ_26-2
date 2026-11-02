import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/app/AppNavigator';
import { configureDeviceAdapter } from './src/services/deviceService';
import { deviceAdapter } from './src/services/deviceAdapter';
import { colors } from './src/theme/colors';
configureDeviceAdapter(deviceAdapter);
export default function App() {
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><StatusBar style="dark" />
    <View style={{ flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
      <AuthProvider><AppNavigator /></AuthProvider>
    </View>
  </SafeAreaView>;
}
