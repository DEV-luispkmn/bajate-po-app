import { colors } from '../theme/colors';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { registrarPushTokenApi } from '../api/notificaciones.service';
import { navegarDesdeNotificacion } from '../navigation/navigationRef';

const KEY_RECORDATORIOS_PREFIX = 'rec_partida_';

export interface PreferenciasRecordatorioPartida {
  diaAntes: boolean;
  min30: boolean;
  diaAntesId?: string | null;
  min30Id?: string | null;
}

// Configuración de cómo se comporta la notificación en primer plano
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Ignorar si el handler no está disponible en este entorno
}

let responseListenerSubscription: any = null;

export async function configurarNotificacionesTelefono(jugadorId?: number) {
  try {
    // 1. Canal Android con máxima prioridad táctica (sin parámetro sound para evitar NPE en Expo Go)
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('tactical_alerts', {
          name: 'Alertas Tácticas Bájate Po!',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: colors.primary,
          enableLights: true,
          enableVibrate: true,
        });
      } catch {
        // En algunas versiones de Expo Go el canal nativo se rechaza; se usa el canal por defecto del sistema
      }
    }

    // 2. Solicitar permisos de notificación en el teléfono
    const permStatus = await Notifications.getPermissionsAsync().catch(() => null);
    let finalStatus = permStatus?.status;
    if (finalStatus !== 'granted') {
      const reqStatus = await Notifications.requestPermissionsAsync().catch(() => null);
      finalStatus = reqStatus?.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // 3. Registrar Push Token si el usuario está autenticado y no está en Expo Go (donde FCM no aplica desde SDK 53)
    const esExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (jugadorId && !esExpoGo) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
        if (tokenData?.data) {
          await registrarPushTokenApi(tokenData.data).catch(() => null);
        }
      } catch {
        // En Expo Go o sin Google Services el push remoto no aplica, pero las locales funcionan al 100%
      }
    }

    // 4. Configurar listener al tocar la notificación en la barra del teléfono
    if (!responseListenerSubscription) {
      try {
        responseListenerSubscription = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response?.notification?.request?.content?.data;
            if (data) {
              navegarDesdeNotificacion(data);
            }
          },
        );
      } catch {
        // Listener pasivo si no está soportado en Expo Go
      }
    }
  } catch (error) {
    console.error('Error configurando notificaciones del teléfono:', error);
  }
}

/**
 * Dispara una notificación inmediata en el sistema del teléfono (barra de estado, sonido y banner).
 */
export async function mostrarNotificacionTelefono(
  titulo: string,
  mensaje: string,
  data?: any,
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: mensaje,
        data: data || {},
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' ? { channelId: 'tactical_alerts' } : {}),
      },
      trigger: null, // Inmediata en el sistema
    });
  } catch {
    // Si falla por canal específico en Expo Go, emitir con canal predeterminado de Android
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: mensaje,
          data: data || {},
        },
        trigger: null,
      });
    } catch {
      // Notificación omitida si el entorno móvil la bloquea
    }
  }
}

/**
 * Obtiene el estado de los recordatorios programados para una partida específica.
 */
export async function obtenerRecordatoriosPartida(
  eventoId: number,
): Promise<PreferenciasRecordatorioPartida> {
  try {
    const raw = await SecureStore.getItemAsync(`${KEY_RECORDATORIOS_PREFIX}${eventoId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return { diaAntes: false, min30: false, diaAntesId: null, min30Id: null };
}

/**
 * Programa una notificación de recordatorio en el móvil (día anterior o 30 minutos antes).
 */
export async function programarRecordatorioPartida(
  eventoId: number,
  tituloEvento: string,
  fechaInicioStr: string | Date,
  tipo: 'DIA_ANTERIOR' | '30_MINUTOS',
): Promise<{ ok: boolean; id?: string; mensajeError?: string }> {
  try {
    const fechaInicio = new Date(fechaInicioStr);
    const ahora = new Date();
    let triggerDate: Date;
    let titulo: string;
    let cuerpo: string;

    if (tipo === 'DIA_ANTERIOR') {
      triggerDate = new Date(fechaInicio.getTime() - 24 * 60 * 60 * 1000);
      titulo = '🎯 ¡Mañana tienes partida!';
      cuerpo = `Operación "${tituloEvento}" mañana. ¡Revisa tu equipamiento y réplica!`;
    } else {
      triggerDate = new Date(fechaInicio.getTime() - 30 * 60 * 1000);
      titulo = '⏳ ¡Tu partida empieza en 30 minutos!';
      cuerpo = `La operación "${tituloEvento}" inicia en media hora. ¡Prepárate para el despliegue!`;
    }

    if (triggerDate.getTime() <= ahora.getTime()) {
      return {
        ok: false,
        mensajeError:
          tipo === 'DIA_ANTERIOR'
            ? 'El plazo para el recordatorio del día anterior ya pasó.'
            : 'La partida inicia en menos de 30 minutos.',
      };
    }

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        data: { screen: 'EventoDetalle', eventoId },
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' ? { channelId: 'tactical_alerts' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    const pref = await obtenerRecordatoriosPartida(eventoId);
    if (tipo === 'DIA_ANTERIOR') {
      pref.diaAntes = true;
      pref.diaAntesId = notifId;
    } else {
      pref.min30 = true;
      pref.min30Id = notifId;
    }

    await SecureStore.setItemAsync(
      `${KEY_RECORDATORIOS_PREFIX}${eventoId}`,
      JSON.stringify(pref),
    );

    return { ok: true, id: notifId };
  } catch (error: any) {
    return { ok: false, mensajeError: error?.message || 'Error programando recordatorio' };
  }
}

/**
 * Cancela uno de los recordatorios de una partida.
 */
export async function cancelarRecordatorioPartida(
  eventoId: number,
  tipo: 'DIA_ANTERIOR' | '30_MINUTOS',
): Promise<void> {
  try {
    const pref = await obtenerRecordatoriosPartida(eventoId);
    const notifId = tipo === 'DIA_ANTERIOR' ? pref.diaAntesId : pref.min30Id;
    if (notifId) {
      await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => null);
    }
    if (tipo === 'DIA_ANTERIOR') {
      pref.diaAntes = false;
      pref.diaAntesId = null;
    } else {
      pref.min30 = false;
      pref.min30Id = null;
    }
    await SecureStore.setItemAsync(
      `${KEY_RECORDATORIOS_PREFIX}${eventoId}`,
      JSON.stringify(pref),
    );
  } catch {}
}

/**
 * Cancela y elimina todos los recordatorios asociados a un evento (ej: si se baja de la partida, terminó o se canceló).
 */
export async function limpiarRecordatoriosDePartida(eventoId: number): Promise<void> {
  try {
    const idNum = Number(eventoId);
    if (!idNum) return;

    const pref = await obtenerRecordatoriosPartida(idNum);
    if (pref.diaAntesId) {
      await Notifications.cancelScheduledNotificationAsync(pref.diaAntesId).catch(() => null);
    }
    if (pref.min30Id) {
      await Notifications.cancelScheduledNotificationAsync(pref.min30Id).catch(() => null);
    }
    await SecureStore.deleteItemAsync(`${KEY_RECORDATORIOS_PREFIX}${idNum}`).catch(() => null);

    // Barrido preventivo: cancelar cualquier notificación programada en el sistema que apunte a este evento
    try {
      const todasProgramadas = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      for (const notif of todasProgramadas) {
        const data = notif.content?.data;
        if (Number(data?.eventoId) === idNum) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier).catch(() => null);
        }
      }
    } catch {}
  } catch {}
}

/**
 * Revisa una lista de eventos y cancela automáticamente las alertas de aquellos
 * que ya finalizaron o fueron cancelados.
 */
export async function limpiarRecordatoriosEventosInactivos(
  eventos: { id: number; estado: string }[],
): Promise<void> {
  try {
    const inactivos = eventos.filter(
      (e) => e.estado === 'FINALIZADO' || e.estado === 'CANCELADO',
    );
    await Promise.all(inactivos.map((e) => limpiarRecordatoriosDePartida(e.id)));
  } catch {}
}

/**
 * Cancela todas las notificaciones programadas en el sistema (ej: cuando se apaga el switch general).
 */
export async function cancelarTodasLasNotificacionesProgramadas(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => null);
  } catch {}
}
