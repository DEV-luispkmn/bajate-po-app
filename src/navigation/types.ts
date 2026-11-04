import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Registro: undefined;

  // App Navegación Principal
  MainTabs: undefined;

  // Pantallas de acción y detalle
  CrearEvento: undefined;
  EventoDetalle: { eventoId: number };
  EscanerQr: undefined;
  PartidaEnVivo: { partidaId: number; titulo?: string };
  Ajustes: undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
