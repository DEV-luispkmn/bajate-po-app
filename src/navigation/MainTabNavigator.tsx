import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CanchasScreen } from '../screens/canchas/CanchasScreen';
import { EquiposScreen } from '../screens/equipos/EquiposScreen';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();

  // En Android con cajonera de botones / taskbar / barra de navegación tradicional,
  // insets.bottom entrega la altura exacta de la barra del sistema (ej: 48px - 56px).
  // Sumamos ese inset a la altura total y al padding inferior para que los 4 botones
  // (Inicio, Mapa, Equipos, Perfil) queden perfectamente elevados y visibles.
  const bottomInset = Math.max(insets.bottom, 10);
  const alturaTabBar = 58 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          height: alturaTabBar,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.5,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarLabel: 'INICIO',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Mapa"
        component={CanchasScreen}
        options={{
          tabBarLabel: 'MAPA',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-radius" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Equipos"
        component={EquiposScreen}
        options={{
          tabBarLabel: 'EQUIPOS',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="shield-account" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          tabBarLabel: 'PERFIL',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size || 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
