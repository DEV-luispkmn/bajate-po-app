import React from 'react';
import { LogBox, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  ChakraPetch_600SemiBold,
  ChakraPetch_700Bold,
} from '@expo-google-fonts/chakra-petch';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

// Silenciar avisos informativos propios del entorno de desarrollo Expo Go
LogBox.ignoreLogs([
  '[expo-notifications] Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ChakraPetch_600SemiBold,
    ChakraPetch_700Bold,
    JetBrainsMono_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
