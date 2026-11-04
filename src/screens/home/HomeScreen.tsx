import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  listarEventosApi,
  buscarEventoPorCodigoApi,
  Evento,
} from '../../api/eventos.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import type { NavigationProp } from '../../navigation/types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { jugador, logout } = useAuth();

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Pestaña activa del Feed: 'CERCA' (Disponibles cerca de ti) | 'INSCRITOS' (Tus activas) | 'HISTORIAL' (Terminadas/Canceladas)
  const [tabFeed, setTabFeed] = useState<'CERCA' | 'INSCRITOS' | 'HISTORIAL'>('CERCA');
  // Explorar eventos de otras regiones si en la mía no hay o quiero ver más
  const [explorarOtrasRegiones, setExplorarOtrasRegiones] = useState(false);

  // Modal para ingresar código táctico de 6 caracteres
  const [modalCodigoVisible, setModalCodigoVisible] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);


  const miId = jugador?.id;
  const miRegion = jugador?.region || 'Región Metropolitana';

  const handleBuscarPorCodigo = async () => {
    if (!codigoManual.trim()) {
      Alert.alert('Atención', 'Por favor ingresa los 6 caracteres del código.');
      return;
    }
    setBuscandoCodigo(true);
    try {
      const res = await buscarEventoPorCodigoApi(codigoManual.trim().toUpperCase());
      setModalCodigoVisible(false);
      setCodigoManual('');
      navigation.navigate('EventoDetalle', { eventoId: res.evento.id });
    } catch (error: any) {
      Alert.alert(
        'Código no encontrado',
        error.message || 'No existe ninguna operación con este código de invitación táctico.',
      );
    } finally {
      setBuscandoCodigo(false);
    }
  };

  const cargarEventos = async () => {
    try {
      const data = await listarEventosApi();
      setEventos(data);
    } catch {
      // Error silencioso
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarEventos();
    }, [jugador?.region]),
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarEventos();
  };

  // 1. Eventos activos donde el operador está inscrito (o que organiza)
  const eventosInscritosActivos = eventos.filter(
    (e) =>
      (e.estado === 'PROGRAMADO' || e.estado === 'EN_CURSO') &&
      (e.jugadoresInscritos?.some((j) => j.jugadorId === miId) || e.organizadorId === miId),
  );

  // 2. Historial de eventos (concluidos o cancelados) donde participó o fue organizador
  const eventosHistorial = eventos.filter(
    (e) =>
      (e.estado === 'FINALIZADO' || e.estado === 'CANCELADO') &&
      (e.jugadoresInscritos?.some((j) => j.jugadorId === miId) || e.organizadorId === miId),
  );

  // 3. Eventos disponibles activos donde NO está inscrito ni organiza
  const eventosDisponibles = eventos.filter(
    (e) =>
      (e.estado === 'PROGRAMADO' || e.estado === 'EN_CURSO') &&
      !e.jugadoresInscritos?.some((j) => j.jugadorId === miId) &&
      e.organizadorId !== miId,
  );

  // 4. Eventos disponibles en la región del usuario
  const eventosCerca = eventosDisponibles.filter((e) => {
    if (!e.region) return true;
    if (!miRegion) return true;
    return (
      e.region.trim().toLowerCase() === miRegion.trim().toLowerCase() ||
      e.region.toLowerCase().includes(miRegion.toLowerCase()) ||
      miRegion.toLowerCase().includes(e.region.toLowerCase())
    );
  });

  // Lista final a renderizar según pestaña y alcance geográfico
  const eventosAMostrar =
    tabFeed === 'INSCRITOS'
      ? eventosInscritosActivos
      : tabFeed === 'HISTORIAL'
      ? eventosHistorial
      : explorarOtrasRegiones
      ? eventosDisponibles
      : eventosCerca;

  const renderEvento = ({ item }: { item: Evento }) => {
    const fechaTexto = item.fechaInicio
      ? new Date(item.fechaInicio).toLocaleDateString([], {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : 'Fecha a confirmar';

    const miInscripcion = item.jugadoresInscritos?.find((j) => j.jugadorId === miId);
    const estaInscrito = Boolean(miInscripcion);
    const esTerminadoOCancelado = item.estado === 'FINALIZADO' || item.estado === 'CANCELADO';

    return (
      <View style={[styles.card, estaInscrito && !esTerminadoOCancelado && styles.cardInscrito]}>
        {/* Cabecera de la tarjeta: Tipo, Estado y Badge de Inscrito */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.tagTipo}>
              <Text style={styles.textoTagTipo}>{item.tipo.replace('_', ' ')}</Text>
            </View>
            <View
              style={[
                styles.badgeEstado,
                item.estado === 'EN_CURSO'
                  ? styles.badgeEnCurso
                  : item.estado === 'FINALIZADO'
                  ? styles.badgeFinalizado
                  : item.estado === 'CANCELADO'
                  ? styles.badgeCancelado
                  : styles.badgeProgramado,
              ]}
            >
              <Text
                style={[
                  styles.textoBadgeEstado,
                  item.estado === 'CANCELADO' && { color: colors.danger },
                  item.estado === 'FINALIZADO' && { color: colors.success },
                ]}
              >
                {item.estado.replace('_', ' ')}
              </Text>
            </View>
            {item.privacidad === 'CERRADO' && !esTerminadoOCancelado && (
              <View style={styles.badgePrivadaTag}>
                <MaterialCommunityIcons name="lock" size={11} color={colors.warning} style={{ marginRight: 2 }} />
                <Text style={styles.textoPrivadaTag}>PRIVADA</Text>
              </View>
            )}
          </View>

          {estaInscrito && !esTerminadoOCancelado && (
            <View style={styles.badgeInscritoTag}>
              <MaterialCommunityIcons name="shield-check" size={13} color="#fff" style={{ marginRight: 3 }} />
              <Text style={styles.textoInscritoTag}>ALISTADO</Text>
            </View>
          )}
        </View>

        {/* Título de la partida */}
        <Text style={styles.tituloEvento}>{item.titulo}</Text>

        {/* Motivo de cancelación si aplica */}
        {item.estado === 'CANCELADO' && item.motivoCancelacion && (
          <View style={styles.motivoCancelacionBoxMini}>
            <MaterialCommunityIcons name="alert-circle-outline" size={13} color={colors.danger} style={{ marginRight: 4 }} />
            <Text style={styles.txtMotivoCancelacionMini} numberOfLines={2}>
              Motivo: {item.motivoCancelacion}
            </Text>
          </View>
        )}

        {/* Cancha, Región y Fecha */}
        <View style={styles.infoMeta}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.canchaNombre || 'Campo por confirmar'}
              {item.region ? ` (${item.region.replace('Región ', '')})` : ''}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar-month" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{fechaTexto}</Text>
          </View>
        </View>

        {/* Detalle si está inscrito: su rol asignado */}
        {estaInscrito && miInscripcion && !esTerminadoOCancelado && (
          <View style={styles.bandoRolBox}>
            <MaterialCommunityIcons name="crosshairs" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.bandoRolTxt}>
              Tu rol asignado: <Text style={styles.bandoRolDestacado}>[{miInscripcion.rol}]</Text>
            </Text>
          </View>
        )}

        {/* Botón de acción */}
        <TouchableOpacity
          style={[
            styles.btnVerDetalles,
            estaInscrito && !esTerminadoOCancelado && styles.btnVerDetallesInscrito,
            esTerminadoOCancelado && styles.btnVerDetallesHistorial,
          ]}
          activeOpacity={0.8}
          onPress={() => {
            if (item.privacidad === 'CERRADO' && !estaInscrito && item.organizadorId !== miId && !esTerminadoOCancelado) {
              Alert.alert(
                '🔒 OPERACIÓN PRIVADA',
                `"${item.titulo}" es una partida privada restringida.\nPara ingresar necesitas el código de invitación táctico de 6 caracteres.`,
                [
                  { text: 'VOLVER', style: 'cancel' },
                  {
                    text: 'INGRESAR CÓDIGO',
                    onPress: () => {
                      setCodigoManual('');
                      setModalCodigoVisible(true);
                    },
                  },
                ],
              );
              return;
            }
            navigation.navigate('EventoDetalle', { eventoId: item.id });
          }}
        >
          <Text
            style={[
              styles.txtVerDetalles,
              estaInscrito && !esTerminadoOCancelado && styles.txtVerDetallesInscrito,
              esTerminadoOCancelado && styles.txtVerDetallesHistorial,
            ]}
          >
            {esTerminadoOCancelado
              ? 'REVISAR EVENTO'
              : estaInscrito
              ? 'ENTRAR A LA SALA TÁCTICA'
              : item.privacidad === 'CERRADO'
              ? 'INGRESAR CÓDIGO PRIVADO'
              : 'VER DETALLES Y UNIRSE'}
          </Text>
          <MaterialCommunityIcons
            name={
              esTerminadoOCancelado
                ? 'clipboard-text-outline'
                : estaInscrito
                ? 'arrow-right'
                : item.privacidad === 'CERRADO'
                ? 'lock-outline'
                : 'arrow-right'
            }
            size={16}
            color={
              esTerminadoOCancelado
                ? colors.textSecondary
                : estaInscrito
                ? colors.success
                : item.privacidad === 'CERRADO'
                ? colors.warning
                : colors.primary
            }
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Barra superior: Operador en Línea (Solo texto limpio) */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.saludoOperador}>OPERADOR EN LÍNEA</Text>
          <Text style={styles.aliasOperador}>{jugador?.alias?.toUpperCase() || 'SOLDADO'}</Text>
        </View>
        <TouchableOpacity
          style={styles.botonAjustes}
          onPress={() => navigation.navigate('Ajustes')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="cog-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.textoAjustes}>AJUSTES</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Quick Actions (Botones Grandes Tácticos) */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={[styles.btnQuickAction, styles.btnEscanear]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('EscanerQr')}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={28} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={styles.tituloQuickAction}>UNIRSE A PARTIDA</Text>
          <Text style={styles.subtituloQuickAction}>(ESCANEAR QR)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnQuickAction, styles.btnCrear]}
          activeOpacity={0.85}
          onPress={() => (navigation as any).navigate('CrearEvento')}
        >
          <MaterialCommunityIcons name="calendar-plus" size={28} color={colors.secondary} style={{ marginBottom: 6 }} />
          <Text style={styles.tituloQuickAction}>CREAR EVENTO</Text>
          <Text style={styles.subtituloQuickAction}>PICHANGA / TORNEO</Text>
        </TouchableOpacity>
      </View>

      {/* Banner de Acceso Rápido por Código Táctico */}
      <TouchableOpacity
        style={styles.bannerCodigo}
        onPress={() => setModalCodigoVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.bannerCodigoLeft}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color={colors.primary} />
          <Text style={styles.bannerCodigoTexto}>
            ¿Tienes código de invitación? <Text style={styles.bannerCodigoLink}>Ingrésalo aquí</Text>
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* 3. Pestañas Segmentadas Tácticas: "Disponibles Cerca" vs "Mis Inscripciones" vs "Historial" */}
      <View style={styles.tabsSegmentedContainer}>
        <TouchableOpacity
          style={[styles.tabSegmented, tabFeed === 'CERCA' && styles.tabSegmentedActivo]}
          onPress={() => setTabFeed('CERCA')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={14}
            color={tabFeed === 'CERCA' ? colors.primary : colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabSegmentedTxt, tabFeed === 'CERCA' && styles.tabSegmentedTxtActivo]}>
            CERCA ({eventosCerca.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabSegmented, tabFeed === 'INSCRITOS' && styles.tabSegmentedActivoInscritos]}
          onPress={() => setTabFeed('INSCRITOS')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="shield-check"
            size={14}
            color={tabFeed === 'INSCRITOS' ? colors.success : colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabSegmentedTxt, tabFeed === 'INSCRITOS' && styles.tabSegmentedTxtActivoInscritos]}>
            ACTIVAS ({eventosInscritosActivos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabSegmented, tabFeed === 'HISTORIAL' && styles.tabSegmentedActivoHistorial]}
          onPress={() => setTabFeed('HISTORIAL')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="history"
            size={14}
            color={tabFeed === 'HISTORIAL' ? '#F59E0B' : colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabSegmentedTxt, tabFeed === 'HISTORIAL' && styles.tabSegmentedTxtActivoHistorial]}>
            HISTORIAL ({eventosHistorial.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Barra de Alcance Geográfico (Solo en pestaña CERCA) */}
      {tabFeed === 'CERCA' && (
        <View style={styles.alcanceBar}>
          <View style={styles.alcanceInfo}>
            <MaterialCommunityIcons
              name={explorarOtrasRegiones ? 'earth' : 'map-marker'}
              size={15}
              color={colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.alcanceTxt} numberOfLines={1}>
              {explorarOtrasRegiones
                ? `Explorando todo Chile (${eventosDisponibles.length})`
                : `${miRegion}`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.btnToggleAlcance}
            onPress={() => setExplorarOtrasRegiones(!explorarOtrasRegiones)}
          >
            <Text style={styles.txtToggleAlcance}>
              {explorarOtrasRegiones ? 'SOLO MI REGIÓN' : 'EXPLORAR MÁS EVENTOS ➔'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 5. Lista de Eventos Filtrados */}
      {cargando ? (
        <View style={styles.centroCargando}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.textoCargando}>Buscando operaciones tácticas...</Text>
        </View>
      ) : (
        <FlatList
          data={eventosAMostrar}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEvento}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            tabFeed === 'INSCRITOS' ? (
              <View style={styles.vacio}>
                <MaterialCommunityIcons
                  name="shield-outline"
                  size={52}
                  color={colors.textMuted}
                  style={{ marginBottom: 12 }}
                />
                <Text style={styles.tituloVacio}>Sin operaciones activas</Text>
                <Text style={styles.subtituloVacio}>
                  No tienes partidas en curso o programadas actualmente. Revisa las operaciones disponibles cerca de ti y alístate.
                </Text>
                <TouchableOpacity
                  style={styles.btnIrAExplorar}
                  onPress={() => setTabFeed('CERCA')}
                >
                  <Text style={styles.txtIrAExplorar}>EXPLORAR OPERACIONES DISPONIBLES</Text>
                </TouchableOpacity>
              </View>
            ) : tabFeed === 'HISTORIAL' ? (
              <View style={styles.vacio}>
                <MaterialCommunityIcons
                  name="history"
                  size={52}
                  color={colors.textMuted}
                  style={{ marginBottom: 12 }}
                />
                <Text style={styles.tituloVacio}>Sin historial de operaciones</Text>
                <Text style={styles.subtituloVacio}>
                  Las partidas y eventos concluidos o cancelados en los que hayas participado u organizado quedarán archivados aquí.
                </Text>
              </View>
            ) : (
              <View style={styles.vacio}>
                <MaterialCommunityIcons
                  name="crosshairs"
                  size={52}
                  color={colors.textMuted}
                  style={{ marginBottom: 12 }}
                />
                <Text style={styles.tituloVacio}>
                  {explorarOtrasRegiones
                    ? 'No hay eventos disponibles en Chile'
                    : `Sin operaciones cerca en ${miRegion}`}
                </Text>
                <Text style={styles.subtituloVacio}>
                  {explorarOtrasRegiones
                    ? 'Sé el primero en convocar una partida con el botón "Crear Evento".'
                    : 'Aún no hay partidas creadas en tu región. Puedes convocar una o explorar eventos en otras regiones de Chile.'}
                </Text>

                {!explorarOtrasRegiones && eventosDisponibles.length > 0 && (
                  <TouchableOpacity
                    style={styles.btnIrAExplorar}
                    onPress={() => setExplorarOtrasRegiones(true)}
                  >
                    <Text style={styles.txtIrAExplorar}>
                      VER {eventosDisponibles.length} EVENTOS EN OTRAS REGIONES ➔
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />
      )}

      {/* Modal para ingresar Código Táctico de 6 dígitos/letras */}
      <Modal
        visible={modalCodigoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCodigoVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="form-textbox-password" size={24} color={colors.primary} />
              <Text style={styles.modalTitulo}>INGRESAR CÓDIGO TÁCTICO</Text>
            </View>

            <Text style={styles.modalDescripcion}>
              Ingresa el código alfanumérico de 6 caracteres generado para esta partida (ej: MAS123 o FUEB12).
            </Text>

            <TextInput
              style={styles.inputCodigo}
              placeholder="EJ: MAS123"
              placeholderTextColor={colors.textMuted}
              value={codigoManual}
              onChangeText={(t) => setCodigoManual(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleBuscarPorCodigo}
            />

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => {
                  setModalCodigoVisible(false);
                  setCodigoManual('');
                }}
              >
                <Text style={styles.txtCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnConfirmarModal,
                  (!codigoManual.trim() || buscandoCodigo) && styles.btnDeshabilitado,
                ]}
                onPress={handleBuscarPorCodigo}
                disabled={!codigoManual.trim() || buscandoCodigo}
              >
                {buscandoCodigo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.txtConfirmarModal}>LOCALIZAR</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  saludoOperador: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  aliasOperador: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  botonAjustes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  textoAjustes: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  btnQuickAction: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnEscanear: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
  },
  btnCrear: {
    backgroundColor: colors.card,
    borderColor: colors.secondary,
  },
  iconoQuickAction: {
    fontSize: 26,
    marginBottom: 6,
  },
  tituloQuickAction: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtituloQuickAction: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  tabsSegmentedContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  tabSegmented: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabSegmentedActivo: {
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
    borderColor: colors.primary,
  },
  tabSegmentedActivoInscritos: {
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    borderColor: colors.success,
  },
  tabSegmentedActivoHistorial: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  tabSegmentedTxt: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabSegmentedTxtActivo: {
    color: colors.primary,
  },
  tabSegmentedTxtActivoInscritos: {
    color: colors.success,
  },
  tabSegmentedTxtActivoHistorial: {
    color: '#F59E0B',
  },
  alcanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  alcanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  alcanceTxt: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  btnToggleAlcance: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(224, 109, 40, 0.1)',
  },
  txtToggleAlcance: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lista: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardInscrito: {
    borderColor: 'rgba(56, 161, 105, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagTipo: {
    backgroundColor: '#2D3748',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  textoTagTipo: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badgeEstado: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeEnCurso: {
    backgroundColor: colors.danger,
  },
  badgeProgramado: {
    backgroundColor: colors.secondary,
  },
  badgeFinalizado: {
    backgroundColor: 'rgba(56, 161, 105, 0.25)',
    borderWidth: 1,
    borderColor: colors.success,
  },
  badgeCancelado: {
    backgroundColor: 'rgba(229, 62, 62, 0.25)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  textoBadgeEstado: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeInscritoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  textoInscritoTag: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgePrivadaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 158, 46, 0.18)',
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textoPrivadaTag: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bandoRolBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 161, 105, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  bandoRolTxt: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  bandoRolDestacado: {
    color: colors.success,
    fontWeight: '900',
  },
  tituloEvento: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  infoMeta: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  motivoCancelacionBoxMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 62, 62, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 62, 62, 0.3)',
  },
  txtMotivoCancelacionMini: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  btnVerDetalles: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnVerDetallesInscrito: {
    backgroundColor: colors.success,
  },
  btnVerDetallesHistorial: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtVerDetalles: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  txtVerDetallesInscrito: {
    color: '#fff',
  },
  txtVerDetallesHistorial: {
    color: colors.textSecondary,
  },
  centroCargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCargando: {
    color: colors.textSecondary,
    marginTop: 10,
    fontSize: 13,
  },
  vacio: {
    alignItems: 'center',
    marginTop: 36,
    paddingHorizontal: 32,
  },
  tituloVacio: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtituloVacio: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  btnIrAExplorar: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  txtIrAExplorar: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerCodigo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bannerCodigoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerCodigoTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  bannerCodigoLink: {
    color: colors.primary,
    fontWeight: '800',
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
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalDescripcion: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputCodigo: {
    backgroundColor: colors.inputBg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 14,
    marginBottom: 20,
  },
  modalAcciones: {
    flexDirection: 'row',
    gap: 10,
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
    fontSize: 13,
    fontWeight: '700',
  },
  btnConfirmarModal: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDeshabilitado: {
    opacity: 0.5,
  },
  txtConfirmarModal: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
