import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import {
  Notificacion,
  listarNotificacionesApi,
  marcarNotificacionLeidaApi,
  marcarTodasNotificacionesLeidasApi,
} from '../api/notificaciones.service';

interface ModalNotificacionesProps {
  visible: boolean;
  onClose: () => void;
  onActualizarConteo?: (noLeidas: number) => void;
}

export const ModalNotificaciones: React.FC<ModalNotificacionesProps> = ({
  visible,
  onClose,
  onActualizarConteo,
}) => {
  const navigation = useNavigation<any>();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandidaId, setExpandidaId] = useState<number | null>(null);

  const cargarNotificaciones = async () => {
    try {
      const res = await listarNotificacionesApi();
      setNotificaciones(res.notificaciones);
      if (onActualizarConteo) {
        onActualizarConteo(res.noLeidas);
      }
    } catch {
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setCargando(true);
      cargarNotificaciones();
    }
  }, [visible]);

  const handleMarcarLeida = async (id: number) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    );
    try {
      await marcarNotificacionLeidaApi(id);
      const res = await listarNotificacionesApi();
      if (onActualizarConteo) {
        onActualizarConteo(res.noLeidas);
      }
    } catch {}
  };

  const handleMarcarTodasLeidas = async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    if (onActualizarConteo) {
      onActualizarConteo(0);
    }
    try {
      await marcarTodasNotificacionesLeidasApi();
    } catch {}
  };

  const parseLinkData = (link?: string | null) => {
    if (!link) return null;
    try {
      return JSON.parse(link);
    } catch {
      if (link.startsWith('evento:')) {
        return { screen: 'EventoDetalle', params: { eventoId: parseInt(link.split(':')[1], 10) } };
      }
      if (link.startsWith('equipo:')) {
        return { screen: 'Equipos', params: { tab: 'MI_EQUIPO', equipoId: parseInt(link.split(':')[1], 10) } };
      }
      return null;
    }
  };

  const handlePressNotificacion = async (notif: Notificacion) => {
    if (!notif.leida) {
      handleMarcarLeida(notif.id);
    }

    const dataLink = parseLinkData(notif.link);

    // 1. Postulación Rechazada: alternar despliegue del motivo
    if (notif.tipo === 'POSTULACION_RECHAZADA') {
      setExpandidaId((prev) => (prev === notif.id ? null : notif.id));
      return;
    }

    // 2. Partida / Evento Cancelado o Próximo: ir a la descripción de la partida
    if (
      notif.tipo === 'EVENTO_CANCELADO' ||
      dataLink?.screen === 'EventoDetalle' ||
      dataLink?.eventoId
    ) {
      const eventoId = dataLink?.params?.eventoId || dataLink?.eventoId;
      if (eventoId) {
        onClose();
        navigation.navigate('EventoDetalle', { eventoId });
        return;
      }
    }

    // 3. Postulación Recibida o Aceptada: ir a la pantalla de Equipos / Mi Equipo
    if (
      notif.tipo === 'POSTULACION_APROBADA' ||
      notif.tipo === 'NUEVA_POSTULACION' ||
      dataLink?.screen === 'Equipos'
    ) {
      onClose();
      navigation.navigate('MainTabs', {
        screen: 'Equipos',
        params: {
          tab: 'MI_EQUIPO',
          subTab: notif.tipo === 'NUEVA_POSTULACION' ? 'POSTULACIONES' : undefined,
        },
      });
      return;
    }

    // Fallback con pantalla genérica
    if (dataLink?.screen) {
      onClose();
      navigation.navigate(dataLink.screen, dataLink.params);
      return;
    }

    // Si no tiene navegación, alternar despliegue de detalles
    setExpandidaId((prev) => (prev === notif.id ? null : notif.id));
  };

  const getIconoYColor = (tipo: string) => {
    switch (tipo) {
      case 'POSTULACION_APROBADA':
        return { name: 'shield-check' as const, color: colors.success };
      case 'POSTULACION_RECHAZADA':
        return { name: 'shield-remove' as const, color: colors.danger };
      case 'NUEVA_POSTULACION':
        return { name: 'account-clock' as const, color: colors.warning };
      case 'EVENTO_CANCELADO':
        return { name: 'calendar-remove' as const, color: colors.danger };
      default:
        return { name: 'bell-outline' as const, color: colors.primary };
    }
  };

  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return fecha.toLocaleDateString();
  };

  const hayNoLeidas = notificaciones.some((n) => !n.leida);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialCommunityIcons name="bell-ring" size={22} color={colors.primary} />
              <Text style={styles.modalTitulo}>NOTIFICACIONES</Text>
            </View>
            {hayNoLeidas && (
              <TouchableOpacity
                style={styles.btnMarcarTodas}
                onPress={handleMarcarTodasLeidas}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Marcar todas las notificaciones como leídas"
              >
                <Text style={styles.txtMarcarTodas}>LEER TODAS</Text>
              </TouchableOpacity>
            )}
          </View>

          {cargando ? (
            <View style={styles.centroCargando}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : notificaciones.length === 0 ? (
            <View style={styles.sinNotificaciones}>
              <MaterialCommunityIcons name="bell-sleep" size={42} color={colors.textMuted} />
              <Text style={styles.txtSinNotificaciones}>
                No tienes notificaciones pendientes.
              </Text>
              <Text style={styles.subSinNotificaciones}>
                Aquí verás las respuestas de tus postulaciones, avisos de escuadrón y eventos.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {notificaciones.map((notif) => {
                const { name, color } = getIconoYColor(notif.tipo);
                const dataLink = parseLinkData(notif.link);
                const estaExpandida = expandidaId === notif.id;

                const esRechazada = notif.tipo === 'POSTULACION_RECHAZADA';
                const esEvento =
                  notif.tipo === 'EVENTO_CANCELADO' ||
                  dataLink?.screen === 'EventoDetalle' ||
                  Boolean(dataLink?.eventoId);
                const esEquipo =
                  notif.tipo === 'POSTULACION_APROBADA' ||
                  notif.tipo === 'NUEVA_POSTULACION' ||
                  dataLink?.screen === 'Equipos';

                // Motivo extraído de dataLink o mensaje
                const motivoRechazo = dataLink?.motivo || null;

                return (
                  <TouchableOpacity
                    key={notif.id}
                    style={[
                      styles.notifItem,
                      !notif.leida && styles.notifItemNoLeida,
                    ]}
                    onPress={() => handlePressNotificacion(notif)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconoBox, { backgroundColor: `${color}1A`, borderColor: color }]}>
                      <MaterialCommunityIcons name={name} size={18} color={color} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={styles.tituloRow}>
                        <Text style={[styles.notifTitulo, !notif.leida && styles.notifTituloNoLeida]}>
                          {notif.titulo}
                        </Text>
                        {!notif.leida && <View style={styles.puntoNoLeida} />}
                      </View>

                      <Text style={styles.notifMensaje}>{notif.mensaje}</Text>

                      {/* Botón o llamada de acción contextual */}
                      {esEvento && (
                        <View style={styles.accionInlineRow}>
                          <View style={styles.badgeAccionInline}>
                            <MaterialCommunityIcons name="calendar-search" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                            <Text style={styles.txtBadgeAccionInline}>IR A LA PARTIDA ➔</Text>
                          </View>
                        </View>
                      )}

                      {esEquipo && (
                        <View style={styles.accionInlineRow}>
                          <View style={[styles.badgeAccionInline, { borderColor: colors.success, backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                            <MaterialCommunityIcons name="shield-account" size={13} color={colors.success} style={{ marginRight: 4 }} />
                            <Text style={[styles.txtBadgeAccionInline, { color: colors.success }]}>
                              {notif.tipo === 'NUEVA_POSTULACION' ? 'VER EN PANEL TL ➔' : 'IR A MI EQUIPO ➔'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {esRechazada && (
                        <View style={styles.accionInlineRow}>
                          <View style={[styles.badgeAccionInline, { borderColor: colors.danger, backgroundColor: colors.dangerSoft }]}>
                            <MaterialCommunityIcons
                              name={estaExpandida ? 'chevron-up' : 'alert-circle-outline'}
                              size={13}
                              color={colors.danger}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.txtBadgeAccionInline, { color: colors.danger }]}>
                              {estaExpandida ? 'OCULTAR MOTIVO' : 'VER MOTIVO DE RECHAZO ▾'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Cuadro Desplegable con el Motivo de Rechazo */}
                      {esRechazada && estaExpandida && (
                        <View style={styles.motivoRechazoBox}>
                          <View style={styles.motivoRechazoHeader}>
                            <MaterialCommunityIcons name="comment-alert-outline" size={14} color={colors.danger} style={{ marginRight: 5 }} />
                            <Text style={styles.txtMotivoRechazoHeader}>MOTIVO INFORMADO POR EL TL:</Text>
                          </View>
                          <Text style={styles.txtMotivoRechazo}>
                            {motivoRechazo ? `"${motivoRechazo}"` : 'No se especificó un motivo en particular para esta decisión.'}
                          </Text>
                        </View>
                      )}

                      <Text style={styles.notifFecha}>{formatearFecha(notif.createdAt)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.btnCerrar}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar panel de notificaciones"
          >
            <Text style={styles.txtBtnCerrar}>CERRAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitulo: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  btnMarcarTodas: {
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  txtMarcarTodas: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  centroCargando: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  sinNotificaciones: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txtSinNotificaciones: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  subSinNotificaciones: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 15,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  notifItemNoLeida: {
    backgroundColor: 'rgba(224, 109, 40, 0.06)',
    borderColor: colors.primaryBorder,
  },
  iconoBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 2,
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitulo: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  notifTituloNoLeida: {
    color: colors.primary,
    fontWeight: '900',
  },
  puntoNoLeida: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 6,
  },
  notifMensaje: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  accionInlineRow: {
    marginTop: 6,
    flexDirection: 'row',
  },
  badgeAccionInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  txtBadgeAccionInline: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  motivoRechazoBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  motivoRechazoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  txtMotivoRechazoHeader: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtMotivoRechazo: {
    color: colors.text,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  notifFecha: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  btnCerrar: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    minHeight: 44,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtBtnCerrar: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
