import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PartidaHistorialItem, MedallaItem } from '../api/auth.service';

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

  // Perfil Desglosado
  HistorialCompleto: { historial?: PartidaHistorialItem[] } | undefined;
  MedalleroCompleto: { medallas?: MedallaItem[] } | undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
