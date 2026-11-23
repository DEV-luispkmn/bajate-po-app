import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  listarEventosApi,
  Evento,
} from '../../api/eventos.service';
import { REGIONES_CHILE } from '../eventos/CrearEventoScreen';
import { ModalNotificaciones } from '../../components/ModalNotificaciones';
import { ModalCodigoTactico } from '../../components/ModalCodigoTactico';
import { listarNotificacionesApi } from '../../api/notificaciones.service';
import { limpiarRecordatoriosEventosInactivos } from '../../services/deviceNotifications.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { obtenerEstiloFama } from '../../utils/fama.util';
import type { NavigationProp } from '../../navigation/types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { jugador, logout } = useAuth();

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Notificaciones tácticas
  const [modalNotificacionesVisible, setModalNotificacionesVisible] = useState(false);
  const [conteoNoLeidas, setConteoNoLeidas] = useState(0);
  const { suscribirNotificaciones } = useSocket();

  useEffect(() => {
    if (!suscribirNotificaciones) return;
    const desuscribir = suscribirNotificaciones(() => {
      setConteoNoLeidas((prev) => prev + 1);
    });
    return desuscribir;
  }, [suscribirNotificaciones]);

  // Pestaña activa del Feed: 'CERCA' (Cercanos disponibles) | 'INSCRITOS' (Eventos en los que estás inscrito)
  const [tabFeed, setTabFeed] = useState<'CERCA' | 'INSCRITOS'>('CERCA');
  // Explorar todos los eventos / otras regiones
  const [explorarOtrasRegiones, setExplorarOtrasRegiones] = useState(false);
  // Filtros tácticos de exploración
  const [filtroRegion, setFiltroRegion] = useState<string>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [modalSelectorRegionVisible, setModalSelectorRegionVisible] = useState(false);

  // Modal para ingresar código táctico de 6 caracteres
  const [modalCodigoVisible, setModalCodigoVisible] = useState(false);

  const miId = jugador?.id;
  const miRegion = jugador?.region || 'Región Metropolitana';
  const estiloFama = obtenerEstiloFama(jugador?.fama);

  const cargarEventos = async () => {
    try {
      const [data, notifRes] = await Promise.all([
        listarEventosApi(undefined, jugador?.id),
        listarNotificacionesApi().catch(() => ({ notificaciones: [], noLeidas: 0 })),
      ]);
      setEventos(data);
      if (notifRes && typeof notifRes.noLeidas === 'number') {
        setConteoNoLeidas(notifRes.noLeidas);
      }
      // Cancelar automáticamente recordatorios de 1 día o 30 min para eventos finalizados o cancelados
      limpiarRecordatoriosEventosInactivos(data).catch(() => null);
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
    }, [jugador?.region, jugador?.id, jugador?.equipoId]),
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

  // 2. Eventos disponibles activos donde NO está inscrito ni organiza
  const eventosDisponibles = eventos.filter((e) => {
    // Solo eventos programados o en curso
    if (e.estado !== 'PROGRAMADO' && e.estado !== 'EN_CURSO') return false;

    // Si el operador ya está inscrito o es organizador, va a "INSCRITO EN", no a disponibles
    if (e.jugadoresInscritos?.some((j) => j.jugadorId === miId) || e.organizadorId === miId) {
      return false;
    }

    // Regla: Si un evento ya cerró sus inscripciones (o ya inició y cerró inscripciones), no se muestra en cercanos
    if (e.inscripcionesAbiertas === false) {
      return false;
    }

    // Regla: Los eventos VERSUS solo son visibles para miembros de los equipos participantes (o invitados directos por código)
    if (e.tipo === 'VERSUS') {
      const miEquipoId = jugador?.equipoId;
      const esMiembroEquipoVersus = Boolean(
        miEquipoId && (e.equipoAId === miEquipoId || e.equipoBId === miEquipoId),
      );
      if (!esMiembroEquipoVersus) {
        return false;
      }
    }

    return true;
  });

  // 3. Eventos disponibles en la región del usuario (modo normal Cercanos)
  const eventosCerca = eventosDisponibles.filter((e) => {
    if (!e.region) return true;
    if (!miRegion) return true;
    return (
      e.region.trim().toLowerCase() === miRegion.trim().toLowerCase() ||
      e.region.toLowerCase().includes(miRegion.toLowerCase()) ||
      miRegion.toLowerCase().includes(e.region.toLowerCase())
    );
  });

  // 4. Eventos al explorar todos los eventos con filtros de Región y Tipo
  const eventosExploracionFiltrados = eventosDisponibles.filter((e) => {
    if (filtroRegion !== 'TODAS') {
      if (!e.region) return false;
      const coincide =
        e.region.trim().toLowerCase() === filtroRegion.trim().toLowerCase() ||
        e.region.toLowerCase().includes(filtroRegion.toLowerCase()) ||
        filtroRegion.toLowerCase().includes(e.region.toLowerCase());
      if (!coincide) return false;
    }

    if (filtroTipo !== 'TODOS') {
      if (e.tipo !== filtroTipo) return false;
    }

    return true;
  });

  // Lista final a renderizar según pestaña y alcance geográfico
  const eventosAMostrar =
    tabFeed === 'INSCRITOS'
      ? eventosInscritosActivos
      : explorarOtrasRegiones
      ? eventosExploracionFiltrados
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
    const bordeLateralEstado = esTerminadoOCancelado
      ? item.estado === 'CANCELADO'
        ? 'rgba(239, 68, 68, 0.4)'
        : '#4B5563'
      : item.estado === 'EN_CURSO'
      ? colors.danger
      : estaInscrito
      ? colors.success
      : colors.primary;

    return (
      <View
        style={[
          styles.card,
          estaInscrito && !esTerminadoOCancelado && styles.cardInscrito,
          { borderLeftWidth: 4, borderLeftColor: bordeLateralEstado },
        ]}
      >
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

        {/* Duelo entre escuadras para VERSUS */}
        {item.tipo === 'VERSUS' && item.bandos && item.bandos.length >= 2 && (
          <View style={styles.versusDueloRow}>
            <View style={styles.versusEquipoBox}>
              <MaterialCommunityIcons name="shield" size={13} color={colors.success} style={{ marginRight: 3 }} />
              <Text style={styles.versusDueloEquipoA} numberOfLines={1}>
                {item.bandos[0].nombre}
              </Text>
            </View>
            <View style={styles.versusDueloVsBox}>
              <Text style={styles.versusDueloVsTxt}>VS</Text>
            </View>
            <View style={[styles.versusEquipoBox, { justifyContent: 'flex-end' }]}>
              <Text style={styles.versusDueloEquipoB} numberOfLines={1}>
                {item.bandos[1].nombre}
              </Text>
              <MaterialCommunityIcons name="sword-cross" size={13} color={colors.blueTeam} style={{ marginLeft: 3 }} />
            </View>
          </View>
        )}

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
              setModalCodigoVisible(true);
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
          <Text style={[styles.aliasOperador, { color: estiloFama.colorTexto }]}>
            {jugador?.alias?.toUpperCase() || 'SOLDADO'}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.btnCampanaTopBar}
            onPress={() => setModalNotificacionesVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={conteoNoLeidas > 0 ? 'bell-badge' : 'bell-outline'}
              size={22}
              color={conteoNoLeidas > 0 ? colors.primary : colors.textSecondary}
            />
            {conteoNoLeidas > 0 && (
              <View style={styles.badgeCampanaContador}>
                <Text style={styles.txtBadgeCampanaContador}>
                  {conteoNoLeidas > 9 ? '9+' : conteoNoLeidas}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botonAjustes}
            onPress={() => navigation.navigate('Ajustes')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="cog-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.textoAjustes}>AJUSTES</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={styles.subtituloQuickAction}>PARTIDA / MASIVO</Text>
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

      {/* Título de Sección: EVENTOS */}
      <View style={styles.seccionHeaderEventos}>
        <Text style={styles.seccionTituloEventos}>EVENTOS</Text>
      </View>

      {/* 3. Pestañas Segmentadas Tácticas: "Cercanos" vs "Inscrito en" */}
      <View style={styles.tabsSegmentedContainer}>
        <TouchableOpacity
          style={[styles.tabSegmented, tabFeed === 'CERCA' && styles.tabSegmentedActivo]}
          onPress={() => setTabFeed('CERCA')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={15}
            color={tabFeed === 'CERCA' ? colors.primary : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabSegmentedTxt, tabFeed === 'CERCA' && styles.tabSegmentedTxtActivo]}>
            CERCANOS ({eventosCerca.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabSegmented, tabFeed === 'INSCRITOS' && styles.tabSegmentedActivoInscritos]}
          onPress={() => setTabFeed('INSCRITOS')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="shield-check"
            size={15}
            color={tabFeed === 'INSCRITOS' ? colors.success : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabSegmentedTxt, tabFeed === 'INSCRITOS' && styles.tabSegmentedTxtActivoInscritos]}>
            INSCRITO EN ({eventosInscritosActivos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Barra de Alcance Geográfico y Filtros (Solo en pestaña CERCANOS) */}
      {tabFeed === 'CERCA' && (
        <View style={styles.alcanceYFiltrosContainer}>
          <View style={styles.alcanceBar}>
            <View style={styles.alcanceInfo}>
              <MaterialCommunityIcons
                name={explorarOtrasRegiones ? 'earth' : 'map-marker'}
                size={16}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.alcanceTxt} numberOfLines={1}>
                {explorarOtrasRegiones
                  ? filtroRegion === 'TODAS'
                    ? `Todos los eventos (${eventosExploracionFiltrados.length})`
                    : `${filtroRegion} (${eventosExploracionFiltrados.length})`
                  : `${miRegion} (${eventosCerca.length})`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.btnToggleAlcance}
              onPress={() => {
                const nuevo = !explorarOtrasRegiones;
                setExplorarOtrasRegiones(nuevo);
                if (!nuevo) {
                  setFiltroRegion('TODAS');
                  setFiltroTipo('TODOS');
                }
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.txtToggleAlcance}>
                  {explorarOtrasRegiones ? 'SOLO MI REGIÓN' : 'VER TODOS'}
                </Text>
                <MaterialCommunityIcons
                  name={explorarOtrasRegiones ? 'filter-variant' : 'arrow-right'}
                  size={12}
                  color={colors.primary}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Filtros avanzados desplegados al presionar para ver todos los eventos */}
          {explorarOtrasRegiones && (
            <View style={styles.filtrosAvanzadosBox}>
              {/* Selector de Región */}
              <TouchableOpacity
                style={styles.btnSelectorRegionFiltro}
                onPress={() => setModalSelectorRegionVisible(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <MaterialCommunityIcons name="map-marker-radius" size={16} color={colors.primary} />
                  <Text style={styles.txtSelectorRegionFiltroLabel}>Región:</Text>
                  <Text style={styles.txtSelectorRegionFiltroValor} numberOfLines={1}>
                    {filtroRegion === 'TODAS' ? 'Todas las regiones' : filtroRegion}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Selector de Tipo de Evento */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollTiposFiltro}
              >
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'PICHANGA', label: 'Partidas' },
                  { id: 'EVENTO_MASIVO', label: 'Masivos' },
                  { id: 'VERSUS', label: 'Versus' },
                  { id: 'TORNEO', label: 'Torneos' },
                ].map((tipo) => {
                  const activo = filtroTipo === tipo.id;
                  return (
                    <TouchableOpacity
                      key={tipo.id}
                      style={[styles.chipTipoFiltro, activo && styles.chipTipoFiltroActivo]}
                      onPress={() => setFiltroTipo(tipo.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.txtChipTipoFiltro, activo && styles.txtChipTipoFiltroActivo]}>
                        {tipo.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
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
                    ? 'No hay eventos disponibles con estos filtros'
                    : `Sin operaciones cerca en ${miRegion}`}
                </Text>
                <Text style={styles.subtituloVacio}>
                  {explorarOtrasRegiones
                    ? 'Prueba seleccionando otra región o cambiando el tipo de evento en los filtros superiores.'
                    : 'Aún no hay partidas creadas en tu región. Puedes convocar una o presionar "Ver todos" para buscar eventos.'}
                </Text>

                {!explorarOtrasRegiones && eventosDisponibles.length > 0 && (
                  <TouchableOpacity
                    style={styles.btnIrAExplorar}
                    onPress={() => setExplorarOtrasRegiones(true)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.txtIrAExplorar, { fontVariant: ['tabular-nums'] }]}>
                        VER TODOS LOS EVENTOS ({eventosDisponibles.length})
                      </Text>
                      <MaterialCommunityIcons name="arrow-right" size={14} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />
      )}

      {/* Modal para ingresar Código Táctico de 6 dígitos/letras */}
      <ModalCodigoTactico
        visible={modalCodigoVisible}
        onClose={() => setModalCodigoVisible(false)}
        onSuccess={(eventoId) => {
          setModalCodigoVisible(false);
          navigation.navigate('EventoDetalle', { eventoId });
        }}
      />

      {/* Modal Notificaciones Táctico */}
      <ModalNotificaciones
        visible={modalNotificacionesVisible}
        onClose={() => setModalNotificacionesVisible(false)}
        onActualizarConteo={setConteoNoLeidas}
      />

      {/* Modal para seleccionar Región en el filtro de exploración */}
      <Modal
        visible={modalSelectorRegionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalSelectorRegionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '75%' }]}>
            <Text style={styles.modalTitulo}>FILTRAR POR REGIÓN</Text>
            <ScrollView style={{ marginVertical: 10 }}>
              <TouchableOpacity
                style={[
                  styles.modalRegionItem,
                  filtroRegion === 'TODAS' && styles.modalRegionItemActivo,
                ]}
                onPress={() => {
                  setFiltroRegion('TODAS');
                  setModalSelectorRegionVisible(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="earth" size={16} color={colors.primary} />
                  <Text
                    style={[
                      styles.modalRegionTexto,
                      filtroRegion === 'TODAS' && styles.modalRegionTextoActivo,
                    ]}
                  >
                    Todas las regiones de Chile
                  </Text>
                </View>
                {filtroRegion === 'TODAS' && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              {REGIONES_CHILE.map((reg) => (
                <TouchableOpacity
                  key={reg}
                  style={[
                    styles.modalRegionItem,
                    reg === filtroRegion && styles.modalRegionItemActivo,
                  ]}
                  onPress={() => {
                    setFiltroRegion(reg);
                    setModalSelectorRegionVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalRegionTexto,
                      reg === filtroRegion && styles.modalRegionTextoActivo,
                    ]}
                  >
                    {reg}
                  </Text>
                  {reg === filtroRegion && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.btnCancelarModal}
              onPress={() => setModalSelectorRegionVisible(false)}
            >
              <Text style={styles.txtCancelarModal}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnCampanaTopBar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCampanaContador: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  txtBadgeCampanaContador: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
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
  seccionHeaderEventos: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 2,
  },
  seccionTituloEventos: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  tabsSegmentedContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
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
  tabSegmentedTxt: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabSegmentedTxtActivo: {
    color: colors.primary,
  },
  tabSegmentedTxtActivoInscritos: {
    color: colors.success,
  },
  alcanceYFiltrosContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginTop: 4,
  },
  alcanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
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
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(224, 109, 40, 0.3)',
  },
  txtToggleAlcance: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filtrosAvanzadosBox: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  btnSelectorRegionFiltro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  txtSelectorRegionFiltroLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
  txtSelectorRegionFiltroValor: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  scrollTiposFiltro: {
    gap: 6,
    paddingVertical: 2,
  },
  chipTipoFiltro: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipTipoFiltroActivo: {
    backgroundColor: 'rgba(224, 109, 40, 0.2)',
    borderColor: colors.primary,
  },
  txtChipTipoFiltro: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  txtChipTipoFiltroActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  modalRegionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalRegionItemActivo: {
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
    borderRadius: 6,
  },
  modalRegionTexto: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  modalRegionTextoActivo: {
    color: colors.primary,
    fontWeight: '800',
  },
  modalRegionCheck: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
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
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardInscrito: {
    borderColor: 'rgba(56, 161, 105, 0.4)',
    borderLeftColor: colors.success,
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
    fontSize: 13,
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
  versusDueloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(224, 109, 40, 0.3)',
    gap: 8,
  },
  versusEquipoBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  versusDueloEquipoA: {
    flex: 1,
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  versusDueloVsBox: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versusDueloVsTxt: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  versusDueloEquipoB: {
    flex: 1,
    color: colors.blueTeam,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
});
