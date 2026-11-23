import React from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Silenciar avisos informativos propios del entorno de desarrollo Expo Go
LogBox.ignoreLogs([
  '[expo-notifications] Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function App() {
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
