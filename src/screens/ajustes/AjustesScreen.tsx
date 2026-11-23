import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ModalConfirmacionTactico } from '../../components/ModalConfirmacionTactico';
import {
  crearTicketApi,
  listarMisTicketsApi,
  actualizarPreferenciaNotificacionesApi,
  TicketSoporte,
} from '../../api/configuracion.service';
import {
  configurarNotificacionesTelefono,
  cancelarTodasLasNotificacionesProgramadas,
} from '../../services/deviceNotifications.service';
import { colors } from '../../theme/colors';
import type { NavigationProp } from '../../navigation/types';
import { useNavigation } from '@react-navigation/native';

const TIPOS_TICKET: { tipo: 'IDEA' | 'SUGERENCIA' | 'PROBLEMA' | 'OTRO'; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { tipo: 'IDEA', label: 'Idea / Propuesta', icon: 'lightbulb-outline' },
  { tipo: 'SUGERENCIA', label: 'Sugerencia', icon: 'comment-text-outline' },
  { tipo: 'PROBLEMA', label: 'Reporte / Problema', icon: 'alert-circle-outline' },
  { tipo: 'OTRO', label: 'Otro / Reactivación', icon: 'restore' },
];

export const AjustesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { jugador, logout, recargarPerfil } = useAuth();

  // Preferencia de notificaciones vinculada al perfil del jugador
  const [notificacionesActivas, setNotificacionesActivas] = useState(
    jugador?.recibeNotificaciones ?? true,
  );
  const [guardandoNotif, setGuardandoNotif] = useState(false);

  useEffect(() => {
    if (jugador && typeof jugador.recibeNotificaciones === 'boolean') {
      setNotificacionesActivas(jugador.recibeNotificaciones);
    }
  }, [jugador?.recibeNotificaciones]);

  // Tickets de administración
  const [misTickets, setMisTickets] = useState<TicketSoporte[]>([]);
  const [cargandoTickets, setCargandoTickets] = useState(false);

  // Modal para redactar ticket
  const [modalTicketVisible, setModalTicketVisible] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'IDEA' | 'SUGERENCIA' | 'PROBLEMA' | 'OTRO'>('IDEA');
  const [tituloTicket, setTituloTicket] = useState('');
  const [mensajeTicket, setMensajeTicket] = useState('');
  const [enviandoTicket, setEnviandoTicket] = useState(false);
  const [errorTicketModal, setErrorTicketModal] = useState<string | null>(null);
  const [modalExitoTicketVisible, setModalExitoTicketVisible] = useState(false);
  const [modalAvisoNotifVisible, setModalAvisoNotifVisible] = useState(false);
  const [modalLogoutVisible, setModalLogoutVisible] = useState(false);

  useEffect(() => {
    cargarTickets();
  }, []);

  const cargarTickets = async () => {
    try {
      setCargandoTickets(true);
      const data = await listarMisTicketsApi();
      setMisTickets(data);
    } catch {
      // Manejo silencioso
    } finally {
      setCargandoTickets(false);
    }
  };

  const handleToggleNotificaciones = async (valor: boolean) => {
    setNotificacionesActivas(valor);
    try {
      setGuardandoNotif(true);
      await actualizarPreferenciaNotificacionesApi(valor);
      if (!valor) {
        // Silenciar y cancelar todas las notificaciones agendadas en el teléfono
        await cancelarTodasLasNotificacionesProgramadas();
      } else {
        // Volver a inicializar canal y permisos tácticos
        await configurarNotificacionesTelefono(jugador?.id);
      }
      if (recargarPerfil) {
        await recargarPerfil().catch(() => null);
      }
    } catch {
      // Revertir si falla
      setNotificacionesActivas(!valor);
      setModalAvisoNotifVisible(true);
    } finally {
      setGuardandoNotif(false);
    }
  };

  const handleEnviarTicket = async () => {
    if (!tituloTicket.trim() || !mensajeTicket.trim()) {
      setErrorTicketModal('Por favor ingresa un asunto y el detalle de tu ticket.');
      return;
    }
    setErrorTicketModal(null);

    try {
      setEnviandoTicket(true);
      await crearTicketApi({
        tipo: tipoSeleccionado,
        titulo: tituloTicket.trim(),
        mensaje: mensajeTicket.trim(),
      });

      setModalTicketVisible(false);
      setTituloTicket('');
      setMensajeTicket('');
      setErrorTicketModal(null);
      setModalExitoTicketVisible(true);
      cargarTickets();
    } catch (error: any) {
      setErrorTicketModal(error.message || 'No se pudo enviar el ticket.');
    } finally {
      setEnviandoTicket(false);
    }
  };

  const handleCerrarSesion = () => {
    setModalLogoutVisible(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Tarjeta de Ficha de Operador */}
      <View style={styles.cardOperador}>
        <View style={styles.avatarMini}>
          <MaterialCommunityIcons name="shield-account" size={26} color={colors.primary} />
        </View>
        <View style={styles.operadorInfo}>
          <Text style={styles.operadorTag}>OPERADOR REGISTRADO</Text>
          <Text style={styles.operadorAlias}>{jugador?.alias?.toUpperCase() || 'SOLDADO'}</Text>
          <Text style={styles.operadorDetalle}>
            {jugador?.region || 'Región Metropolitana'} • {jugador?.email}
          </Text>
        </View>
      </View>

      {/* 2. Sección: Notificaciones Tácticas */}
      <View style={styles.seccionCard}>
        <View style={styles.seccionHeader}>
          <MaterialCommunityIcons name="bell-ring-outline" size={20} color={colors.primary} />
          <Text style={styles.seccionTitulo}>RECORDATORIOS Y ALERTAS</Text>
        </View>

        <View style={styles.filaAjuste}>
          <View style={styles.infoAjuste}>
            <Text style={styles.ajusteNombre}>Notificaciones Generales</Text>
            <Text style={styles.ajusteDesc}>
              Activa o desactiva todas las alertas en tu teléfono (recordatorios de partidas, convocatorias y avisos de escuadrón).
            </Text>
          </View>
          <Switch
            value={notificacionesActivas}
            onValueChange={handleToggleNotificaciones}
            trackColor={{ false: colors.inputBg, true: colors.primary }}
            thumbColor={notificacionesActivas ? '#fff' : colors.textMuted}
            disabled={guardandoNotif}
          />
        </View>
      </View>

      {/* 3. Sección: Buzón de Comandancia (Tickets / Ideas) */}
      <View style={styles.seccionCard}>
        <View style={styles.seccionHeader}>
          <MaterialCommunityIcons name="bullhorn-outline" size={20} color={colors.primary} />
          <Text style={styles.seccionTitulo}>BUZÓN DE COMANDANCIA & IDEAS</Text>
        </View>
        <Text style={styles.seccionDesc}>
          ¿Tienes una idea para la app o quieres reportar un inconveniente? Escríbele directo a los administradores.
        </Text>

        <TouchableOpacity
          style={styles.btnCrearTicket}
          onPress={() => setModalTicketVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.txtBtnCrearTicket}>TRANSMITIR IDEA O TICKET</Text>
        </TouchableOpacity>

        {/* Historial de tickets del usuario */}
        <View style={styles.historialTickets}>
          <Text style={styles.subtituloHistorial}>TUS TRANSMISIONES ANTERIORES:</Text>
          {cargandoTickets ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
          ) : misTickets.filter((t) => t.tipo !== 'CANCHA').length === 0 ? (
            <Text style={styles.sinTicketsTxt}>Aún no has enviado ninguna idea o reporte.</Text>
          ) : (
            misTickets.filter((t) => t.tipo !== 'CANCHA').map((t) => {
              const bordeTicket =
                t.estado === 'RESPONDIDO'
                  ? '#10B981'
                  : t.estado === 'EN_REVISION'
                  ? '#F59E0B'
                  : colors.primary;

              return (
                <View key={t.id} style={[styles.ticketItem, { borderLeftColor: bordeTicket }]}>
                  <View style={styles.ticketHeader}>
                  <Text style={styles.ticketTipo}>[{t.tipo}]</Text>
                  <View
                    style={[
                      styles.ticketEstadoBadge,
                      t.estado === 'RESPONDIDO'
                        ? styles.badgeRespondido
                        : t.estado === 'EN_REVISION'
                        ? styles.badgeRevision
                        : styles.badgePendiente,
                    ]}
                  >
                    <Text style={styles.ticketEstadoTxt}>{t.estado}</Text>
                  </View>
                </View>
                <Text style={styles.ticketTitulo}>{t.titulo}</Text>
                <Text style={styles.ticketMensaje}>{t.mensaje}</Text>

                {t.respuestaAdmin && (
                  <View style={styles.respuestaBox}>
                    <Text style={styles.respuestaLabel}>RESPUESTA DE ADMINISTRACIÓN:</Text>
                    <Text style={styles.respuestaTxt}>{t.respuestaAdmin}</Text>
                  </View>
                )}
              </View>
            );
          }))}
        </View>
      </View>

      {/* 4. Sección: Seguridad y Sesión */}
      <View style={styles.seccionCard}>
        <View style={styles.seccionHeader}>
          <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.danger} />
          <Text style={[styles.seccionTitulo, { color: colors.danger }]}>SESIÓN DE COMBATE</Text>
        </View>
        <Text style={styles.seccionDesc}>
          Cerrar la sesión de operador en este dispositivo.
        </Text>

        <TouchableOpacity
          style={styles.btnCerrarSesion}
          onPress={handleCerrarSesion}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="logout" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.txtBtnCerrarSesion}>CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </View>

      {/* Pie con versión de la app */}
      <View style={styles.footerVersion}>
        <Text style={styles.versionTxt}>BÁJATE PO! AIRSOFT CHILE • VERSIÓN 1.0.0 TACTICAL BUILD</Text>
        <Text style={styles.versionSub}>Hecho para la comunidad táctica nacional</Text>
      </View>

      {/* Modal Redactar Ticket / Idea */}
      <Modal
        visible={modalTicketVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalTicketVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>BUZÓN DE ADMINISTRACIÓN</Text>
                <Text style={styles.modalSubtitulo}>Envía tu idea, reporte o solicitud de reactivación (equipo o cancha).</Text>
              </View>
            </View>

            {/* Selector de Tipo */}
            <Text style={styles.inputLabel}>TIPO DE TRANSMISIÓN:</Text>
            <View style={styles.chipsTipoGrid}>
              {TIPOS_TICKET.map((item) => {
                const activo = tipoSeleccionado === item.tipo;
                return (
                  <TouchableOpacity
                    key={item.tipo}
                    style={[styles.chipTipo, activo && styles.chipTipoActivo]}
                    onPress={() => setTipoSeleccionado(item.tipo)}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={14}
                      color={activo ? colors.primary : colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.chipTipoTxt, activo && styles.chipTipoTxtActivo]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>ASUNTO / TÍTULO:</Text>
            <TextInput
              style={styles.inputTexto}
              placeholder="ej: Solicitud de reactivación de escuadra o cancha"
              placeholderTextColor={colors.textMuted}
              value={tituloTicket}
              onChangeText={(t) => {
                if (errorTicketModal) setErrorTicketModal(null);
                setTituloTicket(t);
              }}
              maxLength={150}
            />

            <Text style={styles.inputLabel}>MENSAJE / DETALLES:</Text>
            <TextInput
              style={[styles.inputTexto, styles.inputArea]}
              placeholder="Describe tu propuesta, reporte o motivo de reactivación..."
              placeholderTextColor={colors.textMuted}
              value={mensajeTicket}
              onChangeText={(t) => {
                if (errorTicketModal) setErrorTicketModal(null);
                setMensajeTicket(t);
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {errorTicketModal ? (
              <View style={styles.bannerErrorModal}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.txtErrorModal}>{errorTicketModal}</Text>
              </View>
            ) : null}

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => {
                  setErrorTicketModal(null);
                  setModalTicketVisible(false);
                }}
              >
                <Text style={styles.txtCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnEnviarModal, enviandoTicket && styles.btnDeshabilitado]}
                onPress={handleEnviarTicket}
                disabled={enviandoTicket}
              >
                {enviandoTicket ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.txtEnviarModal}>TRANSMITIR</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Confirmación Transmisión Exitosa */}
      <ModalConfirmacionTactico
        visible={modalExitoTicketVisible}
        titulo="TRANSMISIÓN ENVIADA"
        mensaje="Tu ticket ha sido entregado a la comandancia de administración. Te responderemos a la brevedad."
        textoConfirmar="ENTENDIDO"
        tipo="exito"
        icono="email-check-outline"
        soloAceptar
        onConfirmar={() => setModalExitoTicketVisible(false)}
      />

      {/* Modal Aviso Error Sincronización Notificaciones */}
      <ModalConfirmacionTactico
        visible={modalAvisoNotifVisible}
        titulo="AVISO DE SINCRONIZACIÓN"
        mensaje="No se pudo sincronizar la preferencia de notificaciones con la base de datos."
        textoConfirmar="ENTENDIDO"
        tipo="advertencia"
        icono="bell-cancel-outline"
        soloAceptar
        onConfirmar={() => setModalAvisoNotifVisible(false)}
      />

      {/* Modal Táctico de Cierre de Sesión */}
      <ModalConfirmacionTactico
        visible={modalLogoutVisible}
        titulo="¿ABANDONAR LA BASE?"
        mensaje="¿Estás seguro de que deseas cerrar tu sesión de combate?"
        textoConfirmar="CERRAR SESIÓN"
        textoCancelar="CANCELAR"
        tipo="peligro"
        icono="logout-variant"
        onConfirmar={() => {
          setModalLogoutVisible(false);
          logout();
        }}
        onCancelar={() => setModalLogoutVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  cardOperador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatarMini: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  operadorInfo: {
    flex: 1,
  },
  operadorTag: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  operadorAlias: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  operadorDetalle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  seccionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  seccionTitulo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  seccionDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  filaAjuste: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoAjuste: {
    flex: 1,
    marginRight: 12,
  },
  ajusteNombre: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  ajusteDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  btnCrearTicket: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 14,
  },
  txtBtnCrearTicket: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  historialTickets: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 12,
    marginTop: 4,
  },
  subtituloHistorial: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sinTicketsTxt: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  ticketItem: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketTipo: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  ticketEstadoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePendiente: {
    backgroundColor: 'rgba(214, 158, 46, 0.2)',
  },
  badgeRevision: {
    backgroundColor: 'rgba(49, 130, 206, 0.2)',
  },
  badgeRespondido: {
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
  },
  ticketEstadoTxt: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '800',
  },
  ticketTitulo: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  ticketMensaje: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  respuestaBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  respuestaLabel: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  respuestaTxt: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 15,
  },
  btnCerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnCerrarSesion: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerVersion: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 14,
  },
  versionTxt: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  versionSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    width: '100%',
    maxWidth: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitulo: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalSubtitulo: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  chipsTipoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chipTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipTipoActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
  },
  chipTipoTxt: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  chipTipoTxtActivo: {
    color: colors.primary,
    fontWeight: '800',
  },
  inputTexto: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  inputArea: {
    minHeight: 80,
  },
  modalAcciones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  btnCancelarModal: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtCancelarModal: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  btnEnviarModal: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDeshabilitado: {
    opacity: 0.5,
  },
  txtEnviarModal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerErrorModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  txtErrorModal: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
});
