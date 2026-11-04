import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CanchasScreen } from '../screens/canchas/CanchasScreen';
import { EquiposScreen } from '../screens/equipos/EquiposScreen';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarLabel: 'INICIO',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Mapa"
        component={CanchasScreen}
        options={{
          tabBarLabel: 'MAPA',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-radius" size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Equipos"
        component={EquiposScreen}
        options={{
          tabBarLabel: 'EQUIPOS',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="shield-account" size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          tabBarLabel: 'PERFIL',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size || 22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
