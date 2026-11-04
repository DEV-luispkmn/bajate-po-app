import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  obtenerEventoApi,
  unirseEventoApi,
  modificarEventoApi,
  cambiarEstadoEventoApi,
  DetalleEventoResponse,
} from '../../api/eventos.service';
import {
  listarPartidasPorEventoApi,
  crearPartidaApi,
  Partida,
} from '../../api/partidas.service';
import {
  listarModalidadesApi,
  ModalidadPartida,
} from '../../api/configuracion.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TacticalDateTimePicker } from '../../components/TacticalDateTimePicker';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import type { NavigationProp } from '../../navigation/types';

const ROLES_TACTICOS = ['ASALTO', 'CQB', 'SNIPER', 'DMR', 'APOYO', 'MÉDICO'];

export const EventoDetalleScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { jugador } = useAuth();
  const eventoId = route.params?.eventoId;

  const [detalle, setDetalle] = useState<DetalleEventoResponse | null>(null);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [uniendose, setUniendose] = useState(false);

  // Modal para unirse con selección de rol
  const [modalUnirseVisible, setModalUnirseVisible] = useState(false);
  const [bandoAUnirseId, setBandoAUnirseId] = useState<number | null>(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>(['ASALTO']);

  // Modal de modificación para el organizador
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editFechaInicio, setEditFechaInicio] = useState<Date>(new Date());
  const [editFechaFin, setEditFechaFin] = useState<Date>(new Date());
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Modal de Cancelación oficial de la operación
  const MOTIVOS_CANCELACION = [
    'Clima adverso / Lluvia extrema',
    'Falta de quórum / Jugadores insuficientes',
    'Problemas de disponibilidad de cancha',
    'Fuerza mayor / Emergencia del organizador',
    'Otro motivo...',
  ];
  const [modalCancelarVisible, setModalCancelarVisible] = useState(false);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_CANCELACION[0]);
  const [motivoOtroTexto, setMotivoOtroTexto] = useState('');
  const [cancelandoEvento, setCancelandoEvento] = useState(false);

  // Modal QR para operadores atrasados y reclutamiento en cancha
  const [modalQrVisible, setModalQrVisible] = useState(false);
  const [tabQrAtrasados, setTabQrAtrasados] = useState<'PARTIDA' | 'BANDO'>('PARTIDA');
  const [bandoQrSeleccionadoId, setBandoQrSeleccionadoId] = useState<number | null>(null);

  // Modal Iniciar Evento / Crear Partida eligiendo Modalidad
  const [modalIniciarPartidaVisible, setModalIniciarPartidaVisible] = useState(false);
  const [modalidades, setModalidades] = useState<ModalidadPartida[]>([]);
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState<ModalidadPartida | null>(null);
  const [nombreNuevaPartida, setNombreNuevaPartida] = useState('');
  const [creandoPartida, setCreandoPartida] = useState(false);
  const [finalizandoEvento, setFinalizandoEvento] = useState(false);

  const cargarDatos = async () => {
    try {
      const [resEvento, resPartidas] = await Promise.all([
        obtenerEventoApi(eventoId),
        listarPartidasPorEventoApi(eventoId),
      ]);
      setDetalle(resEvento);
      setPartidas(resPartidas);

      if (resEvento?.evento) {
        setEditTitulo(resEvento.evento.titulo);
        setEditDescripcion(resEvento.evento.descripcion || '');
        setEditFechaInicio(
          resEvento.evento.fechaInicio ? new Date(resEvento.evento.fechaInicio) : new Date(),
        );
        setEditFechaFin(
          resEvento.evento.fechaFin ? new Date(resEvento.evento.fechaFin) : new Date(),
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cargar la información del evento');
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [eventoId])
  );

  useEffect(() => {
    listarModalidadesApi()
      .then((data) => {
        setModalidades(data);
        if (data.length > 0) setModalidadSeleccionada(data[0]);
      })
      .catch(() => {});
  }, []);

  const handleIniciarPartida = async () => {
    if (!eventoId) return;
    try {
      setCreandoPartida(true);
      const nombreFinal =
        nombreNuevaPartida.trim() ||
        `${modalidadSeleccionada?.nombre || 'Partida'} - Partida ${partidas.length + 1}`;

      const nuevaPartida = await crearPartidaApi({
        eventoId,
        nombre: nombreFinal,
        modalidadId: modalidadSeleccionada?.id,
        modalidadNombre: modalidadSeleccionada?.nombre,
      });

      setModalIniciarPartidaVisible(false);
      setNombreNuevaPartida('');
      Alert.alert(
        '🎯 ¡PARTIDA INICIADA!',
        `Se ha iniciado "${nombreFinal}" con modalidad ${modalidadSeleccionada?.nombre || 'Estándar'}.`,
        [
          {
            text: 'ENTRAR EN VIVO',
            onPress: () => {
              cargarDatos();
              navigation.navigate('PartidaEnVivo', {
                partidaId: nuevaPartida.id,
                titulo: `${detalle?.evento.titulo} - ${nombreFinal}`,
              });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error al iniciar', error.message || 'No se pudo iniciar la partida.');
    } finally {
      setCreandoPartida(false);
    }
  };

  const handleFinalizarEvento = () => {
    Alert.alert(
      '🏁 ¿FINALIZAR ESTE EVENTO?',
      '¿Deseas dar por concluida oficialmente esta jornada táctica?\n\nAl finalizar, el evento quedará registrado como concluido y no se podrán añadir nuevas partidas.',
      [
        { text: 'CANCELAR', style: 'cancel' },
        {
          text: 'FINALIZAR EVENTO',
          style: 'destructive',
          onPress: async () => {
            try {
              setFinalizandoEvento(true);
              await cambiarEstadoEventoApi(eventoId, 'FINALIZADO');
              await cargarDatos();
              Alert.alert('🏆 ¡EVENTO FINALIZADO!', 'La jornada táctica ha concluido oficialmente con éxito.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo finalizar el evento');
            } finally {
              setFinalizandoEvento(false);
            }
          },
        },
      ],
    );
  };


  const abrirModalUnirse = (bandoId: number | null) => {
    setBandoAUnirseId(bandoId);
    setRolesSeleccionados(['ASALTO']);
    setModalUnirseVisible(true);
  };

  const toggleRolUnirse = (rol: string) => {
    const esMasivo = detalle?.evento.tipo === 'EVENTO_MASIVO';
    if (esMasivo) {
      setRolesSeleccionados([rol]);
    } else {
      if (rolesSeleccionados.includes(rol)) {
        if (rolesSeleccionados.length === 1) return;
        setRolesSeleccionados(rolesSeleccionados.filter((r) => r !== rol));
      } else {
        setRolesSeleccionados([...rolesSeleccionados, rol]);
      }
    }
  };

  const confirmarUnirseBando = async () => {
    try {
      setUniendose(true);
      await unirseEventoApi({
        eventoId,
        codigoInvitacion: detalle?.evento.codigoInvitacion,
        bandoId: bandoAUnirseId ?? undefined,
        rol: rolesSeleccionados.join(','),
      });
      setModalUnirseVisible(false);
      Alert.alert(
        '¡Alistado!',
        bandoAUnirseId
          ? 'Te has alistado exitosamente en este bando.'
          : 'Te has inscrito exitosamente a la pichanga.',
      );
      cargarDatos();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo completar la inscripción');
    } finally {
      setUniendose(false);
    }
  };

  const handleCambiarBandoDirecto = async (nuevoBandoId: number) => {
    try {
      setUniendose(true);
      await unirseEventoApi({
        eventoId,
        codigoInvitacion: detalle?.evento.codigoInvitacion,
        bandoId: nuevoBandoId,
        rol: miBando?.rol || 'ASALTO',
      });
      Alert.alert('Bando Actualizado', 'Has cambiado de bando táctico exitosamente.');
      cargarDatos();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cambiar de bando');
    } finally {
      setUniendose(false);
    }
  };

  const handleCompartirOperacion = async () => {
    if (!detalle?.evento) return;
    const ev = detalle.evento;
    const link = `https://bajatepo.cl/operaciones/${ev.codigoInvitacion || ev.id}`;
    const fechaTexto = ev.fechaInicio
      ? new Date(ev.fechaInicio).toLocaleString([], {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'A confirmar';

    const mensaje = `🇨🇱 *BÁJATE PO! AIRSOFT CHILE* 🇨🇱\n\n🎯 *Operación:* ${ev.titulo}\n📍 *Cancha:* ${ev.canchaNombre || 'Sector de combate'}${ev.region ? ` (${ev.region})` : ''}\n🔒 *Acceso:* ${ev.privacidad === 'CERRADO' ? 'Privada (Código Requerido)' : 'Acceso Libre'}\n⏰ *Inicio:* ${fechaTexto}\n🔑 *Código Táctico:* *${ev.codigoInvitacion || 'N/A'}*\n\n📲 *Únete a la partida en la app:* ${link}\n(O ingresa el código de 6 caracteres en la app Bájate Po!)`;

    try {
      await Share.share({
        message: mensaje,
        title: `Operación táctica: ${ev.titulo}`,
      });
    } catch {
      // Ignorar cancelaciones
    }
  };

  const handleGuardarModificacion = async () => {
    if (!editTitulo.trim()) {
      Alert.alert('Atención', 'El título no puede estar vacío');
      return;
    }
    try {
      setGuardandoEdicion(true);
      await modificarEventoApi(eventoId, {
        titulo: editTitulo.trim(),
        descripcion: editDescripcion.trim() || undefined,
        fechaInicio: editFechaInicio.toISOString(),
        fechaFin: editFechaFin.toISOString(),
      });
      setModalEditarVisible(false);
      Alert.alert('Éxito', 'La operación ha sido actualizada.');
      cargarDatos();
    } catch (error: any) {
      Alert.alert('Error al modificar', error.message || 'No se pudo actualizar el evento');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleConfirmarCancelacion = async () => {
    const motivoFinal =
      motivoSeleccionado === 'Otro motivo...'
        ? motivoOtroTexto.trim() || 'Otro motivo'
        : motivoSeleccionado;

    try {
      setCancelandoEvento(true);
      await cambiarEstadoEventoApi(eventoId, 'CANCELADO', motivoFinal);
      setModalCancelarVisible(false);
      Alert.alert(
        '🚫 OPERACIÓN CANCELADA',
        `El evento ha sido cancelado oficialmente.\nMotivo: ${motivoFinal}`,
      );
      cargarDatos();
    } catch (error: any) {
      Alert.alert('Error al cancelar', error.message || 'No se pudo cancelar el evento');
    } finally {
      setCancelandoEvento(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centroCargando}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.textoCargando}>Descargando coordenadas del evento...</Text>
      </View>
    );
  }

  if (!detalle) {
    return (
      <View style={styles.centroCargando}>
        <Text style={styles.textoCargando}>No se encontró el evento.</Text>
      </View>
    );
  }

  const { evento, jugadores } = detalle;
  const miBando = jugadores.find((j) => j.jugadorId === jugador?.id);
  const soyOrganizador = evento.organizadorId === jugador?.id;
  const esTerminadoOCancelado = evento.estado === 'FINALIZADO' || evento.estado === 'CANCELADO';
  const esPichanga = evento.tipo === 'PICHANGA';

  const fechaInicioFormateada = evento.fechaInicio
    ? new Date(evento.fechaInicio).toLocaleString([], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Por confirmar';

  const fechaFinFormateada = evento.fechaFin
    ? new Date(evento.fechaFin).toLocaleString([], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner de Cancelación si el evento fue cancelado */}
      {evento.estado === 'CANCELADO' && (
        <View style={styles.bannerEventoCanceladoGlobal}>
          <MaterialCommunityIcons name="alert-octagon" size={28} color={colors.danger} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.tituloEventoCanceladoGlobal}>OPERACIÓN CANCELADA</Text>
            <Text style={styles.motivoEventoCanceladoGlobal}>
              Motivo: {evento.motivoCancelacion || 'Cancelado por el organizador'}
            </Text>
          </View>
        </View>
      )}

      {/* Banner de Finalización si el evento está concluido */}
      {evento.estado === 'FINALIZADO' && (
        <View style={styles.bannerEventoFinalizadoGlobal}>
          <MaterialCommunityIcons name="trophy" size={26} color={colors.warning} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.tituloEventoFinalizadoGlobal}>OPERACIÓN CONCLUIDA OFICIALMENTE 🏆</Text>
            <Text style={styles.subEventoFinalizadoGlobal}>
              Esta jornada táctica ha concluido. Resultados y estadísticas archivados.
            </Text>
          </View>
        </View>
      )}

      {/* Tarjeta de Resumen Principal */}
      <View style={styles.resumenCard}>
        <View style={styles.tipoRow}>
          <Text style={styles.tagTipo}>{evento.tipo.replace('_', ' ')}</Text>
          <View
            style={[
              styles.estadoTagBox,
              evento.estado === 'CANCELADO'
                ? styles.estadoTagCancelado
                : evento.estado === 'FINALIZADO'
                ? styles.estadoTagFinalizado
                : evento.estado === 'EN_CURSO'
                ? styles.estadoTagEnCurso
                : styles.estadoTagProgramado,
            ]}
          >
            <Text
              style={[
                styles.estadoTagTexto,
                evento.estado === 'CANCELADO' && { color: colors.danger },
                evento.estado === 'FINALIZADO' && { color: colors.success },
              ]}
            >
              {evento.estado.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.titulo}>{evento.titulo}</Text>

        <View style={styles.metaFila}>
          <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.metaTexto}>
            {evento.canchaNombre || 'Cancha por asignar'}
            {evento.region ? ` (${evento.region})` : ''}
          </Text>
        </View>

        <View style={styles.metaFila}>
          <MaterialCommunityIcons name="calendar-month" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.metaTexto}>
            Inicio: {fechaInicioFormateada}
            {fechaFinFormateada ? `\nTérmino: ${fechaFinFormateada}` : ''}
          </Text>
        </View>

        <View style={styles.metaFila}>
          <MaterialCommunityIcons name="shield-account" size={16} color={colors.secondary} style={{ marginRight: 6 }} />
          <Text style={styles.metaTexto}>
            Organizador: {evento.organizadorAlias || 'Comandancia'}
          </Text>
        </View>

        {/* Código de invitación táctico (Solo si la operación está activa) */}
        {!esTerminadoOCancelado && (
          <View style={styles.codigoBox}>
            <View style={styles.codigoHeaderRow}>
              <Text style={styles.codigoLabel}>CÓDIGO DE INVITACIÓN TÁCTICO:</Text>
              <View
                style={[
                  styles.badgePrivacidadSmall,
                  evento.privacidad === 'CERRADO'
                    ? styles.badgePrivacidadCerrado
                    : styles.badgePrivacidadAbierto,
                ]}
              >
                <MaterialCommunityIcons
                  name={evento.privacidad === 'CERRADO' ? 'lock' : 'lock-open-variant'}
                  size={11}
                  color={evento.privacidad === 'CERRADO' ? colors.warning : colors.success}
                />
                <Text
                  style={[
                    styles.textoPrivacidadSmall,
                    { color: evento.privacidad === 'CERRADO' ? colors.warning : colors.success },
                  ]}
                >
                  {evento.privacidad === 'CERRADO' ? 'PRIVADA' : 'PÚBLICA'}
                </Text>
              </View>
            </View>
            <Text style={styles.codigoValor}>{evento.codigoInvitacion || 'N/A'}</Text>
            <Text style={styles.codigoAyuda}>Código mnemotécnico de 6 caracteres para invitar camaradas.</Text>
          </View>
        )}

        {/* Acciones de Operación: Compartir y QR Atrasados (Solo si está activa) */}
        {!esTerminadoOCancelado && (
          <View style={styles.accionesOperacionRow}>
            <TouchableOpacity
              style={styles.btnCompartir}
              onPress={handleCompartirOperacion}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="share-variant" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.txtBtnCompartir}>COMPARTIR OPERACIÓN</Text>
            </TouchableOpacity>

            {soyOrganizador && (
              <TouchableOpacity
                style={styles.btnMostrarQrAtrasados}
                onPress={() => {
                  setTabQrAtrasados('PARTIDA');
                  setModalQrVisible(true);
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.txtBtnMostrarQrAtrasados}>QR ATRASADOS</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Estado de inscripción del operador (Solo si está activa) */}
        {miBando && !esTerminadoOCancelado && (
          <View style={styles.estadoInscripcion}>
            <Text style={styles.textoInscrito}>
              ✓ ALISTADO EN ESTA OPERACIÓN {miBando.bandoId ? `(ROL: ${miBando.rol})` : '(EN RESERVA)'}
            </Text>
          </View>
        )}
      </View>

      {/* Briefing de la Misión / Descripción */}
      {evento.descripcion ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>BRIEFING & REGLAS DE COMBATE</Text>
          <View style={styles.briefingCard}>
            <Text style={styles.briefingTexto}>{evento.descripcion}</Text>
          </View>
        </View>
      ) : null}

      {/* PANEL EXCLUSIVO DEL ORGANIZADOR */}
      {soyOrganizador && (
        <View style={styles.panelOrganizadorCard}>
          <View style={styles.panelOrganizadorHeader}>
            <MaterialCommunityIcons name="shield-crown" size={20} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.panelOrganizadorTitulo}>PANEL DEL ORGANIZADOR</Text>
          </View>
          <Text style={styles.panelOrganizadorDesc}>
            Tienes privilegios de comandante para gestionar parámetros, modificar, o generar el QR en terreno para que operadores atrasados se sumen al combate.
          </Text>

          <View style={styles.panelOrganizadorBotones}>
            {!esTerminadoOCancelado ? (
              <>
                {/* Botón Iniciar Evento / Partida con Modalidad */}
                <TouchableOpacity
                  style={styles.btnIniciarEventoPrincipal}
                  onPress={() => setModalIniciarPartidaVisible(true)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="play-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.textoBtnIniciarEventoPrincipal}>
                    {evento.estado === 'PROGRAMADO'
                      ? 'INICIAR OPERACIÓN (ELEGIR MODALIDAD)'
                      : 'NUEVA PARTIDA TÁCTICA'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnGenerarQrComandante}
                  onPress={() => {
                    setTabQrAtrasados('PARTIDA');
                    setModalQrVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="qrcode" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.textoBtnGenerarQr}>GENERAR QR PARA ATRASADOS</Text>
                </TouchableOpacity>

                {/* Botón Finalizar Evento */}
                <TouchableOpacity
                  style={[styles.btnFinalizarEvento, finalizandoEvento && styles.botonDeshabilitado]}
                  onPress={handleFinalizarEvento}
                  disabled={finalizandoEvento}
                  activeOpacity={0.85}
                >
                  {finalizandoEvento ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="flag-checkered" size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.textoBtnFinalizarEvento}>FINALIZAR EVENTO OFICIALMENTE 🏁</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.panelBotonesSecundarios}>
                  <TouchableOpacity
                    style={styles.btnModificarEvento}
                    onPress={() => setModalEditarVisible(true)}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.textoBtnModificar}>MODIFICAR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnCancelarEvento}
                    onPress={() => setModalCancelarVisible(true)}
                    disabled={cancelandoEvento}
                  >
                    {cancelandoEvento ? (
                      <ActivityIndicator color={colors.danger} size="small" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="close-octagon-outline" size={15} color={colors.danger} style={{ marginRight: 4 }} />
                        <Text style={styles.textoBtnCancelar}>CANCELAR EVENTO</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.bannerEventoFinalizado}>
                <MaterialCommunityIcons
                  name={evento.estado === 'CANCELADO' ? 'alert-octagon' : 'trophy'}
                  size={24}
                  color={evento.estado === 'CANCELADO' ? colors.danger : colors.warning}
                  style={{ marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.textoEventoFinalizadoTitulo}>
                    {evento.estado === 'CANCELADO' ? 'OPERACIÓN CANCELADA' : 'JORNADA CONCLUIDA 🏆'}
                  </Text>
                  <Text style={styles.textoEventoFinalizadoSub}>
                    {evento.estado === 'CANCELADO'
                      ? `Este evento fue cancelado. Motivo: ${evento.motivoCancelacion || 'No especificado'}. No admite modificaciones.`
                      : 'Este evento se encuentra oficialmente finalizado. Las estadísticas y resultados han sido archivados.'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Partidas y WebSockets en vivo */}
      <View style={styles.seccion}>
        <View style={styles.seccionHeaderPartidas}>
          <Text style={styles.seccionTitulo}>PARTIDAS Y COMBATE</Text>
          {soyOrganizador && !esTerminadoOCancelado && (
            <TouchableOpacity
              style={styles.btnNuevaPartidaMini}
              onPress={() => setModalIniciarPartidaVisible(true)}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.txtNuevaPartidaMini}>NUEVA PARTIDA</Text>
            </TouchableOpacity>
          )}
        </View>

        {partidas.length === 0 ? (
          <View style={styles.sinPartidasCard}>
            <MaterialCommunityIcons name="flag-outline" size={36} color={colors.textMuted} style={{ marginBottom: 6 }} />
            <Text style={styles.textoSinPartidas}>
              Aún no se inician partidas para este evento.
            </Text>
            {soyOrganizador && !esTerminadoOCancelado && (
              <TouchableOpacity
                style={styles.btnIniciarPrimeraPartida}
                onPress={() => setModalIniciarPartidaVisible(true)}
              >
                <MaterialCommunityIcons name="play-circle-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.txtIniciarPrimeraPartida}>INICIAR PRIMERA PARTIDA AHORA</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          partidas.map((p) => {
            const esFinalizada = p.estado === 'FINALIZADA';
            const esEnCurso = p.estado === 'EN_CURSO';
            const esPendiente = p.estado === 'PENDIENTE';

            const bando1 = evento.bandos?.[0];
            const bando2 = evento.bandos?.[1];
            const pts1 = bando1 && p.marcador ? p.marcador[bando1.id] || 0 : 0;
            const pts2 = bando2 && p.marcador ? p.marcador[bando2.id] || 0 : 0;
            const tieneMarcador = (p.rondas?.length || 0) > 0 && !!bando1 && !!bando2;

            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.partidaCard,
                  esFinalizada && styles.partidaCardFinalizada,
                  esEnCurso && styles.partidaCardEnCurso,
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('PartidaEnVivo', {
                    partidaId: p.id,
                    titulo: `${evento.titulo} - ${p.nombre || 'Partida'}`,
                  })
                }
              >
                <View style={styles.partidaHeader}>
                  <View style={styles.partidaHeaderLeft}>
                    <Text style={styles.partidaNombre}>{p.nombre || `Partida #${p.id}`}</Text>
                    {p.modalidadNombre && (
                      <View style={styles.badgeModalidad}>
                        <MaterialCommunityIcons name="sword-cross" size={10} color={colors.primary} style={{ marginRight: 3 }} />
                        <Text style={styles.txtBadgeModalidad}>{p.modalidadNombre}</Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.partidaEstadoBadge,
                      esFinalizada && styles.badgeFinalizada,
                      esEnCurso && styles.badgeEnCurso,
                      esPendiente && styles.badgePendiente,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        esFinalizada
                          ? 'check-circle'
                          : esEnCurso
                          ? 'record-circle-outline'
                          : 'clock-outline'
                      }
                      size={12}
                      color={
                        esFinalizada
                          ? colors.success
                          : esEnCurso
                          ? colors.danger
                          : colors.warning
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.partidaEstadoTexto,
                        esFinalizada && { color: colors.success },
                        esEnCurso && { color: colors.danger },
                        esPendiente && { color: colors.warning },
                      ]}
                    >
                      {esFinalizada
                        ? 'FINALIZADA'
                        : esEnCurso
                        ? 'EN CURSO'
                        : 'PENDIENTE'}
                    </Text>
                  </View>
                </View>

                {tieneMarcador && (
                  <View style={styles.marcadorResumenRow}>
                    <Text style={[styles.marcadorEquipoTexto, { color: bando1?.colorHex || colors.danger }]}>
                      {bando1?.nombre}: <Text style={styles.marcadorPtsBold}>{pts1}</Text>
                    </Text>
                    <Text style={styles.marcadorVsMini}>VS</Text>
                    <Text style={[styles.marcadorEquipoTexto, { color: bando2?.colorHex || colors.secondary }]}>
                      {bando2?.nombre}: <Text style={styles.marcadorPtsBold}>{pts2}</Text>
                    </Text>
                  </View>
                )}

                <View style={styles.partidaFooter}>
                  <Text style={styles.rondasConteo}>
                    {p.rondas?.length ?? 0}{' '}
                    {p.rondas?.length === 1 ? 'Ronda registrada' : 'Rondas registradas'}
                  </Text>
                  <View style={styles.btnEntrarRow}>
                    <MaterialCommunityIcons
                      name={
                        esFinalizada
                          ? 'trophy'
                          : esEnCurso
                          ? 'play-circle'
                          : 'play-circle-outline'
                      }
                      size={14}
                      color={
                        esFinalizada
                          ? '#F59E0B'
                          : esEnCurso
                          ? colors.danger
                          : colors.primary
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.textoEnVivo,
                        esFinalizada && { color: '#F59E0B' },
                        esPendiente && { color: colors.primary },
                      ]}
                    >
                      {esFinalizada
                        ? 'VER RESULTADO'
                        : esEnCurso
                        ? 'ENTRAR EN VIVO'
                        : 'INICIAR PARTIDA'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Sección de Bandos / Pichanga */}
      {esPichanga && partidas.length === 0 ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>OPERADORES INSCRITOS ({jugadores.length})</Text>
          <View style={styles.pichangaInscritosCard}>
            <Text style={styles.pichangaAvisoTexto}>
              ℹ️ Modalidad Pichanga: En esta fase previa todos los operadores se registran sin bando fijo. Una vez iniciada la primera partida por el comandante, se desplegarán los bandos tácticos y podrás elegir o cambiarte de bando libremente.
            </Text>

            <View style={styles.jugadoresList}>
              {jugadores.length === 0 ? (
                <Text style={styles.sinOperadores}>Aún no hay operadores inscritos en esta pichanga.</Text>
              ) : (
                jugadores.map((j) => (
                  <View key={j.jugadorId} style={styles.jugadorInscritoRow}>
                    <Text style={styles.jugadorItem}>
                      • {j.alias} <Text style={styles.rolTag}>[{j.rol}]</Text>
                    </Text>
                    {j.jugadorId === jugador?.id && (
                      <View style={styles.badgeTuPerfilMini}>
                        <Text style={styles.txtTuPerfilMini}>TÚ</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>

            {!miBando && !esTerminadoOCancelado && (
              <TouchableOpacity
                style={[styles.btnAlistarsePichangaMini, uniendose && styles.botonDeshabilitado]}
                disabled={uniendose}
                onPress={() => abrirModalUnirse(null)}
              >
                {uniendose ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="account-plus" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtAlistarsePichangaMini}>ALISTARME A LA PICHANGA 🪖</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.seccion}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.seccionTitulo}>BANDOS DE COMBATE</Text>
            {esPichanga && !esTerminadoOCancelado && (
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                Rebalanceo / Revueltas activo 🔄
              </Text>
            )}
          </View>

          {evento.bandos?.map((bando) => {
            const jugadoresDelBando = jugadores.filter((j) => j.bandoId === bando.id);
            const estoyEnEsteBando = miBando?.bandoId === bando.id;

            return (
              <View key={bando.id} style={styles.bandoCard}>
                <View style={styles.bandoHeader}>
                  <View style={styles.bandoTituloRow}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: bando.colorHex || colors.primary },
                      ]}
                    />
                    <Text style={styles.bandoNombre}>{bando.nombre}</Text>
                  </View>
                  <Text style={styles.bandoConteo}>
                    {jugadoresDelBando.length} Operadores
                  </Text>
                </View>

                {/* Roster de jugadores */}
                <View style={styles.jugadoresList}>
                  {jugadoresDelBando.length === 0 ? (
                    <Text style={styles.sinOperadores}>Sin operadores enlistados aún</Text>
                  ) : (
                    jugadoresDelBando.map((j) => (
                      <Text key={j.jugadorId} style={styles.jugadorItem}>
                        • {j.alias} <Text style={styles.rolTag}>[{j.rol}]</Text>
                        {j.jugadorId === jugador?.id ? ' (TÚ)' : ''}
                      </Text>
                    ))
                  )}
                </View>

                {!esTerminadoOCancelado && (
                  estoyEnEsteBando ? (
                    <View style={styles.bandoActualBadge}>
                      <Text style={styles.txtBandoActual}>✓ TU BANDO ACTUAL</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.botonUnirseBando, uniendose && styles.botonDeshabilitado]}
                      disabled={uniendose}
                      onPress={() => {
                        if (miBando) {
                          handleCambiarBandoDirecto(bando.id);
                        } else {
                          abrirModalUnirse(bando.id);
                        }
                      }}
                    >
                      <Text style={styles.textoBotonUnirse}>
                        {miBando ? 'CAMBIAR A ESTE BANDO' : 'ALISTARSE EN ESTE BANDO'}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            );
          })}

          {/* Si hay operadores inscritos sin bando asignado */}
          {jugadores.some((j) => !j.bandoId) && (
            <View style={styles.cardSinAsignar}>
              <View style={styles.headerSinAsignar}>
                <MaterialCommunityIcons name="account-clock" size={16} color={colors.warning} style={{ marginRight: 6 }} />
                <Text style={styles.tituloSinAsignar}>
                  OPERADORES POR ASIGNAR ({jugadores.filter((j) => !j.bandoId).length})
                </Text>
              </View>
              <View style={styles.jugadoresList}>
                {jugadores
                  .filter((j) => !j.bandoId)
                  .map((j) => (
                    <Text key={j.jugadorId} style={styles.jugadorItem}>
                      • {j.alias} <Text style={styles.rolTag}>[{j.rol}]</Text>
                      {j.jugadorId === jugador?.id ? ' (TÚ - Elige un bando arriba)' : ''}
                    </Text>
                  ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Modal para Seleccionar Rol antes de Alistarse */}
      <Modal
        visible={modalUnirseVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalUnirseVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>SELECCIONA TU ROL</Text>
            <Text style={styles.modalSubtitulo}>
              Indica tu función táctica para esta operación:
            </Text>

            <View style={styles.rolesModalGrid}>
              {ROLES_TACTICOS.map((rol) => {
                const activo = rolesSeleccionados.includes(rol);
                return (
                  <TouchableOpacity
                    key={rol}
                    style={[styles.rolModalChip, activo && styles.rolModalChipActivo]}
                    onPress={() => toggleRolUnirse(rol)}
                  >
                    <Text
                      style={[
                        styles.rolModalTexto,
                        activo && styles.rolModalTextoActivo,
                      ]}
                    >
                      {rol}
                    </Text>
                    {activo && <Text style={styles.rolModalCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalUnirseVisible(false)}
              >
                <Text style={styles.modalTxtCancelar}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnGuardar}
                onPress={confirmarUnirseBando}
                disabled={uniendose}
              >
                {uniendose ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTxtGuardar}>CONFIRMAR</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Modificación de Evento (Organizador) */}
      <Modal
        visible={modalEditarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalEditarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>MODIFICAR OPERACIÓN</Text>
            <Text style={styles.modalSubtitulo}>
              Actualiza los parámetros generales del evento:
            </Text>

            <Text style={styles.inputModalLabel}>TÍTULO:</Text>
            <TextInput
              style={styles.inputModal}
              value={editTitulo}
              onChangeText={setEditTitulo}
              placeholder="Nombre del evento"
              placeholderTextColor={colors.textMuted}
            />

            <View style={{ marginVertical: 4 }}>
              <TacticalDateTimePicker
                label="FECHA Y HORA DE INICIO:"
                value={editFechaInicio}
                onChange={(d) => {
                  setEditFechaInicio(d);
                  if (d >= editFechaFin) {
                    const nuevoFin = new Date(d);
                    nuevoFin.setHours(d.getHours() + 4);
                    setEditFechaFin(nuevoFin);
                  }
                }}
              />

              <TacticalDateTimePicker
                label="FECHA Y HORA DE TÉRMINO:"
                value={editFechaFin}
                minimumDate={editFechaInicio}
                onChange={setEditFechaFin}
              />
            </View>

            <Text style={styles.inputModalLabel}>BRIEFING / DESCRIPCIÓN:</Text>
            <TextInput
              style={[styles.inputModal, { minHeight: 70, textAlignVertical: 'top' }]}
              value={editDescripcion}
              onChangeText={setEditDescripcion}
              placeholder="Reglas, historia, objetivos..."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalEditarVisible(false)}
              >
                <Text style={styles.modalTxtCancelar}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnGuardar}
                onPress={handleGuardarModificacion}
                disabled={guardandoEdicion}
              >
                {guardandoEdicion ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTxtGuardar}>GUARDAR CAMBIOS</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal QR para Operadores Atrasados / Reclutamiento en Terreno */}
      <Modal
        visible={modalQrVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalQrVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="qrcode" size={26} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>RADAR DE INGRESO EN TERRENO</Text>
                <Text style={styles.modalSubtitulo}>
                  Muestra este código a operadores atrasados para sumarse a la operación.
                </Text>
              </View>
            </View>

            {/* Pestañas: Partida General vs Bando Directo */}
            <View style={styles.qrTabsRow}>
              <TouchableOpacity
                style={[styles.qrTabBtn, tabQrAtrasados === 'PARTIDA' && styles.qrTabBtnActivo]}
                onPress={() => setTabQrAtrasados('PARTIDA')}
              >
                <Text
                  style={[
                    styles.qrTabTxt,
                    tabQrAtrasados === 'PARTIDA' && styles.qrTabTxtActivo,
                  ]}
                >
                  SALA GENERAL
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.qrTabBtn, tabQrAtrasados === 'BANDO' && styles.qrTabBtnActivo]}
                onPress={() => {
                  setTabQrAtrasados('BANDO');
                  if (!bandoQrSeleccionadoId && evento.bandos && evento.bandos.length > 0) {
                    setBandoQrSeleccionadoId(evento.bandos[0].id);
                  }
                }}
              >
                <Text
                  style={[
                    styles.qrTabTxt,
                    tabQrAtrasados === 'BANDO' && styles.qrTabTxtActivo,
                  ]}
                >
                  BANDO DIRECTO
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector de Bandos si la pestaña es BANDO */}
            {tabQrAtrasados === 'BANDO' && (
              <View style={styles.bandoSelectorQrRow}>
                {evento.bandos?.map((b) => {
                  const activo = (bandoQrSeleccionadoId || evento.bandos?.[0]?.id) === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.chipBandoQr,
                        activo && {
                          borderColor: b.colorHex || colors.primary,
                          backgroundColor: 'rgba(224, 109, 40, 0.18)',
                        },
                      ]}
                      onPress={() => setBandoQrSeleccionadoId(b.id)}
                    >
                      <View style={[styles.dotBando, { backgroundColor: b.colorHex || colors.primary }]} />
                      <Text style={[styles.txtChipBando, activo && { color: '#fff', fontWeight: '800' }]}>
                        {b.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Imagen del Código QR */}
            <View style={styles.qrContainerBox}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    tabQrAtrasados === 'PARTIDA'
                      ? evento.codigoInvitacion || String(evento.id)
                      : evento.bandos?.find(
                          (b) => b.id === (bandoQrSeleccionadoId || evento.bandos?.[0]?.id),
                        )?.qrToken || evento.codigoInvitacion || String(evento.id),
                  )}`,
                }}
                style={styles.qrImage}
                resizeMode="contain"
              />

              <View style={styles.qrCodigoFooter}>
                <Text style={styles.qrCodigoSub}>CÓDIGO DE ENLACE TÁCTICO:</Text>
                <Text style={styles.qrCodigoText}>{evento.codigoInvitacion || 'N/A'}</Text>
                <Text style={styles.qrInstruccion}>
                  {tabQrAtrasados === 'PARTIDA'
                    ? 'El atrasado escanea con la app para abrir los detalles y elegir su bando.'
                    : 'Al escanear este código en el campo, queda enlistado inmediatamente en este bando.'}
                </Text>
              </View>
            </View>

            {/* Acciones del Modal */}
            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalQrVisible(false)}
              >
                <Text style={styles.modalTxtCancelar}>CERRAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnCompartirModal}
                onPress={handleCompartirOperacion}
              >
                <MaterialCommunityIcons name="share-variant" size={15} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.modalTxtGuardar}>COMPARTIR LINK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Iniciar Evento / Elegir Modalidad */}
      <Modal
        visible={modalIniciarPartidaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalIniciarPartidaVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCardModalidad}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="flag-checkered" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>INICIAR PARTIDA / MODALIDAD</Text>
                <Text style={styles.modalSubtitulo}>
                  Elige la modalidad táctica configurada en administración:
                </Text>
              </View>
            </View>

            <Text style={styles.inputModalLabel}>NOMBRE DE LA PARTIDA (OPCIONAL):</Text>
            <TextInput
              style={styles.inputModal}
              placeholder={`ej: Partida ${partidas.length + 1} (${modalidadSeleccionada?.nombre || 'TDM'})`}
              placeholderTextColor={colors.textMuted}
              value={nombreNuevaPartida}
              onChangeText={setNombreNuevaPartida}
            />

            <Text style={styles.inputModalLabel}>MODALIDAD DE JUEGO:</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {modalidades.map((m) => {
                const activo = (modalidadSeleccionada?.id || modalidades[0]?.id) === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.itemModalidadCard, activo && styles.itemModalidadCardActivo]}
                    onPress={() => setModalidadSeleccionada(m)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemModalidadHeader}>
                      <View style={styles.itemModalidadTituloRow}>
                        <MaterialCommunityIcons
                          name={((m.icono as any) || 'sword-cross')}
                          size={18}
                          color={activo ? colors.primary : colors.textSecondary}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.itemModalidadNombre, activo && styles.itemModalidadNombreActivo]}>
                          {m.nombre}
                        </Text>
                      </View>
                      {activo && (
                        <View style={styles.badgeActivoCheck}>
                          <Text style={styles.txtActivoCheck}>✓</Text>
                        </View>
                      )}
                    </View>
                    {m.descripcion && (
                      <Text style={styles.itemModalidadDesc}>{m.descripcion}</Text>
                    )}
                    {m.reglas && (
                      <Text style={styles.itemModalidadReglas}>• Reglas: {m.reglas}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalIniciarPartidaVisible(false)}
              >
                <Text style={styles.modalTxtCancelar}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmarIniciar, creandoPartida && styles.botonDeshabilitado]}
                onPress={handleIniciarPartida}
                disabled={creandoPartida}
              >
                {creandoPartida ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="play-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtConfirmarIniciar}>ARRANCAR COMBATE 🔴</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Cancelar Evento con Motivos Predefinidos */}
      <Modal
        visible={modalCancelarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCancelarVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="alert-octagon" size={26} color={colors.danger} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.modalTitulo, { color: colors.danger }]}>CANCELAR OPERACIÓN</Text>
                <Text style={styles.modalSubtitulo}>
                  El evento quedará registrado como cancelado para todos los operadores alistados.
                </Text>
              </View>
            </View>

            <Text style={styles.inputModalLabel}>SELECCIONA EL MOTIVO:</Text>
            <View style={{ marginVertical: 6 }}>
              {MOTIVOS_CANCELACION.map((motivo) => {
                const activo = motivoSeleccionado === motivo;
                return (
                  <TouchableOpacity
                    key={motivo}
                    style={[styles.itemMotivoChip, activo && styles.itemMotivoChipActivo]}
                    onPress={() => setMotivoSeleccionado(motivo)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={activo ? 'radiobox-marked' : 'radiobox-blank'}
                      size={18}
                      color={activo ? colors.danger : colors.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.txtMotivoChip, activo && styles.txtMotivoChipActivo]}>
                      {motivo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {motivoSeleccionado === 'Otro motivo...' && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.inputModalLabel}>EXPLICA EL MOTIVO:</Text>
                <TextInput
                  style={[styles.inputModal, styles.inputModalArea]}
                  value={motivoOtroTexto}
                  onChangeText={setMotivoOtroTexto}
                  placeholder="Detalla la razón de la cancelación..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>
            )}

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalCancelarVisible(false)}
              >
                <Text style={styles.modalTxtCancelar}>VOLVER</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmarCancelarEvento, cancelandoEvento && styles.botonDeshabilitado]}
                onPress={handleConfirmarCancelacion}
                disabled={cancelandoEvento}
              >
                {cancelandoEvento ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cancel" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.txtConfirmarCancelarEvento}>CANCELAR EVENTO</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  centroCargando: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  textoCargando: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 13,
  },
  resumenCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  tipoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tagTipo: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  estadoTag: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titulo: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  metaFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  metaIcon: {
    fontSize: 13,
    marginRight: 6,
    width: 18,
  },
  metaTexto: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  codigoBox: {
    marginTop: 12,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  codigoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  codigoLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgePrivacidadSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  badgePrivacidadCerrado: {
    backgroundColor: 'rgba(214, 158, 46, 0.15)',
  },
  badgePrivacidadAbierto: {
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
  },
  textoPrivacidadSmall: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  codigoValor: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 2,
  },
  codigoAyuda: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  accionesOperacionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  btnCompartir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  txtBtnCompartir: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnMostrarQrAtrasados: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  txtBtnMostrarQrAtrasados: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  estadoInscripcion: {
    marginTop: 12,
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  textoInscrito: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  seccion: {
    marginBottom: 16,
  },
  seccionTitulo: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  briefingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  briefingTexto: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  panelOrganizadorCard: {
    backgroundColor: 'rgba(214, 158, 46, 0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D69E2E',
    marginBottom: 16,
  },
  panelOrganizadorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  panelOrganizadorIcono: {
    fontSize: 16,
    marginRight: 6,
  },
  panelOrganizadorTitulo: {
    color: '#D69E2E',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  panelOrganizadorDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  panelOrganizadorBotones: {
    gap: 8,
  },
  btnGenerarQrComandante: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBtnGenerarQr: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnFinalizarEvento: {
    backgroundColor: '#991B1B', // Dark tactical red
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DC2626',
    marginTop: 2,
  },
  textoBtnFinalizarEvento: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerEventoFinalizado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 158, 46, 0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 4,
  },
  textoEventoFinalizadoTitulo: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textoEventoFinalizadoSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  panelBotonesSecundarios: {
    flexDirection: 'row',
    gap: 8,
  },
  btnModificarEvento: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D69E2E',
  },
  textoBtnModificar: {
    color: '#D69E2E',
    fontSize: 11,
    fontWeight: '800',
  },
  btnEliminarEvento: {
    flex: 1,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  textoBtnEliminar: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  sinPartidasCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  textoSinPartidas: {
    color: colors.textMuted,
    fontSize: 12,
  },
  partidaCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  partidaCardFinalizada: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: '#0F1D17',
  },
  partidaCardEnCurso: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: '#1E1212',
  },
  partidaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partidaNombre: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  partidaEstado: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  partidaEstadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeFinalizada: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  badgeEnCurso: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
  },
  badgePendiente: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.warning,
  },
  partidaEstadoTexto: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  marcadorResumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  marcadorEquipoTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
  marcadorPtsBold: {
    fontWeight: '900',
    fontSize: 13,
  },
  marcadorVsMini: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  partidaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnEntrarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rondasConteo: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  textoEnVivo: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '900',
  },
  bandoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
  },
  bandoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bandoTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  bandoNombre: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  bandoConteo: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  jugadoresList: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 4,
  },
  sinOperadores: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  jugadorItem: {
    color: colors.text,
    fontSize: 12,
  },
  rolTag: {
    color: colors.primary,
    fontWeight: '700',
  },
  botonUnirseBando: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBotonUnirse: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalSubtitulo: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 14,
  },
  rolesModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  rolModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  rolModalChipActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
  },
  rolModalTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  rolModalTextoActivo: {
    color: colors.primary,
    fontWeight: '800',
  },
  rolModalCheck: {
    color: colors.primary,
    fontWeight: '900',
  },
  inputModalLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inputModal: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalBtnCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalTxtCancelar: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBtnGuardar: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalTxtGuardar: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  modalHeaderQr: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  qrTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  qrTabBtnActivo: {
    backgroundColor: colors.primary,
  },
  qrTabTxt: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrTabTxtActivo: {
    color: '#fff',
  },
  bandoSelectorQrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chipBandoQr: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  dotBando: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txtChipBando: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  qrContainerBox: {
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  qrImage: {
    width: 210,
    height: 210,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
  },
  qrCodigoFooter: {
    alignItems: 'center',
    width: '100%',
  },
  qrCodigoSub: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  qrCodigoText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    marginVertical: 2,
  },
  qrInstruccion: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  btnCompartirModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  btnIniciarEventoPrincipal: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBtnIniciarEventoPrincipal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  seccionHeaderPartidas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  btnNuevaPartidaMini: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
  },
  txtNuevaPartidaMini: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnIniciarPrimeraPartida: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  txtIniciarPrimeraPartida: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  partidaHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  badgeModalidad: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderRadius: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  txtBadgeModalidad: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  modalCardModalidad: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    width: '100%',
    maxWidth: 420,
  },
  itemModalidadCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemModalidadCardActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
  },
  itemModalidadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemModalidadTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemModalidadNombre: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  itemModalidadNombreActivo: {
    color: colors.primary,
  },
  badgeActivoCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txtActivoCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  itemModalidadDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  itemModalidadReglas: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
    fontStyle: 'italic',
  },
  btnConfirmarIniciar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  txtConfirmarIniciar: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Banners de Estado Global
  bannerEventoCanceladoGlobal: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tituloEventoCanceladoGlobal: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  motivoEventoCanceladoGlobal: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  bannerEventoFinalizadoGlobal: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tituloEventoFinalizadoGlobal: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subEventoFinalizadoGlobal: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  estadoTagBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  estadoTagCancelado: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
  },
  estadoTagFinalizado: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: colors.success,
  },
  estadoTagEnCurso: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
  },
  estadoTagProgramado: {
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
    borderColor: colors.primary,
  },
  estadoTagTexto: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: colors.primary,
  },
  btnCancelarEvento: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  textoBtnCancelar: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  pichangaInscritosCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pichangaAvisoTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
    backgroundColor: colors.inputBg,
    padding: 10,
    borderRadius: 8,
  },
  jugadorInscritoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  badgeTuPerfilMini: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txtTuPerfilMini: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  btnAlistarsePichangaMini: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  txtAlistarsePichangaMini: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bandoActualBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 10,
  },
  txtBandoActual: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  cardSinAsignar: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginTop: 12,
  },
  headerSinAsignar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tituloSinAsignar: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  itemMotivoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemMotivoChipActivo: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  txtMotivoChip: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  txtMotivoChipActivo: {
    color: '#fff',
    fontWeight: '800',
  },
  inputModalArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  btnConfirmarCancelarEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  txtConfirmarCancelarEvento: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
