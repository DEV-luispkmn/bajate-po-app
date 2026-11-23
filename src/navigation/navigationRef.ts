import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Redirección inteligente al interactuar con una notificación del sistema
 */
export function navegarDesdeNotificacion(data: any) {
  if (!navigationRef.isReady()) return;

  let dataLink = data;
  if (typeof data?.link === 'string') {
    try {
      dataLink = JSON.parse(data.link);
    } catch {}
  }

  if (
    data?.tipo === 'EVENTO_CANCELADO' ||
    dataLink?.screen === 'EventoDetalle' ||
    dataLink?.eventoId
  ) {
    const eventoId = dataLink?.params?.eventoId || dataLink?.eventoId || data?.eventoId;
    if (eventoId) {
      navigationRef.navigate('EventoDetalle', { eventoId: Number(eventoId) });
      return;
    }
  }

  if (
    data?.tipo === 'POSTULACION_APROBADA' ||
    data?.tipo === 'NUEVA_POSTULACION' ||
    dataLink?.screen === 'Equipos'
  ) {
    (navigationRef as any).navigate('MainTabs', {
      screen: 'Equipos',
      params: {
        tab: 'MI_EQUIPO',
        subTab: data?.tipo === 'NUEVA_POSTULACION' ? 'POSTULACIONES' : undefined,
      },
    });
    return;
  }

  if (dataLink?.screen) {
    (navigationRef as any).navigate(dataLink.screen, dataLink.params);
  }
}
