import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from './types';
import { colors } from '../theme/colors';

// Navegador de pestañas inferiores (Inicio, Mapa, Perfil)
import { MainTabNavigator } from './MainTabNavigator';

// Pantallas
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegistroScreen } from '../screens/auth/RegistroScreen';
import { CrearEventoScreen } from '../screens/eventos/CrearEventoScreen';
import { EventoDetalleScreen } from '../screens/eventos/EventoDetalleScreen';
import { EscanerQrScreen } from '../screens/eventos/EscanerQrScreen';
import { PartidaEnVivoScreen } from '../screens/partidas/PartidaEnVivoScreen';
import { AjustesScreen } from '../screens/ajustes/AjustesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { jugador, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '900',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {jugador ? (
          // Flujo Principal de la App (Tabs)
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CrearEvento"
              component={CrearEventoScreen}
              options={{ title: 'NUEVA OPERACIÓN' }}
            />
            <Stack.Screen
              name="EventoDetalle"
              component={EventoDetalleScreen}
              options={{ title: 'DETALLE DEL EVENTO' }}
            />
            <Stack.Screen
              name="EscanerQr"
              component={EscanerQrScreen}
              options={{ title: 'RADAR TÁCTICO QR', headerShown: false }}
            />
            <Stack.Screen
              name="PartidaEnVivo"
              component={PartidaEnVivoScreen}
              options={{ title: 'TRANSMISIÓN EN VIVO' }}
            />
            <Stack.Screen
              name="Ajustes"
              component={AjustesScreen}
              options={{ title: 'AJUSTES TÁCTICOS' }}
            />
          </>
        ) : (
          // Flujo de Autenticación
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Registro"
              component={RegistroScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
