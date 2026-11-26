import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Share,
  KeyboardAvoidingView,
  Platform,
  Switch,
  RefreshControl,
  Linking,
  Keyboard,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  obtenerEventoApi,
  unirseEventoApi,
  desinscribirseEventoApi,
  modificarEventoApi,
  cambiarEstadoEventoApi,
  DetalleEventoResponse,
  Bando,
  Escuadra,
  gestionarInscripcionesApi,
  designarLiderBandoApi,
  crearEscuadraApi,
  generarEscuadrasApi,
  eliminarEscuadraApi,
  unirseEscuadraApi,
  salirEscuadraApi,
  agregarCoorganizadorApi,
  removerCoorganizadorApi,
  activarFaseApi,
  registrarCronoReplicaApi,
  eliminarRegistroCronoApi,
  crearMisionApi,
  actualizarEstadoMisionApi,
  eliminarMisionApi,
  MisionEvento,
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
import {
  obtenerRecordatoriosPartida,
  programarRecordatorioPartida,
  cancelarRecordatorioPartida,
  limpiarRecordatoriosDePartida,
  PreferenciasRecordatorioPartida,
} from '../../services/deviceNotifications.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TacticalDateTimePicker } from '../../components/TacticalDateTimePicker';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { obtenerEstiloFama } from '../../utils/fama.util';
import { MesaCronometrajeFase1 } from './components/MesaCronometrajeFase1';
import { MisionesCombateFase2 } from './components/MisionesCombateFase2';
import { ModalConfirmacionTactico } from '../../components/ModalConfirmacionTactico';
import type { NavigationProp } from '../../navigation/types';

const ROLES_TACTICOS = ['ASALTO', 'CQB', 'SNIPER', 'DMR', 'APOYO', 'MÉDICO'];

export const EventoDetalleScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { jugador } = useAuth();
  const rawId = route.params?.eventoId || route.params?.id;
  const eventoId = rawId ? Number(rawId) : 0;

  const [detalle, setDetalle] = useState<DetalleEventoResponse | null>(null);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [uniendose, setUniendose] = useState(false);
  const [desinscribiendose, setDesinscribiendose] = useState(false);

  // Modal Táctico Unificado (Avisos y Confirmaciones)
  const [modalTactico, setModalTactico] = useState<{
    visible: boolean;
    titulo: string;
    mensaje: string;
    tipo: 'primario' | 'peligro' | 'advertencia' | 'exito';
    icono?: keyof typeof MaterialCommunityIcons.glyphMap;
    textoConfirmar?: string;
    textoCancelar?: string;
    soloAceptar?: boolean;
    cargando?: boolean;
    onConfirmar?: () => void;
    onCancelar?: () => void;
  }>({
    visible: false,
    titulo: '',
    mensaje: '',
    tipo: 'primario',
  });

  const mostrarAvisoTactico = (
    titulo: string,
    mensaje: string,
    tipo: 'primario' | 'peligro' | 'advertencia' | 'exito' = 'primario',
    icono?: keyof typeof MaterialCommunityIcons.glyphMap,
  ) => {
    setModalTactico({
      visible: true,
      titulo,
      mensaje,
      tipo,
      icono,
      soloAceptar: true,
      textoConfirmar: 'ENTENDIDO',
      onConfirmar: () => setModalTactico((prev) => ({ ...prev, visible: false })),
    });
  };

  const mostrarConfirmacionTactico = (
    titulo: string,
    mensaje: string,
    onConfirmar: () => void,
    opciones?: {
      tipo?: 'primario' | 'peligro' | 'advertencia' | 'exito';
      icono?: keyof typeof MaterialCommunityIcons.glyphMap;
      textoConfirmar?: string;
      textoCancelar?: string;
      onCancelar?: () => void;
    },
  ) => {
    setModalTactico({
      visible: true,
      titulo,
      mensaje,
      tipo: opciones?.tipo || 'primario',
      icono: opciones?.icono,
      textoConfirmar: opciones?.textoConfirmar || 'CONFIRMAR',
      textoCancelar: opciones?.textoCancelar || 'CANCELAR',
      soloAceptar: false,
      onConfirmar,
      onCancelar: opciones?.onCancelar || (() => setModalTactico((prev) => ({ ...prev, visible: false }))),
    });
  };

  // Recordatorios tácticos en el móvil para esta partida
  const [recordatorios, setRecordatorios] = useState<PreferenciasRecordatorioPartida>({
    diaAntes: false,
    min30: false,
  });
  const [cargandoRecordatorio, setCargandoRecordatorio] = useState(false);

  // Modal para unirse con selección de rol
  const [modalUnirseVisible, setModalUnirseVisible] = useState(false);
  const [bandoAUnirseId, setBandoAUnirseId] = useState<number | null>(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>(['ASALTO']);

  // Flujo Guiado de Alistamiento Milsim (4 Pasos)
  const [modalAlistamientoMilsimVisible, setModalAlistamientoMilsimVisible] = useState(false);
  const [pasoAlistamiento, setPasoAlistamiento] = useState<1 | 2 | 3 | 4>(1);
  const [reglasAceptadas, setReglasAceptadas] = useState(false);
  const [bandoAlistamientoId, setBandoAlistamientoId] = useState<number | null>(null);
  const [replicasAlistamiento, setReplicasAlistamiento] = useState<
    Array<{
      id: string;
      tipoReplica: 'PRIMARIA' | 'PRIMARIA_2' | 'SECUNDARIA' | 'RESPALDO';
      categoria: string;
      modelo: string;
      fpsEstimado: string;
    }>
  >([
    {
      id: '1',
      tipoReplica: 'PRIMARIA',
      categoria: 'ASALTO',
      modelo: '',
      fpsEstimado: '380',
    },
  ]);
  const [notifDiaAntesAlistamiento, setNotifDiaAntesAlistamiento] = useState(true);
  const [notif30MinAlistamiento, setNotif30MinAlistamiento] = useState(true);
  const [alistandoseMilsim, setAlistandoseMilsim] = useState(false);

  // Modal de modificación para el organizador
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editFechaInicio, setEditFechaInicio] = useState<Date>(new Date());
  const [editFechaFin, setEditFechaFin] = useState<Date>(new Date());
  const [editVidasMax, setEditVidasMax] = useState('2');
  const [editTiempoDesangradoMin, setEditTiempoDesangradoMin] = useState('5');
  const [editRequiereTorniquete, setEditRequiereTorniquete] = useState(true);
  const [editLimitesCrono, setEditLimitesCrono] = useState<any[]>([]);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Estados para Mesa de Cronometraje Visible en Terreno
  const [filtroCronoStaff, setFiltroCronoStaff] = useState('');
  const [fpsInputsStaff, setFpsInputsStaff] = useState<Record<number, string>>({});
  const [guardandoCronoRapidoId, setGuardandoCronoRapidoId] = useState<number | null>(null);

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

  // Estado para Eventos Masivos: Facciones, Escuadras y Co-organizadores
  const [modalEscuadrasVisible, setModalEscuadrasVisible] = useState(false);
  const [bandoSeleccionadoParaEscuadras, setBandoSeleccionadoParaEscuadras] = useState<Bando | null>(null);
  const [modoEscuadra, setModoEscuadra] = useState<'GENERAR' | 'CREAR_UNA'>('GENERAR');
  const [cantidadEscuadras, setCantidadEscuadras] = useState('4');
  const [nombreNuevaEscuadra, setNombreNuevaEscuadra] = useState('');
  const [cupoMaxNuevaEscuadra, setCupoMaxNuevaEscuadra] = useState('10');
  const [guardandoEscuadra, setGuardandoEscuadra] = useState(false);

  const [modalLiderBandoVisible, setModalLiderBandoVisible] = useState(false);
  const [bandoSeleccionadoParaLider, setBandoSeleccionadoParaLider] = useState<Bando | null>(null);
  const [guardandoLider, setGuardandoLider] = useState(false);

  const [modalCoorganizadorVisible, setModalCoorganizadorVisible] = useState(false);
  const [guardandoCoorganizador, setGuardandoCoorganizador] = useState(false);

  const [cambiandoInscripciones, setCambiandoInscripciones] = useState(false);
  const [uniendoseAEscuadra, setUniendoseAEscuadra] = useState(false);
  const [panelOrganizadorAbierto, setPanelOrganizadorAbierto] = useState(false);
  const [desplegableConfigVisible, setDesplegableConfigVisible] = useState(false);
  const [faccionesExpandidas, setFaccionesExpandidas] = useState<Record<number, boolean>>({});

  // Estados para TACSOP, COMMS, Fases y Cronaje (Eventos Masivos)
  const [modalTacsopVisible, setModalTacsopVisible] = useState(false);
  const [modalSoloCronoVisible, setModalSoloCronoVisible] = useState(false);
  const [modalMapaVisible, setModalMapaVisible] = useState(false);
  const [modalBlindManVisible, setModalBlindManVisible] = useState(false);

  // Modal de Cronaje (Staff)
  const [modalCronoVisible, setModalCronoVisible] = useState(false);
  const [cronoJugadorId, setCronoJugadorId] = useState<number | null>(null);
  const [cronoTipoReplica, setCronoTipoReplica] = useState<string>('PRIMARIA');
  const [cronoCategoria, setCronoCategoria] = useState<string>('ASALTO');
  const [cronoModelo, setCronoModelo] = useState<string>('');
  const [cronoJoules, setCronoJoules] = useState<string>('');
  const [cronoFps, setCronoFps] = useState<string>('');
  const [cronoGramaje, setCronoGramaje] = useState<string>('0.25');
  const [cronoAprobado, setCronoAprobado] = useState<boolean>(true);
  const [cronoNotas, setCronoNotas] = useState<string>('');
  const [guardandoCrono, setGuardandoCrono] = useState(false);
  const [cambiandoFase, setCambiandoFase] = useState(false);

  // Estados para Misiones Tácticas (Fase 2 / Masivos)
  const [modalMisionVisible, setModalMisionVisible] = useState(false);
  const [misionTitulo, setMisionTitulo] = useState('');
  const [misionBandoId, setMisionBandoId] = useState<number | null>(null);
  const [misionDescLider, setMisionDescLider] = useState('');
  const [misionDescOperadores, setMisionDescOperadores] = useState('');
  const [misionFotoUrl, setMisionFotoUrl] = useState('');
  const [guardandoMision, setGuardandoMision] = useState(false);
  const [modalFotoMisionVisible, setModalFotoMisionVisible] = useState(false);
  const [fotoMisionSeleccionada, setFotoMisionSeleccionada] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      const [resEvento, resPartidas, resRecordatorios] = await Promise.all([
        obtenerEventoApi(eventoId),
        listarPartidasPorEventoApi(eventoId),
        obtenerRecordatoriosPartida(eventoId),
      ]);
      setDetalle(resEvento);
      setPartidas(resPartidas);

      if (
        resEvento?.evento?.estado === 'EN_CURSO' ||
        resEvento?.evento?.estado === 'CANCELADO' ||
        resEvento?.evento?.estado === 'FINALIZADO'
      ) {
        await limpiarRecordatoriosDePartida(eventoId);
        setRecordatorios({ diaAntes: false, min30: false });
      } else {
        setRecordatorios(resRecordatorios);
      }

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
      mostrarAvisoTactico('ERROR DE CONEXIÓN', error.message || 'No se pudo cargar la información del evento.', 'peligro', 'cloud-alert');
    } finally {
      setCargando(false);
    }
  };

  const handleRefresh = async () => {
    setRefrescando(true);
    await cargarDatos();
    setRefrescando(false);
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

  const handleToggleDiaAntes = async (activar: boolean) => {
    if (!detalle?.evento || !detalle.evento.fechaInicio) {
      mostrarAvisoTactico('FECHA PENDIENTE', 'Este evento aún no tiene una fecha y hora de inicio confirmada.', 'advertencia', 'calendar-clock');
      return;
    }
    if (jugador?.recibeNotificaciones === false) {
      mostrarAvisoTactico(
        'NOTIFICACIONES DESACTIVADAS',
        'Tienes las notificaciones desactivadas en la pestaña de Ajustes. Actívalas primero para que tu teléfono pueda sonar.',
        'advertencia',
        'bell-off',
      );
      return;
    }

    try {
      setCargandoRecordatorio(true);
      if (activar) {
        const res = await programarRecordatorioPartida(
          eventoId,
          detalle.evento.titulo,
          detalle.evento.fechaInicio,
          'DIA_ANTERIOR',
        );
        if (!res.ok) {
          mostrarAvisoTactico('AVISO', res.mensajeError || 'No se pudo programar el recordatorio.', 'advertencia', 'bell-alert');
          return;
        }
        setRecordatorios((prev) => ({ ...prev, diaAntes: true, diaAntesId: res.id }));
        mostrarAvisoTactico('RECORDATORIO FIJADO', 'Te avisaremos 24 horas antes del inicio de la operación.', 'exito', 'bell-check');
      } else {
        await cancelarRecordatorioPartida(eventoId, 'DIA_ANTERIOR');
        setRecordatorios((prev) => ({ ...prev, diaAntes: false, diaAntesId: null }));
      }
    } catch {
      mostrarAvisoTactico('ERROR', 'Ocurrió un problema al modificar el recordatorio.', 'peligro', 'alert-circle-outline');
    } finally {
      setCargandoRecordatorio(false);
    }
  };

  const handleToggle30Min = async (activar: boolean) => {
    if (!detalle?.evento || !detalle.evento.fechaInicio) {
      mostrarAvisoTactico('FECHA PENDIENTE', 'Este evento aún no tiene una fecha y hora de inicio confirmada.', 'advertencia', 'calendar-clock');
      return;
    }
    if (jugador?.recibeNotificaciones === false) {
      mostrarAvisoTactico(
        'NOTIFICACIONES DESACTIVADAS',
        'Tienes las notificaciones desactivadas en la pestaña de Ajustes. Actívalas primero para que tu teléfono pueda sonar.',
        'advertencia',
        'bell-off',
      );
      return;
    }

    try {
      setCargandoRecordatorio(true);
      if (activar) {
        const res = await programarRecordatorioPartida(
          eventoId,
          detalle.evento.titulo,
          detalle.evento.fechaInicio,
          '30_MINUTOS',
        );
        if (!res.ok) {
          mostrarAvisoTactico('AVISO', res.mensajeError || 'No se pudo programar el recordatorio.', 'advertencia', 'bell-alert');
          return;
        }
        setRecordatorios((prev) => ({ ...prev, min30: true, min30Id: res.id }));
        mostrarAvisoTactico('RECORDATORIO FIJADO', 'Te avisaremos 30 minutos antes de comenzar.', 'exito', 'bell-check');
      } else {
        await cancelarRecordatorioPartida(eventoId, '30_MINUTOS');
        setRecordatorios((prev) => ({ ...prev, min30: false, min30Id: null }));
      }
    } catch {
      mostrarAvisoTactico('ERROR', 'Ocurrió un problema al modificar el recordatorio.', 'peligro', 'alert-circle-outline');
    } finally {
      setCargandoRecordatorio(false);
    }
  };

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
      mostrarConfirmacionTactico(
        'PARTIDA INICIADA',
        `Se ha iniciado "${nombreFinal}" con modalidad ${modalidadSeleccionada?.nombre || 'Estándar'}.`,
        () => {
          setModalTactico((prev) => ({ ...prev, visible: false }));
          cargarDatos();
          navigation.navigate('PartidaEnVivo', {
            partidaId: nuevaPartida.id,
            titulo: `${detalle?.evento.titulo} - ${nombreFinal}`,
          });
        },
        {
          tipo: 'exito',
          icono: 'crosshairs',
          textoConfirmar: 'ENTRAR EN VIVO',
          textoCancelar: 'PERMANECER AQUÍ',
        },
      );
    } catch (error: any) {
      mostrarAvisoTactico('ERROR AL INICIAR', error.message || 'No se pudo iniciar la partida.', 'peligro', 'alert-circle-outline');
    } finally {
      setCreandoPartida(false);
    }
  };

  const handleFinalizarEvento = () => {
    mostrarConfirmacionTactico(
      '¿FINALIZAR ESTE EVENTO?',
      '¿Deseas dar por concluida oficialmente esta jornada táctica?\n\nAl finalizar, el evento quedará registrado como concluido y no se podrán añadir nuevas partidas.',
      async () => {
        try {
          setModalTactico((prev) => ({ ...prev, visible: false }));
          setFinalizandoEvento(true);
          await cambiarEstadoEventoApi(eventoId, 'FINALIZADO');
          await limpiarRecordatoriosDePartida(eventoId);
          setRecordatorios({ diaAntes: false, min30: false });
          await cargarDatos();
          mostrarAvisoTactico('EVENTO FINALIZADO', 'La jornada táctica ha concluido oficialmente con éxito.', 'exito', 'trophy-award');
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo finalizar el evento.', 'peligro', 'alert-circle-outline');
        } finally {
          setFinalizandoEvento(false);
        }
      },
      {
        tipo: 'peligro',
        icono: 'flag-checkered',
        textoConfirmar: 'FINALIZAR EVENTO',
      },
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
      mostrarAvisoTactico(
        '¡ALISTADO!',
        bandoAUnirseId
          ? 'Te has alistado exitosamente en este bando.'
          : 'Te has inscrito exitosamente a la pichanga.',
        'exito',
        'shield-check',
      );
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo completar la inscripción.', 'peligro', 'alert-circle-outline');
    } finally {
      setUniendose(false);
    }
  };

  const iniciarAlistamientoMilsim = (bandoPreId?: number | null) => {
    setPasoAlistamiento(1);
    setReglasAceptadas(false);
    setBandoAlistamientoId(bandoPreId ?? null);
    setReplicasAlistamiento([
      {
        id: '1',
        tipoReplica: 'PRIMARIA',
        categoria: 'ASALTO',
        modelo: '',
        fpsEstimado: '380',
      },
    ]);
    setNotifDiaAntesAlistamiento(true);
    setNotif30MinAlistamiento(true);
    setModalAlistamientoMilsimVisible(true);
  };

  const agregarReplicaSecundaria = () => {
    setReplicasAlistamiento((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        tipoReplica: 'SECUNDARIA',
        categoria: 'PISTOLA',
        modelo: '',
        fpsEstimado: '300',
      },
    ]);
  };

  const agregarReplicaPrimaria2 = () => {
    setReplicasAlistamiento((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        tipoReplica: 'PRIMARIA_2',
        categoria: 'ASALTO',
        modelo: '',
        fpsEstimado: '380',
      },
    ]);
  };

  const eliminarReplicaAlistamiento = (id: string) => {
    if (replicasAlistamiento.length <= 1) return;
    setReplicasAlistamiento((prev) => prev.filter((r) => r.id !== id));
  };

  const actualizarReplicaAlistamiento = (
    id: string,
    campo: 'categoria' | 'modelo' | 'fpsEstimado' | 'tipoReplica',
    valor: string,
  ) => {
    setReplicasAlistamiento((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)),
    );
  };


  const confirmarAlistamientoMilsimFinal = async () => {
    if (!bandoAlistamientoId) {
      mostrarAvisoTactico('BANDO REQUERIDO', 'Por favor selecciona una facción para alistarte.', 'advertencia', 'shield-account');
      setPasoAlistamiento(3);
      return;
    }

    try {
      setAlistandoseMilsim(true);
      const replicasPayload = replicasAlistamiento.map((r) => {
        const fps = parseInt(r.fpsEstimado, 10) || 0;
        const joules = Number((0.5 * 0.0002 * Math.pow(fps * 0.3048, 2)).toFixed(2));
        return {
          tipoReplica: r.tipoReplica,
          categoria: r.categoria,
          modelo: r.modelo.trim() || undefined,
          fpsEstimado: fps > 0 ? fps : undefined,
          joulesEstimados: joules > 0 ? joules : undefined,
        };
      });

      await unirseEventoApi({
        eventoId,
        codigoInvitacion: detalle?.evento.codigoInvitacion,
        bandoId: bandoAlistamientoId,
        rol: replicasAlistamiento[0]?.categoria || 'ASALTO',
        replicas: replicasPayload,
      });

      // Configurar recordatorios si fueron seleccionados por el jugador
      if (evento.fechaInicio) {
        const fechaIni = new Date(evento.fechaInicio);
        if (notifDiaAntesAlistamiento) {
          try {
            await programarRecordatorioPartida(
              eventoId,
              evento.titulo,
              evento.fechaInicio,
              'DIA_ANTERIOR',
            );
          } catch (e) {
            // Ignorar error de notificación local no crítico
          }
        }
        if (notif30MinAlistamiento) {
          try {
            await programarRecordatorioPartida(
              eventoId,
              evento.titulo,
              evento.fechaInicio,
              '30_MINUTOS',
            );
          } catch (e) {
            // Ignorar error de notificación local no crítico
          }
        }
      }

      setModalAlistamientoMilsimVisible(false);
      mostrarAvisoTactico(
        '¡ALISTAMIENTO COMPLETADO!',
        'Has aceptado el reglamento TACSOP y tus réplicas han quedado registradas para la mesa de cronómetro oficial.',
        'exito',
        'shield-check',
      );
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR DE ALISTAMIENTO', error.message || 'No se pudo completar el alistamiento', 'peligro', 'alert-circle');
    } finally {
      setAlistandoseMilsim(false);
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
      mostrarAvisoTactico('CAMBIO DE BANDO', 'Te has cambiado de bando exitosamente.', 'exito', 'swap-horizontal-bold');
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo cambiar de bando', 'peligro', 'alert-circle');
    } finally {
      setUniendose(false);
    }
  };

  const handleBajarseOperacion = () => {
    mostrarConfirmacionTactico(
      '¿BAJARTE DE LA OPERACIÓN?',
      '¿Estás seguro que deseas darte de baja de este evento táctico? Dejarás libre tu cupo en la escuadra.',
      async () => {
        setModalTactico((prev) => ({ ...prev, visible: false }));
        try {
          setDesinscribiendose(true);
          const res = await desinscribirseEventoApi(eventoId);
          await limpiarRecordatoriosDePartida(eventoId);
          setRecordatorios({ diaAntes: false, min30: false });
          mostrarAvisoTactico('BAJA CONFIRMADA', res.mensaje || 'Has abandonado la operación.', 'advertencia', 'account-arrow-left');
          cargarDatos();
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No pudiste bajarte del evento', 'peligro', 'alert-circle');
        } finally {
          setDesinscribiendose(false);
        }
      },
      {
        tipo: 'peligro',
        icono: 'account-remove',
        textoConfirmar: 'SÍ, BAJARME',
        textoCancelar: 'CANCELAR',
      },
    );
  };


  const handleCompartirOperacion = async () => {
    if (!detalle?.evento) return;
    const { evento } = detalle;
    const fechaTxt = evento.fechaInicio
      ? new Date(evento.fechaInicio).toLocaleString([], {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Fecha por confirmar';

    const mensajeTactico = `🪖 OPERACIÓN TÁCTICA: "${evento.titulo.toUpperCase()}"\n` +
      `📍 Cancha: ${evento.canchaNombre || 'Por asignar'}\n` +
      `⏰ Inicio: ${fechaTxt}\n` +
      `🎯 Modalidad: ${evento.tipo.replace('_', ' ')}\n` +
      `🔑 Código de invitación: ${evento.codigoInvitacion || 'N/A'}\n\n` +
      `¡Aliste sus réplicas e incorpórese al combate a través de Bájate-Po!`;

    try {
      await Share.share({
        message: mensajeTactico,
        title: `Operación: ${evento.titulo}`,
      });
    } catch {}
  };

  const abrirModalEditar = () => {
    setEditTitulo(evento.titulo || '');
    setEditDescripcion(evento.descripcion || '');
    setEditFechaInicio(evento.fechaInicio ? new Date(evento.fechaInicio) : new Date());
    setEditFechaFin(evento.fechaFin ? new Date(evento.fechaFin) : new Date());
    setEditVidasMax(String(evento.tacsop?.vidasMax || 2));
    setEditTiempoDesangradoMin(String(evento.tacsop?.tiempoDesangradoMin || 5));
    setEditRequiereTorniquete(evento.tacsop?.requiereTorniquete ?? true);
    setEditLimitesCrono(
      evento.tacsop?.limitesCrono && evento.tacsop.limitesCrono.length > 0
        ? JSON.parse(JSON.stringify(evento.tacsop.limitesCrono))
        : [
            { categoria: 'ASALTO', fpsMax: 400, joulesMax: 1.49, medMetros: 5, modoDisparo: 'SEMI' },
            { categoria: 'SOPORTE', fpsMax: 400, joulesMax: 1.49, medMetros: 15, modoDisparo: 'AUTO' },
            { categoria: 'DMR', fpsMax: 450, joulesMax: 1.88, medMetros: 20, modoDisparo: 'SEMI' },
            { categoria: 'SNIPER', fpsMax: 550, joulesMax: 2.81, medMetros: 30, modoDisparo: 'BOLT' },
            { categoria: 'PISTOLA', fpsMax: 328, joulesMax: 1.00, medMetros: 0, modoDisparo: 'SEMI' },
          ],
    );
    setModalEditarVisible(true);
  };

  const handleGuardarModificacion = async () => {
    Keyboard.dismiss();
    if (!editTitulo.trim()) {
      mostrarAvisoTactico('ATENCIÓN', 'El título de la operación es obligatorio.', 'advertencia', 'format-title');
      return;
    }

    try {
      setGuardandoEdicion(true);
      const payload: any = {
        titulo: editTitulo.trim(),
        descripcion: editDescripcion.trim() || undefined,
        fechaInicio: editFechaInicio.toISOString(),
        fechaFin: editFechaFin.toISOString(),
      };
      if (esMasivo) {
        payload.tacsop = {
          vidasMax: parseInt(editVidasMax, 10) || 2,
          tiempoDesangradoMin: parseInt(editTiempoDesangradoMin, 10) || 5,
          requiereTorniquete: editRequiereTorniquete,
          limitesCrono: editLimitesCrono,
        };
      }
      await modificarEventoApi(eventoId, payload);
      setModalEditarVisible(false);
      mostrarAvisoTactico('ÉXITO', 'La operación y sus parámetros TACSOP han sido actualizados.', 'exito', 'check-circle-outline');
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR AL MODIFICAR', error.message || 'No se pudo actualizar el evento', 'peligro', 'alert-circle');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleAvanzarSiguienteFase = (faseDestino: any) => {
    mostrarConfirmacionTactico(
      '¿AVANZAR A LA SIGUIENTE FASE?',
      `Estás a punto de pasar a "${faseDestino.nombre}".\n\n${
        faseDestino.esFaseCrono || faseDestino.orden === 2
          ? 'Se habilitará la mesa de cronómetro en terreno y la asignación a escuadras tácticas para los operadores homologados.'
          : 'Se notificará el cambio de fase a todos los operadores desplegados.'
      }`,
      async () => {
        setModalTactico((prev) => ({ ...prev, visible: false }));
        try {
          setCambiandoFase(true);
          await activarFaseApi(eventoId, faseDestino.id);
          mostrarAvisoTactico('FASE INICIADA', `La operación entra oficialmente en: "${faseDestino.nombre}"`, 'exito', 'flag-checkered');
          cargarDatos();
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo cambiar de fase', 'peligro', 'alert-circle');
        } finally {
          setCambiandoFase(false);
        }
      },
      {
        tipo: 'primario',
        icono: 'arrow-right-bold-circle',
        textoConfirmar: 'SÍ, AVANZAR DE FASE',
        textoCancelar: 'CANCELAR',
      },
    );
  };


  const handleAprobarCronoRapido = async (replica: any, aprobado: boolean) => {
    try {
      setGuardandoCronoRapidoId(replica.id);
      const fpsVal = parseInt(fpsInputsStaff[replica.id] || String(replica.fps || 380), 10);
      const joulesVal = Number((0.5 * 0.0002 * Math.pow(fpsVal * 0.3048, 2)).toFixed(2));
      await registrarCronoReplicaApi(eventoId, {
        jugadorId: replica.jugadorId,
        tipoReplica: replica.tipoReplica,
        categoria: replica.categoria,
        modelo: replica.modelo || undefined,
        fps: fpsVal,
        joules: joulesVal,
        gramajeBb: 0.20,
        aprobado,
        notas: aprobado ? 'HOMOLOGADA_EN_MESA' : 'EXCEDE_LIMITES_CRONO',
      });
      // Si existía un registro preliminar no cronado, limpiarlo
      if (!replica.cronoPorId && replica.id) {
        try {
          await eliminarRegistroCronoApi(eventoId, replica.id);
        } catch {}
      }
      mostrarAvisoTactico(
        aprobado ? 'RÉPLICA HOMOLOGADA' : 'RÉPLICA RECHAZADA',
        `${replica.categoria}: ${fpsVal} FPS (${joulesVal} J) ${aprobado ? 'APROBADA' : 'RECHAZADA'}`,
        aprobado ? 'exito' : 'peligro',
        aprobado ? 'check-decagram' : 'close-octagon',
      );
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo registrar la medición', 'peligro', 'alert-circle');
    } finally {
      setGuardandoCronoRapidoId(null);
    }
  };

  const handleConfirmarCancelacion = async () => {
    Keyboard.dismiss();
    const motivoFinal =
      motivoSeleccionado === 'Otro motivo...'
        ? motivoOtroTexto.trim() || 'Otro motivo'
        : motivoSeleccionado;

    try {
      setCancelandoEvento(true);
      await cambiarEstadoEventoApi(eventoId, 'CANCELADO', motivoFinal);
      await limpiarRecordatoriosDePartida(eventoId);
      setRecordatorios({ diaAntes: false, min30: false });
      setModalCancelarVisible(false);
      mostrarAvisoTactico(
        'OPERACIÓN CANCELADA',
        `El evento ha sido cancelado oficialmente.\nMotivo: ${motivoFinal}`,
        'peligro',
        'cancel',
      );
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR AL CANCELAR', error.message || 'No se pudo cancelar el evento', 'peligro', 'alert-circle');
    } finally {
      setCancelandoEvento(false);
    }
  };

  // Control de Inscripciones (Abrir / Cerrar)
  const handleToggleInscripciones = async () => {
    if (!detalle?.evento) return;
    const estanAbiertas = detalle.evento.inscripcionesAbiertas !== false;
    const nuevoEstado = !estanAbiertas;
    try {
      setCambiandoInscripciones(true);
      const res = await gestionarInscripcionesApi(eventoId, nuevoEstado);
      mostrarAvisoTactico('INSCRIPCIONES DE OPERACIÓN', res.mensaje, 'exito', nuevoEstado ? 'lock-open-outline' : 'lock-outline');
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo cambiar el estado de las inscripciones', 'peligro', 'alert-circle');
    } finally {
      setCambiandoInscripciones(false);
    }
  };

  // Habilitar / Crear Escuadras en el Bando
  const handleGenerarEscuadras = async () => {
    Keyboard.dismiss();
    if (!bandoSeleccionadoParaEscuadras) return;
    if (detalle?.evento?.inscripcionesAbiertas !== false) {
      mostrarAvisoTactico(
        'INSCRIPCIONES ABIERTAS',
        'Debes cerrar las inscripciones en el Panel del Organizador antes de poder habilitar o crear escuadras.',
        'advertencia',
        'lock-alert',
      );
      return;
    }
    try {
      setGuardandoEscuadra(true);
      if (modoEscuadra === 'GENERAR') {
        const res = await generarEscuadrasApi(eventoId, bandoSeleccionadoParaEscuadras.id, {
          cantidad: Number(cantidadEscuadras) || 4,
          prefijo: `Escuadra ${bandoSeleccionadoParaEscuadras.nombre}`,
          cupoMax: Number(cupoMaxNuevaEscuadra) || 10,
        });
        mostrarAvisoTactico('ESCUADRAS HABILITADAS', res.mensaje, 'exito', 'shield-account');
      } else {
        if (!nombreNuevaEscuadra.trim()) {
          mostrarAvisoTactico('ATENCIÓN', 'Por favor ingresa un nombre para la escuadra.', 'advertencia', 'pencil');
          return;
        }
        const res = await crearEscuadraApi(eventoId, bandoSeleccionadoParaEscuadras.id, {
          nombre: nombreNuevaEscuadra.trim(),
          cupoMax: Number(cupoMaxNuevaEscuadra) || 10,
        });
        mostrarAvisoTactico('ESCUADRA CREADA', res.mensaje, 'exito', 'shield-plus');
      }
      setModalEscuadrasVisible(false);
      setNombreNuevaEscuadra('');
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR AL GESTIONAR ESCUADRAS', error.message || 'No se pudieron habilitar las escuadras', 'peligro', 'alert-circle');
    } finally {
      setGuardandoEscuadra(false);
    }
  };

  // Disolver Escuadra
  const handleEliminarEscuadra = (escuadraId: number, nombre: string) => {
    mostrarConfirmacionTactico(
      'DISOLVER ESCUADRA',
      `¿Deseas desmantelar la "${nombre}"? Los operadores asignados quedarán en la reserva de la facción.`,
      async () => {
        setModalTactico((prev) => ({ ...prev, visible: false }));
        try {
          const res = await eliminarEscuadraApi(eventoId, escuadraId);
          mostrarAvisoTactico('ESCUADRA DISUELTA', res.mensaje, 'advertencia', 'shield-remove');
          cargarDatos();
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo disolver la escuadra', 'peligro', 'alert-circle');
        }
      },
      {
        tipo: 'peligro',
        icono: 'shield-remove',
        textoConfirmar: 'DISOLVER',
        textoCancelar: 'CANCELAR',
      },
    );
  };


  // Unirse a una Escuadra
  const handleUnirseEscuadra = async (escuadraId: number) => {
    try {
      setUniendoseAEscuadra(true);
      const res = await unirseEscuadraApi(eventoId, escuadraId);
      mostrarAvisoTactico('DESPLIEGUE TÁCTICO', res.mensaje, 'exito', 'shield-account');
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('AVISO DE DESPLIEGUE', error.message || 'No pudiste unirte a esta escuadra', 'advertencia', 'alert-circle');
    } finally {
      setUniendoseAEscuadra(false);
    }
  };

  // Salir de la Escuadra
  const handleSalirEscuadra = async () => {
    try {
      setUniendoseAEscuadra(true);
      const res = await salirEscuadraApi(eventoId);
      mostrarAvisoTactico('RESERVA TÁCTICA', res.mensaje, 'advertencia', 'account-arrow-left');
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo salir de la escuadra', 'peligro', 'alert-circle');
    } finally {
      setUniendoseAEscuadra(false);
    }
  };

  // Designar Líder de Bando
  const handleDesignarLider = async (nuevoLiderId: number | null) => {
    if (!bandoSeleccionadoParaLider) return;
    try {
      setGuardandoLider(true);
      const res = await designarLiderBandoApi(eventoId, bandoSeleccionadoParaLider.id, nuevoLiderId);
      mostrarAvisoTactico('COMANDANCIA DE FACCIÓN', res.mensaje, 'exito', 'crown');
      setModalLiderBandoVisible(false);
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo designar al líder de bando', 'peligro', 'alert-circle');
    } finally {
      setGuardandoLider(false);
    }
  };

  // Agregar Co-organizador
  const handleAgregarCoorganizador = async (nuevoOrganizadorId: number) => {
    try {
      setGuardandoCoorganizador(true);
      const res = await agregarCoorganizadorApi(eventoId, nuevoOrganizadorId);
      mostrarAvisoTactico('COMANDANCIA', res.mensaje, 'exito', 'account-star');
      setModalCoorganizadorVisible(false);
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo agregar al co-organizador', 'peligro', 'alert-circle');
    } finally {
      setGuardandoCoorganizador(false);
    }
  };

  // Remover Co-organizador
  const handleRemoverCoorganizador = (coorganizadorId: number, alias: string) => {
    mostrarConfirmacionTactico(
      'REVOCAR MANDO',
      `¿Deseas remover a "${alias}" de la comandancia organizadora?`,
      async () => {
        setModalTactico((prev) => ({ ...prev, visible: false }));
        try {
          const res = await removerCoorganizadorApi(eventoId, coorganizadorId);
          mostrarAvisoTactico('COMANDANCIA', res.mensaje, 'advertencia', 'account-remove');
          cargarDatos();
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo remover al co-organizador', 'peligro', 'alert-circle');
        }
      },
      {
        tipo: 'peligro',
        icono: 'account-remove',
        textoConfirmar: 'REMOVER',
        textoCancelar: 'CANCELAR',
      },
    );
  };


  // Activar Fase Operativa en Vivo
  const handleActivarFase = async (faseId: number) => {
    try {
      setCambiandoFase(true);
      const res = await activarFaseApi(eventoId, faseId);
      mostrarAvisoTactico('FASE OPERATIVA', res.mensaje, 'exito', 'flag-triangle');
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo activar la fase', 'peligro', 'alert-circle');
    } finally {
      setCambiandoFase(false);
    }
  };

  // Registrar Réplica en Crono
  const handleGuardarCrono = async () => {
    Keyboard.dismiss();
    if (!cronoJugadorId) {
      mostrarAvisoTactico('ATENCIÓN', 'Por favor selecciona el operador a cronar.', 'advertencia', 'account-search');
      return;
    }
    const joulesNum = parseFloat(cronoJoules);
    if (isNaN(joulesNum) || joulesNum <= 0) {
      mostrarAvisoTactico('ATENCIÓN', 'Por favor ingresa un valor de Joules válido (ej: 1.14).', 'advertencia', 'speedometer');
      return;
    }
    try {
      setGuardandoCrono(true);
      const res = await registrarCronoReplicaApi(eventoId, {
        jugadorId: cronoJugadorId,
        tipoReplica: cronoTipoReplica,
        categoria: cronoCategoria,
        modelo: cronoModelo.trim() || undefined,
        joules: joulesNum,
        fps: cronoFps ? parseInt(cronoFps, 10) : undefined,
        gramajeBb: cronoGramaje ? parseFloat(cronoGramaje) : undefined,
        aprobado: cronoAprobado,
        notas: cronoNotas.trim() || undefined,
      });
      mostrarAvisoTactico('CRONÓGRAFO OFICIAL', res.mensaje, 'exito', 'check-decagram');
      setModalCronoVisible(false);
      setCronoJoules('');
      setCronoFps('');
      setCronoModelo('');
      setCronoNotas('');
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR AL CRONAR', error.message || 'No se pudo registrar la medición', 'peligro', 'alert-circle');
    } finally {
      setGuardandoCrono(false);
    }
  };

  // Eliminar medición de crono
  const handleEliminarCrono = (cronoId: number) => {
    mostrarConfirmacionTactico(
      'ELIMINAR MEDICIÓN',
      '¿Deseas anular este registro de réplica cronada?',
      async () => {
        setModalTactico((prev) => ({ ...prev, visible: false }));
        try {
          await eliminarRegistroCronoApi(eventoId, cronoId);
          cargarDatos();
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo eliminar el crono', 'peligro', 'alert-circle');
        }
      },
      {
        tipo: 'peligro',
        icono: 'trash-can-outline',
        textoConfirmar: 'ELIMINAR',
        textoCancelar: 'CANCELAR',
      },
    );
  };

  // Misiones Tácticas (Fase 2)
  const abrirModalNuevaMision = (bandoIdDefault?: number | null) => {
    const bandos = detalle?.evento?.bandos || [];
    setMisionTitulo('');
    setMisionBandoId(bandoIdDefault ?? (bandos.length > 0 ? bandos[0].id : null));
    setMisionDescLider('');
    setMisionDescOperadores('');
    setMisionFotoUrl('');
    setModalMisionVisible(true);
  };

  const handleCrearMision = async () => {
    Keyboard.dismiss();
    if (!misionTitulo.trim()) {
      mostrarAvisoTactico('ATENCIÓN', 'Ingresa el nombre o título de la misión.', 'advertencia', 'pencil');
      return;
    }
    if (!misionBandoId) {
      mostrarAvisoTactico('ATENCIÓN', 'Selecciona la facción a la que se asignará la misión.', 'advertencia', 'shield-account');
      return;
    }
    if (!misionDescLider.trim()) {
      mostrarAvisoTactico('ATENCIÓN', 'Ingresa el briefing confidencial para el líder de facción.', 'advertencia', 'card-text');
      return;
    }
    if (!misionDescOperadores.trim()) {
      mostrarAvisoTactico('ATENCIÓN', 'Ingresa la orden de combate para los operadores comunes.', 'advertencia', 'bullhorn');
      return;
    }

    const bandoAsignado = detalle?.evento?.bandos?.find((b) => b.id === misionBandoId);
    const otroBando = detalle?.evento?.bandos?.find((b) => b.id !== misionBandoId);

    try {
      setGuardandoMision(true);
      await crearMisionApi(eventoId, {
        bandoId: misionBandoId,
        titulo: misionTitulo.trim(),
        descripcionLider: misionDescLider.trim(),
        descripcionOperadores: misionDescOperadores.trim(),
        fotoUrl: misionFotoUrl.trim() || undefined,
      });

      setModalMisionVisible(false);
      await cargarDatos();

      // Flujo de contra-misión para la otra facción
      if (otroBando) {
        mostrarConfirmacionTactico(
          'MISIÓN ASIGNADA',
          `Se ha transmitido la orden a "${bandoAsignado?.nombre || 'la facción'}".\n\n¿Deseas asignar la contra-misión para "${otroBando.nombre}"?`,
          () => {
            setModalTactico((prev) => ({ ...prev, visible: false }));
            setMisionBandoId(otroBando.id);
            setModalMisionVisible(true);
          },
          {
            tipo: 'primario',
            icono: 'target',
            textoConfirmar: 'ASIGNAR CONTRA-MISIÓN',
            textoCancelar: 'NO POR AHORA',
          },
        );
      } else {
        mostrarAvisoTactico('ORDEN TRANSMITIDA', `Misión "${misionTitulo.trim()}" transmitida con éxito.`, 'exito', 'target');
      }
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo crear la misión.', 'peligro', 'alert-circle');
    } finally {
      setGuardandoMision(false);
    }
  };

  const handleCambiarEstadoMision = async (misionId: number, nuevoEstado: string) => {
    try {
      await actualizarEstadoMisionApi(eventoId, misionId, nuevoEstado);
      cargarDatos();
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo actualizar el estado de la misión.', 'peligro', 'alert-circle');
    }
  };

  const handleEliminarMision = (misionId: number) => {
    mostrarConfirmacionTactico(
      'ELIMINAR MISIÓN',
      '¿Deseas anular esta orden de misión táctica?',
      async () => {
        setModalTactico((prev) => ({ ...prev, visible: false }));
        try {
          await eliminarMisionApi(eventoId, misionId);
          cargarDatos();
        } catch (error: any) {
          mostrarAvisoTactico('ERROR', error.message || 'No se pudo eliminar la misión.', 'peligro', 'alert-circle');
        }
      },
      {
        tipo: 'peligro',
        icono: 'trash-can-outline',
        textoConfirmar: 'ELIMINAR',
        textoCancelar: 'CANCELAR',
      },
    );
  };

  const handleSeleccionarFotoMisionGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        mostrarAvisoTactico(
          'PERMISO REQUERIDO',
          'Se necesita acceso a la galería para adjuntar la foto táctica de la misión.',
          'advertencia',
          'image-lock',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.65,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64Img = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setMisionFotoUrl(base64Img);
      }
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo cargar la imagen de la galería.', 'peligro', 'alert-circle');
    }
  };

  const handleTomarFotoMisionCamara = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        mostrarAvisoTactico(
          'PERMISO REQUERIDO',
          'Se necesita acceso a la cámara para capturar la foto táctica de la misión.',
          'advertencia',
          'camera-lock',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.65,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64Img = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setMisionFotoUrl(base64Img);
      }
    } catch (error: any) {
      mostrarAvisoTactico('ERROR', error.message || 'No se pudo tomar la foto con la cámara.', 'peligro', 'alert-circle');
    }
  };

  const handleQuitarFotoMision = () => {
    setMisionFotoUrl('');
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
  const esCreadorOrganizador = evento.organizadorId === jugador?.id;
  const esCoorganizador = evento.coorganizadores?.some((co) => co.jugadorId === jugador?.id);
  const soyOrganizador = esCreadorOrganizador || !!esCoorganizador;
  const esTerminadoOCancelado = evento.estado === 'FINALIZADO' || evento.estado === 'CANCELADO';
  const esPichanga = evento.tipo === 'PICHANGA';
  const esMasivo = evento.tipo === 'EVENTO_MASIVO';
  const miBandoLiderado = evento.bandos?.find((b) => b.liderId === jugador?.id);
  const soyLiderDeBando = !!miBandoLiderado;

  // Estados tácticos dinámicos para Evento Masivo
  const fasesOrdenadas = [...(evento.fases || [])].sort((a, b) => a.orden - b.orden);
  const faseActiva = fasesOrdenadas.find((f) => f.activa) || fasesOrdenadas[0];
  const ordenFaseActiva = faseActiva?.orden || 1;
  const esFase0 = esMasivo && ordenFaseActiva === 1;
  const esFaseTerreno = esMasivo && ordenFaseActiva > 1;
  const enFaseCrono = esMasivo && ordenFaseActiva > 1 && (faseActiva?.esFaseCrono === true || ordenFaseActiva === 2);
  const esPreMision = esMasivo && esFase0;
  const esCronoActivo = esMasivo && enFaseCrono && !esTerminadoOCancelado;
  const esFase3Debriefing = esMasivo && ordenFaseActiva >= 4;
  const esOperacionEnCurso = esMasivo && ordenFaseActiva >= 3 && !faseActiva?.esFaseCrono && !esTerminadoOCancelado;
  const siguienteFase = fasesOrdenadas.find((f) => f.orden > ordenFaseActiva);

  // Estado de homologación del operador actual
  const misReplicasCronadas = evento.registrosCrono?.filter((r) => r.jugadorId === jugador?.id) || [];
  const tieneCronoAprobado = misReplicasCronadas.some((r) => r.aprobado === true);

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

  // Si el evento está concluido, mostramos todo el historial. Si está en curso/programado, solo la partida activa/en curso/pendiente para evitar confusión.
  const partidasParaMostrar = (() => {
    if (evento.estado === 'FINALIZADO' || evento.estado === 'CANCELADO') {
      return partidas;
    }
    const partidaEnCurso = partidas.find((p) => p.estado === 'EN_CURSO');
    if (partidaEnCurso) return [partidaEnCurso];
    const partidaPendiente = partidas.find((p) => p.estado === 'PENDIENTE');
    if (partidaPendiente) return [partidaPendiente];
    if (partidas.length > 0) return [partidas[partidas.length - 1]];
    return [];
  })();

  // Cálculos para activación de recordatorios
  const fechaMs = evento.fechaInicio ? new Date(evento.fechaInicio).getTime() : 0;
  const ahoraMs = Date.now();
  const pasoDiaAntes = (fechaMs - 24 * 60 * 60 * 1000) <= ahoraMs;
  const paso30Min = (fechaMs - 30 * 60 * 1000) <= ahoraMs;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
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
            <Text style={styles.tituloEventoFinalizadoGlobal}>OPERACIÓN CONCLUIDA OFICIALMENTE</Text>
            <Text style={styles.subEventoFinalizadoGlobal}>
              Esta jornada táctica ha concluido. Resultados y estadísticas archivados.
            </Text>
          </View>
        </View>
      )}

      {/* Tarjeta de Resumen Principal (Oculta en fases operativas 1 y 2 para eventos masivos para no estorbar en terreno) */}
      {(!esMasivo || esFase0) && (
        <View style={styles.resumenCard}>
        <View style={styles.tipoRow}>
          <Text style={styles.tagTipo}>{evento.tipo.replace('_', ' ')}</Text>
          <View style={styles.tagsDerechaRow}>
            {miBando && evento.estado === 'PROGRAMADO' && (
              <View style={styles.badgeAlistadoHeader}>
                <MaterialCommunityIcons name="check-decagram" size={12} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.txtBadgeAlistadoHeader}>ALISTADO</Text>
              </View>
            )}
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
            {evento.coorganizadores && evento.coorganizadores.length > 0
              ? ` (+${evento.coorganizadores.length} co-org)`
              : ''}
          </Text>
        </View>

        {/* Estado de Inscripciones para Evento Masivo */}
        {esMasivo && (
          <View style={styles.badgeInscripcionesRow}>
            <View
              style={[
                styles.badgeInscripcionBox,
                evento.inscripcionesAbiertas !== false
                  ? styles.badgeInscripcionAbierta
                  : styles.badgeInscripcionCerrada,
              ]}
            >
              <MaterialCommunityIcons
                name={evento.inscripcionesAbiertas !== false ? 'account-check' : 'lock'}
                size={14}
                color={evento.inscripcionesAbiertas !== false ? colors.success : colors.warning}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.txtBadgeInscripcion,
                  { color: evento.inscripcionesAbiertas !== false ? colors.success : colors.warning },
                ]}
              >
                {evento.inscripcionesAbiertas !== false
                  ? 'INSCRIPCIONES DE FACCIÓN ABIERTAS'
                  : 'INSCRIPCIONES CERRADAS (ORGANIZACIÓN DE ESCUADRAS)'}
              </Text>
            </View>
          </View>
        )}

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

            {soyOrganizador && !esMasivo && (
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

        {/* Botón para bajarse de la operación antes de que inicie el evento (Solo Pichangas / Versus; en Milsim se bajan desde la facción) */}
        {!esMasivo && miBando && evento.estado === 'PROGRAMADO' && (
          <TouchableOpacity
            style={[styles.btnBajarseOperacion, desinscribiendose && styles.botonDeshabilitado]}
            onPress={handleBajarseOperacion}
            disabled={desinscribiendose}
            activeOpacity={0.8}
          >
            {desinscribiendose ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <MaterialCommunityIcons name="account-minus-outline" size={15} color={colors.danger} style={{ marginRight: 5 }} />
                <Text style={styles.txtBtnBajarseOperacion}>BAJARSE DE LA OPERACIÓN</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      )}

      {/* ======================================================== */}
      {/* VISTA A: TERRENO LIBRE / GPS (Para Pichangas / Versus)     */}
      {/* ======================================================== */}
      {!esMasivo && evento.latitud && evento.longitud ? (
        <View style={styles.terrenoGpsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.terrenoGpsTitulo}>COORDENADAS GPS DEL TERRENO</Text>
          </View>
          <Text style={styles.terrenoGpsCoords}>
            {evento.latitud.toFixed(6)}, {evento.longitud.toFixed(6)}
          </Text>
          {evento.direccionTexto ? (
            <Text style={styles.terrenoGpsDir}>{evento.direccionTexto}</Text>
          ) : null}
          <View style={styles.terrenoGpsBtnRow}>
            <TouchableOpacity
              style={styles.btnGpsApp}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${evento.latitud},${evento.longitud}`;
                Linking.openURL(url);
              }}
            >
              <MaterialCommunityIcons name="google-maps" size={16} color="#fff" />
              <Text style={styles.txtBtnGpsApp}>GOOGLE MAPS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnGpsApp, { backgroundColor: '#33CCFF' }]}
              onPress={() => {
                const url = `https://waze.com/ul?ll=${evento.latitud},${evento.longitud}&navigate=yes`;
                Linking.openURL(url);
              }}
            >
              <MaterialCommunityIcons name="waze" size={16} color="#000" />
              <Text style={[styles.txtBtnGpsApp, { color: '#000' }]}>WAZE</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* ======================================================== */}
      {/* EVENTO MASIVO: VISTAS TÁCTICAS DINÁMICAS                  */}
      {/* ======================================================== */}

      {/* -------------------------------------------------------- */}
      {/* 1. VISTA PREVIA (PRE-MISIÓN): PROGRAMADO & NO EN CRONO   */}
      {/* -------------------------------------------------------- */}
      {esPreMision && (
        <View style={styles.preMisionCard}>
          <View style={styles.preMisionHeader}>
            <View style={styles.preMisionTituloRow}>
              <MaterialCommunityIcons name="shield-search" size={20} color={colors.primary} />
              <Text style={styles.preMisionTitulo}>PRE-MISIÓN: ALISTAMIENTO TÁCTICO</Text>
            </View>
            <View style={styles.badgePresetTacsop}>
              <Text style={styles.txtBadgePresetTacsop}>{evento.tacsop?.presetTipo || 'ESTÁNDAR'}</Text>
            </View>
          </View>

          {/* Cómo llegar al terreno (Google Maps & Waze) */}
          {evento.latitud && evento.longitud ? (
            <View style={styles.preMisionSubseccion}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <MaterialCommunityIcons name="crosshairs-gps" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.preMisionSubseccionTitulo}>CÓMO LLEGAR A LA ZONA DE OPERACIÓN</Text>
              </View>
              <Text style={styles.terrenoGpsCoords}>
                {evento.latitud.toFixed(6)}, {evento.longitud.toFixed(6)}
              </Text>
              {evento.direccionTexto ? (
                <Text style={styles.terrenoGpsDir}>{evento.direccionTexto}</Text>
              ) : null}
              <View style={styles.terrenoGpsBtnRow}>
                <TouchableOpacity
                  style={styles.btnGpsApp}
                  onPress={() => {
                    const url = `https://www.google.com/maps/search/?api=1&query=${evento.latitud},${evento.longitud}`;
                    Linking.openURL(url);
                  }}
                >
                  <MaterialCommunityIcons name="google-maps" size={16} color="#fff" />
                  <Text style={styles.txtBtnGpsApp}>GOOGLE MAPS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnGpsApp, { backgroundColor: '#33CCFF' }]}
                  onPress={() => {
                    const url = `https://waze.com/ul?ll=${evento.latitud},${evento.longitud}&navigate=yes`;
                    Linking.openURL(url);
                  }}
                >
                  <MaterialCommunityIcons name="waze" size={16} color="#000" />
                  <Text style={[styles.txtBtnGpsApp, { color: '#000' }]}>WAZE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Tabla de Límites de Cronógrafo para Alistar Réplicas */}
          <View style={styles.preMisionSubseccion}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MaterialCommunityIcons name="speedometer" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.preMisionSubseccionTitulo}>LÍMITES DE CRONÓGRAFO (ALISTAR EN CASA)</Text>
            </View>
            <View style={styles.cronoTablaPreMision}>
              <View style={styles.cronoTablaFilaHeader}>
                <Text style={[styles.cronoTablaColHeader, { flex: 1.2 }]}>CATEGORÍA</Text>
                <Text style={[styles.cronoTablaColHeader, { flex: 1 }]}>MAX J</Text>
                <Text style={[styles.cronoTablaColHeader, { flex: 1 }]}>~FPS</Text>
                <Text style={[styles.cronoTablaColHeader, { flex: 1 }]}>MED</Text>
              </View>
              {(evento.tacsop?.limitesCrono || [
                { categoria: 'PISTOLA', maxJoules: 1.0, maxFps: 328, medMetros: 0 },
                { categoria: 'ASALTO', maxJoules: 1.49, maxFps: 400, medMetros: 5 },
                { categoria: 'SOPORTE', maxJoules: 1.6, maxFps: 415, medMetros: 15 },
                { categoria: 'DMR', maxJoules: 1.88, maxFps: 450, medMetros: 20 },
                { categoria: 'SNIPER', maxJoules: 2.81, maxFps: 550, medMetros: 30 },
              ]).map((lim) => (
                <View key={lim.categoria} style={styles.cronoTablaFila}>
                  <Text style={[styles.cronoTablaCol, { flex: 1.2, fontWeight: '800' }]}>{lim.categoria}</Text>
                  <Text style={[styles.cronoTablaCol, { flex: 1, color: colors.primary }]}>{lim.maxJoules} J</Text>
                  <Text style={[styles.cronoTablaCol, { flex: 1 }]}>{lim.maxFps ? `${lim.maxFps}` : '-'}</Text>
                  <Text style={[styles.cronoTablaCol, { flex: 1, color: colors.warning }]}>{lim.medMetros}m</Text>
                </View>
              ))}
            </View>
            <Text style={styles.txtAvisoPreMisionCrono}>
              * Verifica tus réplicas antes de salir. Toda réplica que sobrepase el límite será rechazada en terreno.
            </Text>
          </View>

          {/* Resumen Clave TACSOP */}
          <View style={styles.preMisionSubseccion}>
            <Text style={styles.preMisionSubseccionTitulo}>REGLAS OPERATIVAS DESTACADAS</Text>
            <View style={styles.chipsReglasGrid}>
              <View style={styles.chipRegla}>
                <MaterialCommunityIcons name="heart-pulse" size={14} color={colors.danger} />
                <Text style={styles.txtChipRegla}>{evento.tacsop?.vidasMax ?? 2} Vidas</Text>
              </View>
              <View style={styles.chipRegla}>
                <MaterialCommunityIcons name="bandage" size={14} color={colors.primary} />
                <Text style={styles.txtChipRegla}>
                  {evento.tacsop?.requiereTorniquete ? `Torniquete (${evento.tacsop?.torniquetesPorJugador ?? 1})` : 'Sin torniquete'}
                </Text>
              </View>
              <View style={styles.chipRegla}>
                <MaterialCommunityIcons name="flag" size={14} color={colors.danger} />
                <Text style={styles.txtChipRegla}>Pañuelo Rojo Oblig.</Text>
              </View>
              <View style={styles.chipRegla}>
                <MaterialCommunityIcons name="lightbulb-on" size={14} color={colors.warning} />
                <Text style={styles.txtChipRegla}>Luz: {evento.tacsop?.luzRojaNocturna || 'RECOMENDADA'}</Text>
              </View>
              <View style={styles.chipRegla}>
                <MaterialCommunityIcons name="ammunition" size={14} color={colors.secondary} />
                <Text style={styles.txtChipRegla}>Mags: {evento.tacsop?.tipoCargadores || 'LIBRE'}</Text>
              </View>
            </View>
          </View>

          {/* Accesos a Modales */}
          <View style={styles.accesosTacsopRow}>
            <TouchableOpacity
              style={styles.btnAccesoTacsop}
              onPress={() => setModalTacsopVisible(true)}
            >
              <MaterialCommunityIcons name="book-open-variant" size={18} color={colors.primary} />
              <Text style={styles.txtBtnAccesoTacsop}>VER FICHA TACSOP COMPLETA</Text>
            </TouchableOpacity>
            {evento.mapaTacticoUrl ? (
              <TouchableOpacity
                style={styles.btnAccesoTacsop}
                onPress={() => setModalMapaVisible(true)}
              >
                <MaterialCommunityIcons name="map-legend" size={18} color={colors.primary} />
                <Text style={styles.txtBtnAccesoTacsop}>MAPA TÁCTICO</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* -------------------------------------------------------- */}
      {/* 2. VISTA DE FASE DE CRONO (EN TERRENO): Modularizado     */}
      {/* -------------------------------------------------------- */}
      {esCronoActivo && (soyOrganizador || !!miBando) && (
        <MesaCronometrajeFase1
          evento={evento}
          jugadores={jugadores}
          soyOrganizador={soyOrganizador}
          jugadorId={jugador?.id}
          filtroCronoStaff={filtroCronoStaff}
          setFiltroCronoStaff={setFiltroCronoStaff}
          fpsInputsStaff={fpsInputsStaff}
          setFpsInputsStaff={setFpsInputsStaff}
          guardandoCronoRapidoId={guardandoCronoRapidoId}
          onAbrirModalCrono={(jugId) => {
            setCronoJugadorId(jugId ?? null);
            setModalCronoVisible(true);
          }}
          onAprobarCronoRapido={handleAprobarCronoRapido}
          onEliminarCrono={handleEliminarCrono}
          onAbrirTablaLimites={() => setModalSoloCronoVisible(true)}
          onAbrirMapaTactico={() => setModalMapaVisible(true)}
        />
      )}

      {/* -------------------------------------------------------- */}
      {/* 3. VISTA EN OPERACIÓN (COMBATE ACTIVO): esOperacionEnCurso  */}
      {/* -------------------------------------------------------- */}
      {esOperacionEnCurso && (
        <View style={styles.hudTacticoContainer}>
          {/* Tarjeta de Radio Baofeng UV-5R del Operador */}
          <View style={styles.baofengHudCard}>
            <View style={styles.baofengHeaderRow}>
              <MaterialCommunityIcons name="radio-handheld" size={20} color={colors.primary} />
              <Text style={styles.baofengTitulo}>TU RADIO BAOFENG UV-5R ASIGNADA</Text>
            </View>

            <View style={styles.baofengCanalesRow}>
              <View style={styles.baofengCanalBox}>
                <Text style={styles.baofengCanalEtiqueta}>CANAL FACCIÓN:</Text>
                <Text style={styles.baofengCanalFrec}>
                  {miBando?.bandoId
                    ? evento.bandos?.find((b) => b.id === miBando.bandoId)?.frecuenciaRadio || '462.6125 MHz'
                    : 'Sin facción'}
                </Text>
                <Text style={styles.baofengCanalSubtono}>
                  CTCSS: {miBando?.bandoId
                    ? evento.bandos?.find((b) => b.id === miBando.bandoId)?.subtonoRadio || '67.0 Hz'
                    : '-'}
                </Text>
              </View>

              {miBando?.escuadraId ? (
                <View style={styles.baofengCanalBox}>
                  <Text style={styles.baofengCanalEtiqueta}>CANAL ESCUADRA:</Text>
                  <Text style={styles.baofengCanalFrec}>
                    {miBando.escuadraNombre || 'Escuadra'}
                  </Text>
                  <Text style={styles.baofengCanalSubtono}>Intercom interna</Text>
                </View>
              ) : (
                <View style={[styles.baofengCanalBox, { opacity: 0.7 }]}>
                  <Text style={styles.baofengCanalEtiqueta}>EMERGENCIA:</Text>
                  <Text style={[styles.baofengCanalFrec, { color: colors.danger }]}>
                    {evento.tacsop?.frecuenciaEmergencia || '462.5625 MHz'}
                  </Text>
                  <Text style={styles.baofengCanalSubtono}>Canal Blind Man</Text>
                </View>
              )}
            </View>
          </View>

          {/* ======================================================== */}
          {/* MISIONES TÁCTICAS DE COMBATE (FASE 2)                     */}
          {/* ======================================================== */}

          {/* ======================================================== */}
          {/* MISIONES TÁCTICAS DE COMBATE (FASE 2): Modularizado       */}
          {/* ======================================================== */}
          <MisionesCombateFase2
            evento={evento}
            soyOrganizador={soyOrganizador}
            soyLiderDeBando={soyLiderDeBando}
            miBando={miBando}
            esFase3Debriefing={esFase3Debriefing}
            onAbrirModalNuevaMision={() => abrirModalNuevaMision()}
            onCambiarEstadoMision={handleCambiarEstadoMision}
            onEliminarMision={handleEliminarMision}
            onAbrirFotoMision={(url) => {
              setFotoMisionSeleccionada(url);
              setModalFotoMisionVisible(true);
            }}
          />

          {/* Accesos rápidos de combate: Mapa Táctico & TACSOP */}
          <View style={styles.accesosTacsopRow}>
            {evento.mapaTacticoUrl ? (
              <TouchableOpacity
                style={[styles.btnAccesoTacsop, { backgroundColor: '#1e2c21', borderColor: colors.primary }]}
                onPress={() => setModalMapaVisible(true)}
              >
                <MaterialCommunityIcons name="map-legend" size={18} color={colors.primary} />
                <Text style={[styles.txtBtnAccesoTacsop, { fontWeight: '900' }]}>MAPA TÁCTICO</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.btnAccesoTacsop}
              onPress={() => setModalTacsopVisible(true)}
            >
              <MaterialCommunityIcons name="book-open-variant" size={18} color={colors.primary} />
              <Text style={styles.txtBtnAccesoTacsop}>CONSULTAR TACSOP</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* -------------------------------------------------------- */}
      {/* 4. EVENTO FINALIZADO O ARCHIVADO: RESUMEN DE LA JORNADA  */}
      {/* -------------------------------------------------------- */}
      {esMasivo && esTerminadoOCancelado && (
        <View style={styles.cronoSeccionCard}>
          <View style={styles.cronoSeccionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="shield-check" size={18} color={colors.primary} />
              <Text style={styles.txtCronoSeccionTitulo}>REGISTROS Y HOMOLOGACIONES DE LA OPERACIÓN</Text>
            </View>
          </View>
          <View style={styles.accesosTacsopRow}>
            <TouchableOpacity style={styles.btnAccesoTacsop} onPress={() => setModalTacsopVisible(true)}>
              <MaterialCommunityIcons name="book-open-variant" size={18} color={colors.primary} />
              <Text style={styles.txtBtnAccesoTacsop}>CONSULTAR TACSOP</Text>
            </TouchableOpacity>
            {evento.mapaTacticoUrl ? (
              <TouchableOpacity style={styles.btnAccesoTacsop} onPress={() => setModalMapaVisible(true)}>
                <MaterialCommunityIcons name="map-legend" size={18} color={colors.primary} />
                <Text style={styles.txtBtnAccesoTacsop}>MAPA TÁCTICO</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* RECORDATORIOS TÁCTICOS DE LA PARTIDA (Solo Pichangas / Versus; en Masivo/Milsim se gestionan al alistarse) */}
      {evento.estado === 'PROGRAMADO' && !esMasivo && (
        <View style={styles.cardRecordatorios}>
          <View style={styles.recordatoriosHeader}>
            <MaterialCommunityIcons name="bell-ring-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.recordatoriosTitulo}>RECORDATORIOS DE LA OPERACIÓN</Text>
          </View>
          <Text style={styles.recordatoriosDesc}>
            Activa alertas automáticas en tu teléfono para no perder el despliegue ni olvidar tus réplicas.
          </Text>

          {/* Opción 1: Día anterior (24 horas antes) */}
          <View style={styles.filaSwitchRecordatorio}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.txtTituloSwitchRecordatorio}>Día anterior (24 horas antes)</Text>
              <Text style={styles.txtSubSwitchRecordatorio}>
                {pasoDiaAntes
                  ? 'Plazo expirado para esta partida'
                  : 'Aviso táctico 24 hrs antes para alistar réplicas'}
              </Text>
            </View>
            <Switch
              value={recordatorios.diaAntes}
              onValueChange={handleToggleDiaAntes}
              disabled={pasoDiaAntes || cargandoRecordatorio}
              trackColor={{ false: colors.inputBg, true: colors.primary }}
              thumbColor={recordatorios.diaAntes ? '#fff' : colors.textMuted}
            />
          </View>

          {/* Opción 2: 30 minutos antes */}
          <View style={[styles.filaSwitchRecordatorio, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.txtTituloSwitchRecordatorio}>30 minutos antes</Text>
              <Text style={styles.txtSubSwitchRecordatorio}>
                {paso30Min
                  ? 'Faltan menos de 30 minutos'
                  : 'Aviso media hora antes del inicio de partida'}
              </Text>
            </View>
            <Switch
              value={recordatorios.min30}
              onValueChange={handleToggle30Min}
              disabled={paso30Min || cargandoRecordatorio}
              trackColor={{ false: colors.inputBg, true: colors.primary }}
              thumbColor={recordatorios.min30 ? '#fff' : colors.textMuted}
            />
          </View>

          {/* Advertencia si tiene todas las notificaciones apagadas en Ajustes */}
          {jugador?.recibeNotificaciones === false && (
            <View style={styles.avisoNotifDesactivadasGlobal}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color={colors.warning} style={{ marginRight: 6 }} />
              <Text style={styles.txtAvisoNotifDesactivadasGlobal}>
                Tienes desactivadas las notificaciones en Ajustes. Actívalas para que tu teléfono pueda sonar.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Briefing de la Misión / Descripción */}
      {evento.descripcion ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>BRIEFING & REGLAS DE COMBATE</Text>
          <View style={styles.briefingCard}>
            <Text style={styles.briefingTexto}>{evento.descripcion}</Text>
          </View>
        </View>
      ) : null}

      {/* PANEL EXCLUSIVO DEL ORGANIZADOR (DESPLEGABLE) */}
      {soyOrganizador && (
        <View style={styles.panelOrganizadorCard}>
          <TouchableOpacity
            style={styles.panelOrganizadorHeaderTouch}
            onPress={() => setPanelOrganizadorAbierto((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.panelOrganizadorHeaderLeft}>
              <MaterialCommunityIcons name="shield-crown" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.panelOrganizadorTitulo}>PANEL DEL ORGANIZADOR</Text>
                <Text style={styles.panelOrganizadorSubtitulo}>Comandancia & Control de Operación</Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name={panelOrganizadorAbierto ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>

          {panelOrganizadorAbierto && (
            <>
              <Text style={styles.panelOrganizadorDesc}>
                Tienes privilegios de comandante para gestionar parámetros, modificar fases y la configuración táctica del combate.
              </Text>

              <View style={styles.panelOrganizadorBotones}>
                {!esTerminadoOCancelado ? (
                  <>
                    {/* Control de Inscripciones: Solo si están abiertas se muestra el botón principal para cerrarlas */}
                    {esMasivo && evento.inscripcionesAbiertas !== false && (
                      <TouchableOpacity
                        style={[
                          styles.btnToggleInscripciones,
                          cambiandoInscripciones && styles.botonDeshabilitado,
                        ]}
                        onPress={handleToggleInscripciones}
                        disabled={cambiandoInscripciones}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons
                          name="lock"
                          size={16}
                          color="#fff"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.txtBtnToggleInscripciones}>
                          CERRAR INSCRIPCIONES (HABILITAR ESCUADRAS)
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Sección de Co-organizadores de la Operación */}
                    {esCreadorOrganizador && (
                      <View style={styles.coorganizadoresBox}>
                        <View style={styles.coorganizadoresHeader}>
                          <MaterialCommunityIcons name="account-multiple-plus" size={16} color={colors.primary} style={{ marginRight: 5 }} />
                          <Text style={styles.txtCoorganizadoresTitulo}>CO-ORGANIZADORES DE LA OPERACIÓN</Text>
                        </View>
                        {evento.coorganizadores && evento.coorganizadores.length > 0 ? (
                          <View style={styles.listaCoorganizadores}>
                            {evento.coorganizadores.map((co) => (
                              <View key={co.jugadorId} style={styles.chipCoorganizador}>
                                <MaterialCommunityIcons name="medal" size={13} color={colors.warning} style={{ marginRight: 4 }} />
                                <Text style={styles.txtChipCoorganizador}>{co.alias || `Op #${co.jugadorId}`}</Text>
                                <TouchableOpacity
                                  onPress={() => handleRemoverCoorganizador(co.jugadorId, co.alias || 'Operador')}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                  activeOpacity={0.7}
                                >
                                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.danger} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.txtSinCoorganizadores}>No hay co-organizadores nombrados aún.</Text>
                        )}
                        <TouchableOpacity
                          style={styles.btnAgregarCoorganizador}
                          onPress={() => setModalCoorganizadorVisible(true)}
                        >
                          <MaterialCommunityIcons name="plus" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.txtBtnAgregarCoorganizador}>NOMBRAR CO-ORGANIZADOR</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Botón Iniciar Evento / Partida con Modalidad (solo para pichangas/versus, no masivos) */}
                    {!esMasivo && (
                      <>
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
                      </>
                    )}

                    {/* CRONOGRAMA DE FASES EN EL PANEL DEL ORGANIZADOR (Con borde verde cuando están activas) */}
                    {esMasivo && evento.fases && evento.fases.length > 0 && (
                      <View style={styles.seccionFasesOrganizador}>
                        <View style={styles.seccionFasesOrganizadorHeader}>
                          <MaterialCommunityIcons name="clock-fast" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.txtFasesOrganizadorTitulo}>CRONOGRAMA DE FASES (ORGANIZACIÓN)</Text>
                        </View>

                        <View style={styles.listaFasesRow}>
                          {fasesOrdenadas.map((fase) => {
                            const esEstaFaseActiva = fase.activa;
                            return (
                              <View
                                key={fase.id}
                                style={[
                                  styles.itemFaseBox,
                                  esEstaFaseActiva && styles.itemFaseBoxActivaVerde,
                                ]}
                              >
                                <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={[styles.txtFaseNombre, esEstaFaseActiva && styles.txtFaseNombreActivaVerde]}>
                                    {fase.nombre}
                                  </Text>
                                  {esEstaFaseActiva && (
                                    <View style={styles.badgeFaseActivaVerde}>
                                      <Text style={styles.txtBadgeFaseActivaVerde}>ACTIVA</Text>
                                    </View>
                                  )}
                                  {fase.esFaseCrono && (
                                    <View style={styles.badgeFaseCrono}>
                                      <Text style={styles.txtBadgeFaseCrono}>CRONO</Text>
                                    </View>
                                  )}
                                </View>
                                {fase.descripcion ? <Text style={styles.txtFaseDesc}>{fase.descripcion}</Text> : null}
                              </View>

                              {!esEstaFaseActiva && !esTerminadoOCancelado && (
                                <TouchableOpacity
                                  style={styles.btnActivarFase}
                                  onPress={() => handleActivarFase(fase.id)}
                                  disabled={cambiandoFase}
                                >
                                  <Text style={styles.txtBtnActivarFase}>ACTIVAR FASE</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* DESPLEGABLE: ABRIR CONFIGURACIÓN DE EVENTO (Modificar, Cancelar, Finalizar y Reabrir Inscripciones) */}
                  <View style={styles.seccionConfiguracionDesplegable}>
                    <TouchableOpacity
                      style={styles.btnAbrirConfiguracion}
                      onPress={() => setDesplegableConfigVisible((prev) => !prev)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="cog-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.txtBtnAbrirConfiguracion}>CONFIGURACIÓN DEL EVENTO</Text>
                      </View>
                      <MaterialCommunityIcons
                        name={desplegableConfigVisible ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>

                    {desplegableConfigVisible && (
                      <View style={styles.boxContenidoConfiguracion}>
                        {/* Reabrir inscripciones: solo visible aquí dentro cuando están cerradas */}
                        {esMasivo && evento.inscripcionesAbiertas === false && (
                          <TouchableOpacity
                            style={[styles.btnReabrirInscripcionesConfig, cambiandoInscripciones && styles.botonDeshabilitado]}
                            onPress={handleToggleInscripciones}
                            disabled={cambiandoInscripciones}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="lock-open-variant" size={15} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.txtBtnReabrirInscripcionesConfig}>REABRIR INSCRIPCIONES DE LA OPERACIÓN</Text>
                          </TouchableOpacity>
                        )}

                        {/* Modificar Evento / TACSOP */}
                        <TouchableOpacity
                          style={styles.btnModificarEventoConfig}
                          onPress={abrirModalEditar}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.txtBtnModificarEventoConfig}>
                            {esMasivo ? 'MODIFICAR OPERACIÓN & TACSOP' : 'MODIFICAR EVENTO'}
                          </Text>
                        </TouchableOpacity>

                        {/* Finalizar Evento */}
                        <TouchableOpacity
                          style={[styles.btnFinalizarEventoConfig, finalizandoEvento && styles.botonDeshabilitado]}
                          onPress={handleFinalizarEvento}
                          disabled={finalizandoEvento}
                          activeOpacity={0.8}
                        >
                          {finalizandoEvento ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <MaterialCommunityIcons name="flag-checkered" size={16} color="#fff" style={{ marginRight: 6 }} />
                              <Text style={styles.txtBtnFinalizarEventoConfig}>FINALIZAR EVENTO OFICIALMENTE</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        {/* Cancelar Evento */}
                        <TouchableOpacity
                          style={styles.btnCancelarEventoConfig}
                          onPress={() => setModalCancelarVisible(true)}
                          disabled={cancelandoEvento}
                          activeOpacity={0.8}
                        >
                          {cancelandoEvento ? (
                            <ActivityIndicator color={colors.danger} size="small" />
                          ) : (
                            <>
                              <MaterialCommunityIcons name="close-octagon-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                              <Text style={styles.txtBtnCancelarEventoConfig}>CANCELAR EVENTO</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
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
                      {evento.estado === 'CANCELADO' ? 'OPERACIÓN CANCELADA' : 'JORNADA CONCLUIDA'}
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
          </>
        )}
      </View>
    )}

      {/* PANEL DE LÍDER DE FACCIÓN (Si no es el organizador pero comanda un bando) */}
      {soyLiderDeBando && !soyOrganizador && (
        <View style={styles.panelLiderFaccionCard}>
          <View style={styles.panelOrganizadorHeader}>
            <MaterialCommunityIcons name="shield-star" size={20} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.tituloPanelLiderFaccion}>
              COMANDANCIA DE FACCIÓN: {miBandoLiderado?.nombre.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.descPanelLiderFaccion}>
            Fuiste designado comandante oficial de esta facción. Tienes acceso táctico para habilitar escuadras y organizar a tus operadores en terreno.
          </Text>
        </View>
      )}

      {/* Partidas y WebSockets en vivo (Solo para Pichangas / Versus) */}
      {!esMasivo && (
        <View style={styles.seccion}>
        <View style={styles.seccionHeaderPartidas}>
          <Text style={styles.seccionTitulo}>PARTIDAS Y COMBATE</Text>
          {soyOrganizador && !esTerminadoOCancelado && !esMasivo && (
            <TouchableOpacity
              style={styles.btnNuevaPartidaMini}
              onPress={() => setModalIniciarPartidaVisible(true)}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.txtNuevaPartidaMini}>NUEVA PARTIDA</Text>
            </TouchableOpacity>
          )}
        </View>

        {partidasParaMostrar.length === 0 ? (
          <View style={styles.sinPartidasCard}>
            <Text style={styles.textoSinPartidas}>
              {evento.estado === 'PROGRAMADO'
                ? 'Aún no se ha dado inicio a la primera partida de esta operación.'
                : 'No hay partidas registradas.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Aviso informativo en pichangas/versus en curso */}
            {!esTerminadoOCancelado && partidas.length > 1 && (
              <View style={styles.avisoHistorialEnCurso}>
                <MaterialCommunityIcons name="information" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.txtAvisoHistorialEnCurso}>
                  Mostrando la partida activa en combate. El historial completo estará disponible al finalizar el evento.
                </Text>
              </View>
            )}

            {partidasParaMostrar.map((p) => {
              const esFinalizada = p.estado === 'FINALIZADA';
              const esEnCurso = p.estado === 'EN_CURSO';
              const esPendiente = p.estado === 'PENDIENTE';

              const bando1 = evento.bandos?.[0];
              const bando2 = evento.bandos?.[1];
              const pts1 = p.marcador && bando1 ? p.marcador[bando1.id] || 0 : 0;
              const pts2 = p.marcador && bando2 ? p.marcador[bando2.id] || 0 : 0;
              const tieneMarcador = p.marcador && (pts1 > 0 || pts2 > 0 || (p.rondas && p.rondas.length > 0));

              // Plazo de 48 horas (2 días) para MVP
              const fechaFinPartida = p.finalizadaAt
                ? new Date(p.finalizadaAt).getTime()
                : (p.rondas && p.rondas.length > 0 && p.rondas[0]?.fechaRegistro
                  ? new Date(p.rondas[0].fechaRegistro).getTime()
                  : null);
              const plazoMvpExpirado =
                esFinalizada &&
                fechaFinPartida !== null &&
                Date.now() - fechaFinPartida > 2 * 24 * 60 * 60 * 1000;

              const miJugadorEnPartida = p.jugadores?.some((j) => j.jugadorId === jugador?.id);

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

                  {/* Historial de alineación y MVPs en esta partida */}
                  {p.jugadores && p.jugadores.length > 0 && (
                    <View style={styles.cardPartidaAlineacionBox}>
                      <View style={styles.cardPartidaAlineacionHeader}>
                        <MaterialCommunityIcons name="account-group" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.txtCardPartidaAlineacionHeader}>
                          ESCUADRAS DE ESTA PARTIDA ({p.jugadores.length} OP.)
                        </Text>
                      </View>

                      <View style={styles.cardPartidaAlineacionRow}>
                        <View style={styles.cardPartidaBandoCol}>
                          <Text style={[styles.txtCardPartidaBandoNombre, { color: bando1?.colorHex || colors.accent }]}>
                            {bando1?.nombre || 'BANDO 1'}
                          </Text>
                          {p.jugadores.filter((j) => j.bandoId === bando1?.id).map((j) => (
                            <Text
                              key={j.jugadorId}
                              style={[styles.txtCardPartidaJugador, { color: obtenerEstiloFama(j.fama).colorTexto }]}
                              numberOfLines={1}
                            >
                              • {j.alias} <Text style={styles.txtCardPartidaRol}>[{j.rol || 'ASALTO'}]</Text>
                            </Text>
                          ))}
                          {p.mvps?.filter((m) => m.bandoId === bando1?.id).map((m) => (
                            <View key={m.jugadorId} style={styles.cardPartidaMvpPill}>
                              <MaterialCommunityIcons name="star" size={10} color="#F59E0B" />
                              <Text style={styles.txtCardPartidaMvpPill} numberOfLines={1}>
                                MVP: {m.alias} ({m.votos}v)
                              </Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.cardPartidaAlineacionDiv} />

                        <View style={styles.cardPartidaBandoCol}>
                          <Text style={[styles.txtCardPartidaBandoNombre, { color: bando2?.colorHex || colors.blueTeam }]}>
                            {bando2?.nombre || 'BANDO 2'}
                          </Text>
                          {p.jugadores.filter((j) => j.bandoId === bando2?.id).map((j) => (
                            <Text
                              key={j.jugadorId}
                              style={[styles.txtCardPartidaJugador, { color: obtenerEstiloFama(j.fama).colorTexto }]}
                              numberOfLines={1}
                            >
                              • {j.alias} <Text style={styles.txtCardPartidaRol}>[{j.rol || 'ASALTO'}]</Text>
                            </Text>
                          ))}
                          {p.mvps?.filter((m) => m.bandoId === bando2?.id).map((m) => (
                            <View key={m.jugadorId} style={styles.cardPartidaMvpPill}>
                              <MaterialCommunityIcons name="star" size={10} color="#F59E0B" />
                              <Text style={styles.txtCardPartidaMvpPill} numberOfLines={1}>
                                MVP: {m.alias} ({m.votos}v)
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Estado de votación de MVP (límite de 2 días) */}
                  {esFinalizada && (
                    <View style={styles.badgeEstadoVotacionMvp}>
                      <MaterialCommunityIcons
                        name={plazoMvpExpirado ? 'clock-alert-outline' : 'trophy-award'}
                        size={11}
                        color={plazoMvpExpirado ? colors.textMuted : '#F59E0B'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.txtEstadoVotacionMvp, plazoMvpExpirado && { color: colors.textMuted }]}>
                        {plazoMvpExpirado
                          ? 'Votación de MVP cerrada (Límite 48 hrs expirado)'
                          : 'Votación de MVP abierta (Límite 48 hrs)'}
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
                            : miJugadorEnPartida
                            ? 'play-circle'
                            : 'account-plus'
                        }
                        size={14}
                        color={
                          esFinalizada
                            ? '#F59E0B'
                            : miJugadorEnPartida
                            ? colors.primary
                            : colors.success
                        }
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.textoEnVivo,
                          esFinalizada && { color: '#F59E0B' },
                          !esFinalizada && miJugadorEnPartida && { color: colors.primary },
                          !esFinalizada && !miJugadorEnPartida && { color: colors.success },
                        ]}
                      >
                        {esFinalizada
                          ? 'VER RESULTADO'
                          : miJugadorEnPartida
                          ? 'EN COMBATE (VER EN VIVO)'
                          : 'UNIRSE A PARTIDA'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
      )}

      {/* Sección de Bandos / Facciones */}
      {esPichanga && evento.estado === 'FINALIZADO' ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>HISTORIAL DE BANDOS TÁCTICOS</Text>
          <View style={styles.briefingCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>
                ALINEACIONES POR PARTIDA REGISTRADAS
              </Text>
            </View>
            <Text style={styles.briefingTexto}>
              En modalidad Pichanga los bandos fueron rotando y balanceándose en cada combate. Las alineaciones completas y los MVPs oficiales de cada escuadra se encuentran desplegados en el detalle de cada partida arriba.
            </Text>
          </View>
        </View>
      ) : esPichanga && partidas.length === 0 ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>OPERADORES INSCRITOS ({jugadores.length})</Text>
          <View style={styles.pichangaInscritosCard}>
            <Text style={styles.pichangaAvisoTexto}>
              Modalidad Pichanga: En esta fase previa todos los operadores se registran sin bando fijo. Una vez iniciada la primera partida por el comandante, se desplegarán los bandos tácticos y podrás elegir o cambiarte de bando libremente.
            </Text>

            <View style={styles.jugadoresList}>
              {jugadores.length === 0 ? (
                <Text style={styles.sinOperadores}>Aún no hay operadores inscritos en esta pichanga.</Text>
              ) : (
                jugadores.map((j) => (
                  <View key={j.jugadorId} style={styles.jugadorInscritoRow}>
                    <Text style={[styles.jugadorItem, { color: obtenerEstiloFama(j.fama).colorTexto }]}>
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
                    <Text style={styles.txtAlistarsePichangaMini}>ALISTARME A LA PICHANGA</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.seccion}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.seccionTitulo}>
              {esMasivo
                ? miBando && !soyOrganizador
                ? 'TU FACCIÓN TÁCTICA (ORBAT)'
                : 'FACCIONES TÁCTICAS DEL COMBATE (ORBAT)'
                : 'BANDOS DE COMBATE'}
            </Text>
            {esPichanga && !esTerminadoOCancelado && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="swap-horizontal" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                  Rebalanceo / Revueltas activo
                </Text>
              </View>
            )}
          </View>

          {/* Botón Principal de Alistamiento Milsim para Operador No Inscrito */}
          {esMasivo && !miBando && !esTerminadoOCancelado && evento.inscripcionesAbiertas !== false && (
            <TouchableOpacity
              style={styles.btnAlistamientoMilsimPrincipal}
              onPress={() => iniciarAlistamientoMilsim(null)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="shield-account" size={24} color="#000" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.txtBtnAlistamientoMilsimPrincipal}>INSCRIBIRSE A LA OPERACIÓN</Text>
                <Text style={styles.txtSubBtnAlistamientoMilsimPrincipal}>
                  Reglamento TACSOP, réplicas y elección de facción
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#000" />
            </TouchableOpacity>
          )}

          {(esMasivo && !soyOrganizador && miBando?.bandoId
            ? (evento.bandos || []).filter((b) => b.id === miBando.bandoId)
            : (evento.bandos || [])
          ).map((bando) => {
            const jugadoresDelBando = jugadores.filter((j) => j.bandoId === bando.id);
            const estoyEnEsteBando = miBando?.bandoId === bando.id;
            const tienePermisoGestionar = soyOrganizador || bando.liderId === jugador?.id;
            const estaExpandida =
              faccionesExpandidas[bando.id] !== undefined
                ? faccionesExpandidas[bando.id]
                : estoyEnEsteBando;

            return (
              <View key={bando.id} style={styles.bandoCard}>
                <TouchableOpacity
                  style={styles.bandoHeaderTouch}
                  onPress={() =>
                    setFaccionesExpandidas((prev) => ({
                      ...prev,
                      [bando.id]: !estaExpandida,
                    }))
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.bandoTituloRow}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: bando.colorHex || colors.primary },
                      ]}
                    />
                    <Text style={styles.bandoNombre}>{bando.nombre}</Text>
                    {estoyEnEsteBando && (
                      <View style={styles.badgeTuBandoMini}>
                        <Text style={styles.txtBadgeTuBandoMini}>
                          {esMasivo ? 'TU FACCIÓN' : 'TU BANDO'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.bandoConteo}>
                      {jugadoresDelBando.length}{bando.cupoMax ? `/${bando.cupoMax}` : ''} Op.
                    </Text>
                    <MaterialCommunityIcons
                      name={estaExpandida ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {estaExpandida && (
                  <View style={styles.bandoContenidoDesplegable}>

                {/* Líder de Facción (Especial para eventos masivos o si está asignado) */}
                {esMasivo && (
                  <View style={styles.liderFaccionRow}>
                    <MaterialCommunityIcons name="star-shooting" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={styles.txtLiderFaccion}>
                      Líder:{' '}
                      <Text style={styles.txtLiderFaccionDestacado}>
                        {bando.liderAlias || 'Sin líder asignado'}
                      </Text>
                    </Text>
                    {soyOrganizador && !esTerminadoOCancelado && (
                      <TouchableOpacity
                        style={styles.btnDesignarLiderMini}
                        onPress={() => {
                          setBandoSeleccionadoParaLider(bando);
                          setModalLiderBandoVisible(true);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.txtBtnDesignarLiderMini}>
                          {bando.liderId ? 'CAMBIAR' : 'DESIGNAR'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Botón de ingreso o permanencia en este Bando / Facción */}
                {!esTerminadoOCancelado && (() => {
                  const bandoLleno = bando.cupoMax ? jugadoresDelBando.length >= bando.cupoMax : false;
                  return estoyEnEsteBando ? (
                    <View style={styles.bandoActualRow}>
                      <View style={styles.bandoActualBadge}>
                        <Text style={styles.txtBandoActual}>
                          {esMasivo ? '✓ TU FACCIÓN ACTUAL' : '✓ TU BANDO ACTUAL'}
                        </Text>
                      </View>
                      {evento.estado === 'PROGRAMADO' && (
                        <TouchableOpacity
                          style={[styles.btnBajarseBandoMini, desinscribiendose && styles.botonDeshabilitado]}
                          onPress={handleBajarseOperacion}
                          disabled={desinscribiendose}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="account-minus" size={13} color={colors.danger} style={{ marginRight: 3 }} />
                          <Text style={styles.txtBtnBajarseBandoMini}>
                            {esMasivo ? 'BAJARME DE LA FACCIÓN' : 'BAJARME'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : esMasivo && !miBando ? (
                    // En la vista de detalle inicial de eventos masivos, no se muestra botón directo de alistarse por bando
                    null
                  ) : (
                    bandoLleno ? (
                      <View style={styles.bannerInscripcionCerradaMini}>
                        <MaterialCommunityIcons name="account-lock" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                        <Text style={[styles.txtBannerInscripcionCerradaMini, { color: '#EF4444' }]}>
                          {esMasivo ? 'Facción completa (cupo lleno)' : 'Bando completo'}
                        </Text>
                      </View>
                    ) : evento.inscripcionesAbiertas !== false ? (
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
                          {miBando
                            ? (esMasivo ? 'CAMBIAR A ESTA FACCIÓN' : 'CAMBIAR A ESTE BANDO')
                            : 'ALISTARSE EN ESTE BANDO'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.bannerInscripcionCerradaMini}>
                        <MaterialCommunityIcons name="lock" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.txtBannerInscripcionCerradaMini}>
                          Inscripciones cerradas para esta facción
                        </Text>
                      </View>
                    )
                  );
                })()}

                {/* SI ES EVENTO MASIVO: MOSTRAR ESCUADRAS Y RESERVA */}
                {esMasivo ? (
                  <View style={styles.escuadrasSectionBox}>
                    <View style={styles.escuadrasHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="shield-account" size={15} color={colors.primary} style={{ marginRight: 5 }} />
                        <Text style={styles.txtEscuadrasHeader}>
                          ESCUADRAS TÁCTICAS ({bando.escuadras?.length || 0})
                        </Text>
                      </View>
                      {tienePermisoGestionar && !esTerminadoOCancelado && (
                        !esFase0 ? (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={styles.btnHabilitarEscuadrasMini}
                              onPress={() => {
                                setBandoSeleccionadoParaEscuadras(bando);
                                setModoEscuadra('GENERAR');
                                setModalEscuadrasVisible(true);
                              }}
                            >
                              <MaterialCommunityIcons name="lightning-bolt" size={12} color="#000" />
                              <Text style={styles.txtBtnHabilitarEscuadrasMini}>HABILITAR X</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.btnCrearEscuadraMini}
                              onPress={() => {
                                setBandoSeleccionadoParaEscuadras(bando);
                                setModoEscuadra('CREAR_UNA');
                                setModalEscuadrasVisible(true);
                              }}
                            >
                              <MaterialCommunityIcons name="plus" size={12} color={colors.primary} />
                              <Text style={styles.txtBtnCrearEscuadraMini}>NUEVA</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.badgeFase0Escuadras}>
                            <MaterialCommunityIcons name="clock-outline" size={11} color={colors.textMuted} style={{ marginRight: 3 }} />
                            <Text style={styles.txtBadgeFase0Escuadras}>FASE PREVIA: PLANIFICACIÓN</Text>
                          </View>
                        )
                      )}
                    </View>

                    {/* Banner de Estado de Crono para Operadores en Terreno (no aplica a organizadores) */}
                    {!esFase0 && estoyEnEsteBando && !soyOrganizador && (
                      <View style={{ marginBottom: 8 }}>
                        {tieneCronoAprobado ? (
                          <View style={styles.bannerCronoEscuadraHabilitado}>
                            <MaterialCommunityIcons name="shield-check" size={15} color="#10B981" style={{ marginRight: 6 }} />
                            <Text style={styles.txtBannerCronoEscuadraHabilitado}>
                              HABILITADO PARA DESPLIEGUE: Réplicas homologadas. Asignación a escuadras habilitada.
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.bannerCronoEscuadraPendiente}>
                            <MaterialCommunityIcons name="alert-circle" size={15} color={colors.warning} style={{ marginRight: 6 }} />
                            <Text style={styles.txtBannerCronoEscuadraPendiente}>
                              PENDIENTE DE CRONAJE: Debes homologar tus réplicas en la mesa oficial antes de incorporarte a una escuadra táctica.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {esFase0 ? (
                      <View style={styles.sinEscuadrasBox}>
                        <MaterialCommunityIcons name="clock-alert-outline" size={16} color={colors.warning} style={{ marginBottom: 4 }} />
                        <Text style={styles.txtSinEscuadras}>
                          Las escuadras tácticas se habilitan en terreno el día de la operación durante la fase de llegada y cronaje.
                        </Text>
                      </View>
                    ) : (!bando.escuadras || bando.escuadras.length === 0) ? (
                      <View style={styles.sinEscuadrasBox}>
                        <Text style={styles.txtSinEscuadras}>
                          ℹ️ Aún no se han desplegado escuadras en esta facción. El comandante puede crearlas con los botones superiores.
                        </Text>
                      </View>
                    ) : (
                      bando.escuadras.map((sq) => {
                        const miembrosEscuadra = jugadoresDelBando.filter((j) => j.escuadraId === sq.id);
                        const estoyEnEstaEscuadra = miBando?.escuadraId === sq.id;
                        const escuadraLlena = sq.cupoMax ? miembrosEscuadra.length >= sq.cupoMax : false;
                        const puedeUnirse = (tieneCronoAprobado || soyOrganizador) && !escuadraLlena && !uniendoseAEscuadra;
                        const colorBando = bando.colorHex || colors.primary;
                        const bordeLateralEscuadra = estoyEnEstaEscuadra
                          ? colors.success
                          : escuadraLlena
                          ? colors.disabled
                          : colorBando;

                        return (
                          <View
                            key={sq.id}
                            style={[
                              styles.cardEscuadra,
                              { borderLeftWidth: 4, borderLeftColor: bordeLateralEscuadra },
                            ]}
                          >
                            <View style={styles.headerEscuadra}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.nombreEscuadra}>{sq.nombre}</Text>
                                <Text style={styles.dotacionEscuadra}>
                                  Dotación: {miembrosEscuadra.length}/{sq.cupoMax || 10} operadores
                                </Text>
                              </View>

                              {tienePermisoGestionar && !esTerminadoOCancelado && (
                                <TouchableOpacity
                                  style={styles.btnEliminarEscuadraIcon}
                                  onPress={() => handleEliminarEscuadra(sq.id, sq.nombre)}
                                >
                                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
                                </TouchableOpacity>
                              )}
                            </View>

                            <View style={styles.listaOperadoresEscuadra}>
                              {miembrosEscuadra.length === 0 ? (
                                <Text style={styles.sinOperadoresEscuadra}>Sin operadores asignados</Text>
                              ) : (
                                miembrosEscuadra.map((m) => (
                                  <Text key={m.jugadorId} style={styles.operadorEscuadraItem}>
                                    • {m.alias} <Text style={styles.rolTag}>[{m.rol}]</Text>
                                    {m.jugadorId === jugador?.id ? ' (TÚ)' : ''}
                                  </Text>
                                ))
                              )}
                            </View>

                            {estoyEnEsteBando && !esTerminadoOCancelado && (
                              estoyEnEstaEscuadra ? (
                                <View style={styles.escuadraActualRow}>
                                  <View style={styles.badgeTuEscuadra}>
                                    <Text style={styles.txtTuEscuadra}>✓ TU ESCUADRA</Text>
                                  </View>
                                  <TouchableOpacity
                                    style={styles.btnSalirEscuadraMini}
                                    onPress={handleSalirEscuadra}
                                    disabled={uniendoseAEscuadra}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.txtBtnSalirEscuadraMini}>SALIR A RESERVA</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={[
                                    styles.btnUnirseEscuadra,
                                    !puedeUnirse && styles.botonDeshabilitado,
                                  ]}
                                  disabled={!puedeUnirse}
                                  onPress={() => {
                                    if (!tieneCronoAprobado && !soyOrganizador) {
                                      mostrarAvisoTactico(
                                        'ACREDITACIÓN REQUERIDA',
                                        'Debes tener al menos una réplica aprobada en la mesa de cronómetro antes de asignarte a una escuadra táctica.',
                                        'advertencia',
                                        'speedometer',
                                      );
                                      return;
                                    }
                                    handleUnirseEscuadra(sq.id);
                                  }}
                                >
                                  <MaterialCommunityIcons
                                    name={(!tieneCronoAprobado && !soyOrganizador) ? 'lock' : 'shield-plus'}
                                    size={13}
                                    color="#fff"
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text style={styles.txtBtnUnirseEscuadra}>
                                    {(!tieneCronoAprobado && !soyOrganizador)
                                      ? 'CRONAJE REQUERIDO'
                                      : escuadraLlena
                                      ? 'ESCUADRA COMPLETA'
                                      : 'UNIRME A ESTA ESCUADRA'}
                                  </Text>
                                </TouchableOpacity>
                              )
                            )}
                          </View>
                        );
                      })
                    )}

                    {/* Operadores de Reserva en la Facción */}
                    {bando.escuadras && bando.escuadras.length > 0 && (
                      (() => {
                        const reservas = jugadoresDelBando.filter((j) => !j.escuadraId);
                        if (reservas.length === 0) return null;
                        return (
                          <View style={styles.boxReservasFaccion}>
                            <Text style={styles.txtTituloReservas}>
                              OPERADORES EN RESERVA ({reservas.length})
                            </Text>
                            <Text style={styles.txtListaReservas}>
                              {reservas.map((r) => `${r.alias} [${r.rol}]`).join(', ')}
                            </Text>
                          </View>
                        );
                      })()
                    )}
                  </View>
                ) : (
                  /* SI ES PICHANGA O VERSUS: ROSTER REGULAR */
                  <View style={styles.jugadoresList}>
                    {jugadoresDelBando.length === 0 ? (
                      <Text style={styles.sinOperadores}>Sin operadores enlistados aún</Text>
                    ) : (
                      jugadoresDelBando.map((j) => (
                        <Text
                          key={j.jugadorId}
                          style={[styles.jugadorItem, { color: obtenerEstiloFama(j.fama).colorTexto }]}
                        >
                          • {j.alias} <Text style={styles.rolTag}>[{j.rol}]</Text>
                          {j.jugadorId === jugador?.id ? ' (TÚ)' : ''}
                        </Text>
                      ))
                    )}
                  </View>
                )}
                  </View>
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
              <Text style={styles.descSinAsignar}>
                Operadores inscritos pendientes de designación de bando:
              </Text>
              <View style={styles.jugadoresList}>
                {jugadores
                  .filter((j) => !j.bandoId)
                  .map((j) => (
                    <Text key={j.jugadorId} style={styles.jugadorItem}>
                      • {j.alias} <Text style={styles.rolTag}>[{j.rol}]</Text>
                      {j.jugadorId === jugador?.id ? ' (TÚ)' : ''}
                    </Text>
                  ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Botón de Emergencia Táctica: BLIND MAN / ALTO AL FUEGO (En Fase 2 va abajo del todo de la pantalla; en Fase 3 no se muestra) */}
      {esOperacionEnCurso && !esFase3Debriefing && (
        <View style={styles.boxAltoAlFuegoBottom}>
          <TouchableOpacity
            style={styles.btnBlindManAlert}
            onPress={() => setModalBlindManVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.blindManFranjaPeligro}>
              <View style={styles.blindManIconCircle}>
                <MaterialCommunityIcons name="alert-octagon" size={24} color="#fff" />
              </View>
              <View style={styles.blindManTextosCol}>
                <Text style={styles.txtAlertaEmergenciaHeader}>PROTOCOLO DE EMERGENCIA REAL</Text>
                <Text style={styles.txtBtnBlindManAlert}>ALTO AL FUEGO / BLIND MAN</Text>
                <Text style={styles.txtAlertaEmergenciaSub}>Toca aquí para ver frecuencias y protocolo de alto al fuego</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.7)" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para unirse con selección de rol */}
      <Modal
        visible={modalUnirseVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalUnirseVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>SELECCIONA TU ROL TÁCTICO</Text>
            <Text style={styles.modalSubtitulo}>
              {esMasivo
                ? 'Selecciona 1 rol específico para este despliegue masivo:'
                : 'Elige tu rol o especialidad en el combate:'}
            </Text>

            <View style={styles.rolesModalGrid}>
              {ROLES_TACTICOS.map((rol) => {
                const activo = rolesSeleccionados.includes(rol);
                return (
                  <TouchableOpacity
                    key={rol}
                    style={[styles.rolModalChip, activo && styles.rolModalChipActivo]}
                    onPress={() => toggleRolUnirse(rol)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.rolModalTexto, activo && styles.rolModalTextoActivo]}>
                      {rol}
                    </Text>
                    {activo && (
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color="#fff"
                        style={{ marginLeft: 3 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => setModalUnirseVisible(false)}
              >
                <Text style={styles.modalTextoCancelar}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBotonConfirmar, uniendose && styles.botonDeshabilitado]}
                disabled={uniendose}
                onPress={confirmarUnirseBando}
              >
                {uniendose ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTextoConfirmar}>CONFIRMAR ALISTAMIENTO</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Wizard de Alistamiento Milsim (4 Pasos) */}
      <Modal
        visible={modalAlistamientoMilsimVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          if (!alistandoseMilsim) setModalAlistamientoMilsimVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={styles.modalContentAlistamiento}>
            {/* Header del Modal */}
            <Pressable
              style={styles.headerAlistamiento}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="shield-check" size={20} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.tituloAlistamiento}>PROTOCOLO DE ALISTAMIENTO</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setModalAlistamientoMilsimVisible(false);
                }}
                disabled={alistandoseMilsim}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Pressable>

            {/* Stepper horizontal (1: Reglas, 2: Réplicas, 3: Facción, 4: Revisión) */}
            <View style={styles.stepperContainer}>
              {[
                { paso: 1, label: 'Reglas' },
                { paso: 2, label: 'Réplicas' },
                { paso: 3, label: 'Facción' },
                { paso: 4, label: 'Revisión' },
              ].map((st) => {
                const activo = pasoAlistamiento === st.paso;
                const completado = pasoAlistamiento > st.paso;
                return (
                  <View key={st.paso} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        activo && styles.stepCircleActivo,
                        completado && styles.stepCircleCompletado,
                      ]}
                    >
                      {completado ? (
                        <MaterialCommunityIcons name="check" size={13} color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.txtStepNumber,
                            activo && styles.txtStepNumberActivo,
                          ]}
                        >
                          {st.paso}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.txtStepLabel,
                        activo && styles.txtStepLabelActivo,
                        completado && styles.txtStepLabelCompletado,
                      ]}
                    >
                      {st.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* CONTENIDO SEGÚN EL PASO ACTUAL */}
            <ScrollView
              style={{ maxHeight: 420 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* PASO 1: REGLAS Y CONDICIONES TACSOP */}
              {pasoAlistamiento === 1 && (
                <View style={styles.cuerpoPasoAlistamiento}>
                  <Text style={styles.subtituloPasoAlistamiento}>
                    1. REGLAMENTO TACSOP Y CONDICIONES
                  </Text>
                  <Text style={styles.descPasoAlistamiento}>
                    Revisa las normas oficiales y confirma tu compromiso antes de ingresar a la operación:
                  </Text>

                  {/* Tabla de límites de crono configurados */}
                  <View style={styles.tacsopBoxAlistamiento}>
                    <Text style={styles.tacsopBoxTitulo}>LÍMITES DE CRONO HOMOLOGADOS (0.20g):</Text>
                    {(() => {
                      const limites = (evento.tacsop?.limitesCrono && evento.tacsop.limitesCrono.length > 0)
                        ? evento.tacsop.limitesCrono
                        : [
                            { categoria: 'ASALTO', fpsMax: 400, joulesMax: 1.49, medMetros: 5, modoDisparo: 'SEMI' },
                            { categoria: 'SOPORTE', fpsMax: 400, joulesMax: 1.49, medMetros: 15, modoDisparo: 'AUTO' },
                            { categoria: 'DMR', fpsMax: 450, joulesMax: 1.88, medMetros: 20, modoDisparo: 'SEMI' },
                            { categoria: 'SNIPER', fpsMax: 550, joulesMax: 2.81, medMetros: 30, modoDisparo: 'BOLT' },
                            { categoria: 'PISTOLA', fpsMax: 328, joulesMax: 1.00, medMetros: 0, modoDisparo: 'SEMI' },
                          ];
                      return (
                        <View style={styles.tablaCronoAlistamiento}>
                          {limites.map((l: any, idx: number) => (
                            <View key={idx} style={styles.filaCronoAlistamiento}>
                              <Text style={styles.colCatCrono}>{l.categoria}:</Text>
                              <Text style={styles.colStatsCrono}>
                                {l.fpsMax} FPS ({l.joulesMax} J) | MED {l.medMetros}m | {l.modoDisparo}
                              </Text>
                            </View>
                          ))}
                        </View>
                      );
                    })()}
                  </View>

                  {/* Reglas Milsim: Vidas, torniquetes, pañuelo de muerte */}
                  <View style={styles.tacsopBoxAlistamiento}>
                    <Text style={styles.tacsopBoxTitulo}>NORMAS DE COMBATE Y SEGURIDAD:</Text>
                    <View style={styles.reglaItemRow}>
                      <MaterialCommunityIcons name="heart-pulse" size={15} color={colors.danger} style={{ marginRight: 6 }} />
                      <Text style={styles.txtReglaItem}>
                        Vidas por operador: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{evento.tacsop?.vidasMax || 2}</Text> (requiere torniquete homologado).
                      </Text>
                    </View>
                    <View style={styles.reglaItemRow}>
                      <MaterialCommunityIcons name="clock-outline" size={15} color={colors.warning} style={{ marginRight: 6 }} />
                      <Text style={styles.txtReglaItem}>
                        Tiempo de desangrado: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{evento.tacsop?.tiempoDesangradoMin || 5} min</Text> para rescate de médico.
                      </Text>
                    </View>
                    <View style={styles.reglaItemRow}>
                      <MaterialCommunityIcons name="flag" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text style={styles.txtReglaItem}>
                        Bajas: <Text style={{ color: '#fff', fontWeight: 'bold' }}>Pañuelo rojo obligatorio</Text> de día, luz roja/azul de noche.
                      </Text>
                    </View>
                    <View style={styles.reglaItemRow}>
                      <MaterialCommunityIcons name="radio-handheld" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.txtReglaItem}>
                        Comunicaciones: Radios Baofeng UV-5R con frecuencias asignadas por escuadra.
                      </Text>
                    </View>
                  </View>

                  {/* Checkbox de Aceptación Obligatoria */}
                  <TouchableOpacity
                    style={[styles.checkboxContainer, reglasAceptadas && styles.checkboxContainerAceptado]}
                    onPress={() => setReglasAceptadas(!reglasAceptadas)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={reglasAceptadas ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={reglasAceptadas ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.txtCheckbox, reglasAceptadas && styles.txtCheckboxAceptado]}>
                      He leído y me comprometo a cumplir estrictamente el reglamento TACSOP y las normas de seguridad de esta operación.
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 2: DECLARACIÓN DE RÉPLICAS */}
              {pasoAlistamiento === 2 && (
                <View style={styles.cuerpoPasoAlistamiento}>
                  <Text style={styles.subtituloPasoAlistamiento}>
                    2. DECLARACIÓN DE RÉPLICAS EN DESPLIEGUE
                  </Text>
                  <Text style={styles.descPasoAlistamiento}>
                    Registra las réplicas que llevarás a la mesa de cronómetro oficial:
                  </Text>

                  {replicasAlistamiento.map((rep) => {
                    const fpsNum = parseInt(rep.fpsEstimado, 10) || 0;
                    const joulesAprox = (0.5 * 0.0002 * Math.pow(fpsNum * 0.3048, 2)).toFixed(2);
                    return (
                      <View key={rep.id} style={styles.cardReplicaAlistamiento}>
                        <View style={styles.headerReplicaAlistamiento}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons
                              name={rep.tipoReplica === 'SECUNDARIA' ? 'pistol' : 'crosshairs-gps'}
                              size={16}
                              color={colors.primary}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={styles.txtTipoReplicaHeader}>
                              {rep.tipoReplica === 'PRIMARIA'
                                ? 'RÉPLICA PRIMARIA'
                                : rep.tipoReplica === 'PRIMARIA_2'
                                ? 'SEGUNDA PRIMARIA'
                                : rep.tipoReplica === 'SECUNDARIA'
                                ? 'RÉPLICA SECUNDARIA'
                                : 'RÉPLICA DE RESPALDO'}
                            </Text>
                          </View>
                          {replicasAlistamiento.length > 1 && (
                            <TouchableOpacity
                              onPress={() => eliminarReplicaAlistamiento(rep.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Selector de Categoría / Rol */}
                        <Text style={styles.labelCampoReplica}>ROL / CATEGORÍA:</Text>
                        <View style={styles.rolesGridReplica}>
                          {['ASALTO', 'DMR', 'SNIPER', 'SOPORTE', 'PISTOLA'].map((cat) => {
                            const seleccionado = rep.categoria === cat;
                            return (
                              <TouchableOpacity
                                key={cat}
                                style={[styles.chipCatReplica, seleccionado && styles.chipCatReplicaActivo]}
                                onPress={() => actualizarReplicaAlistamiento(rep.id, 'categoria', cat)}
                              >
                                <Text style={[styles.txtChipCatReplica, seleccionado && styles.txtChipCatReplicaActivo]}>
                                  {cat}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Modelo o Nombre */}
                        <Text style={styles.labelCampoReplica}>MODELO O NOMBRE DE LA RÉPLICA:</Text>
                        <TextInput
                          style={styles.inputReplicaModelo}
                          value={rep.modelo}
                          onChangeText={(txt) => actualizarReplicaAlistamiento(rep.id, 'modelo', txt)}
                          placeholder="ej. Specna Arms M4, Tokyo Marui Hi-Capa, etc."
                          placeholderTextColor={colors.textMuted}
                        />

                        {/* FPS Estimado y Joules */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.labelCampoReplica}>FPS ESTIMADO (0.20g):</Text>
                            <TextInput
                              style={styles.inputReplicaFps}
                              value={rep.fpsEstimado}
                              onChangeText={(txt) => actualizarReplicaAlistamiento(rep.id, 'fpsEstimado', txt.replace(/[^0-9]/g, ''))}
                              placeholder="380"
                              placeholderTextColor={colors.textMuted}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={styles.cajaJoulesCalculados}>
                            <Text style={styles.txtSubJoules}>POTENCIA ESTIMADA:</Text>
                            <Text style={styles.txtJoulesCalculados}>≈ {joulesAprox} J</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {/* Botones para agregar réplicas secundarias o de respaldo */}
                  <View style={styles.botonesAgregarReplicasRow}>
                    {!replicasAlistamiento.some((r) => r.tipoReplica === 'SECUNDARIA') && (
                      <TouchableOpacity style={styles.btnAgregarReplicaMini} onPress={agregarReplicaSecundaria}>
                        <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                        <Text style={styles.txtBtnAgregarReplicaMini}>+ SECUNDARIA (PISTOLA)</Text>
                      </TouchableOpacity>
                    )}
                    {replicasAlistamiento.length < 3 && (
                      <TouchableOpacity style={styles.btnAgregarReplicaMini} onPress={agregarReplicaPrimaria2}>
                        <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                        <Text style={styles.txtBtnAgregarReplicaMini}>+ 2DA PRIMARIA / RESPALDO</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* PASO 3: SELECCIÓN DE FACCIÓN TÁCTICA */}
              {pasoAlistamiento === 3 && (
                <View style={styles.cuerpoPasoAlistamiento}>
                  <Text style={styles.subtituloPasoAlistamiento}>
                    3. SELECCIÓN DE FACCIÓN (ORBAT)
                  </Text>
                  <Text style={styles.descPasoAlistamiento}>
                    Elige el bando en el que combatirás durante la operación:
                  </Text>

                  {evento.bandos?.map((bando) => {
                    const inscritos = jugadores.filter((j) => j.bandoId === bando.id);
                    const cupoLleno = bando.cupoMax ? inscritos.length >= bando.cupoMax : false;
                    const seleccionado = bandoAlistamientoId === bando.id;

                    return (
                      <TouchableOpacity
                        key={bando.id}
                        style={[
                          styles.cardBandoAlistamiento,
                          seleccionado && styles.cardBandoAlistamientoSeleccionado,
                          cupoLleno && styles.cardBandoAlistamientoLleno,
                        ]}
                        disabled={cupoLleno}
                        onPress={() => setBandoAlistamientoId(bando.id)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View
                              style={[
                                styles.dotBandoAlistamiento,
                                { backgroundColor: bando.colorHex || colors.primary },
                              ]}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.nombreBandoAlistamiento, seleccionado && { color: colors.primary }]}>
                                {bando.nombre}
                              </Text>
                              <Text style={styles.liderBandoAlistamiento}>
                                Comandante: {bando.liderAlias || 'Sin líder asignado'}
                              </Text>
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.cupoBandoAlistamiento}>
                              {inscritos.length}{bando.cupoMax ? `/${bando.cupoMax}` : ''} Op.
                            </Text>
                            {cupoLleno ? (
                              <Text style={styles.badgeCupoLleno}>CUPO LLENO</Text>
                            ) : seleccionado ? (
                              <Text style={styles.badgeSeleccionado}>✓ ELEGIDA</Text>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* PASO 4: REVISIÓN FINAL Y NOTIFICACIONES */}
              {pasoAlistamiento === 4 && (
                <View style={styles.cuerpoPasoAlistamiento}>
                  <Text style={styles.subtituloPasoAlistamiento}>
                    4. REVISIÓN FINAL Y NOTIFICACIONES
                  </Text>
                  <Text style={styles.descPasoAlistamiento}>
                    Verifica tus datos antes de formalizar tu alistamiento en el orden de batalla:
                  </Text>

                  {/* Resumen */}
                  <View style={styles.resumenAlistamientoCard}>
                    <View style={styles.filaResumenItem}>
                      <Text style={styles.lblResumen}>FACCIÓN SELECCIONADA:</Text>
                      <Text style={styles.valResumenDestacado}>
                        {evento.bandos?.find((b) => b.id === bandoAlistamientoId)?.nombre || 'No seleccionada'}
                      </Text>
                    </View>
                    <View style={styles.filaResumenItem}>
                      <Text style={styles.lblResumen}>ARMAMENTO RÉPLICA:</Text>
                      {replicasAlistamiento.map((r, idx) => (
                        <Text key={idx} style={styles.valResumen}>
                          • {r.tipoReplica}: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{r.categoria}</Text> {r.modelo ? `(${r.modelo})` : ''} - {r.fpsEstimado} FPS
                        </Text>
                      ))}
                    </View>
                    <View style={[styles.filaResumenItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                      <Text style={styles.lblResumen}>REGLAMENTO TACSOP:</Text>
                      <Text style={[styles.valResumen, { color: colors.success }]}>✓ Términos y límites aceptados</Text>
                    </View>
                  </View>

                  {/* Configuración de Notificaciones */}
                  <View style={styles.notificacionesAlistamientoBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <MaterialCommunityIcons name="bell-ring-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.tituloNotifAlistamiento}>ALERTAS TÁCTICAS EN TU TELÉFONO</Text>
                    </View>
                    <Text style={styles.descNotifAlistamiento}>
                      Activa recordatorios automáticos para no olvidar réplicas ni retrasar tu despliegue:
                    </Text>

                    <View style={styles.switchNotifRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.txtSwitchNotifTitulo}>Día anterior (24 horas antes)</Text>
                        <Text style={styles.txtSwitchNotifDesc}>Aviso táctico 24 hrs antes para alistar réplicas y baterías</Text>
                      </View>
                      <Switch
                        value={notifDiaAntesAlistamiento}
                        onValueChange={setNotifDiaAntesAlistamiento}
                        trackColor={{ false: colors.inputBg, true: colors.primary }}
                        thumbColor={notifDiaAntesAlistamiento ? '#fff' : colors.textMuted}
                      />
                    </View>

                    <View style={[styles.switchNotifRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.txtSwitchNotifTitulo}>30 minutos antes</Text>
                        <Text style={styles.txtSwitchNotifDesc}>Aviso media hora antes para presentación en crono</Text>
                      </View>
                      <Switch
                        value={notif30MinAlistamiento}
                        onValueChange={setNotif30MinAlistamiento}
                        trackColor={{ false: colors.inputBg, true: colors.primary }}
                        thumbColor={notif30MinAlistamiento ? '#fff' : colors.textMuted}
                      />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* BOTONES DE NAVEGACIÓN INFERIOR */}
            <View style={styles.footerAlistamientoBotones}>
              {pasoAlistamiento > 1 ? (
                <TouchableOpacity
                  style={styles.btnVolverAlistamiento}
                  onPress={() => setPasoAlistamiento((prev) => (prev - 1) as any)}
                  disabled={alistandoseMilsim}
                >
                  <MaterialCommunityIcons name="arrow-left" size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.txtBtnVolverAlistamiento}>VOLVER</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.btnVolverAlistamiento}
                  onPress={() => setModalAlistamientoMilsimVisible(false)}
                  disabled={alistandoseMilsim}
                >
                  <Text style={styles.txtBtnVolverAlistamiento}>CANCELAR</Text>
                </TouchableOpacity>
              )}

              {pasoAlistamiento < 4 ? (
                <TouchableOpacity
                  style={[
                    styles.btnSiguienteAlistamiento,
                    (pasoAlistamiento === 1 && !reglasAceptadas) ||
                    (pasoAlistamiento === 3 && !bandoAlistamientoId)
                      ? styles.botonDeshabilitado
                      : null,
                  ]}
                  disabled={
                    (pasoAlistamiento === 1 && !reglasAceptadas) ||
                    (pasoAlistamiento === 3 && !bandoAlistamientoId)
                  }
                  onPress={() => setPasoAlistamiento((prev) => (prev + 1) as any)}
                >
                  <Text style={styles.txtBtnSiguienteAlistamiento}>
                    {pasoAlistamiento === 1 ? 'REGISTRAR RÉPLICAS ➔' : pasoAlistamiento === 2 ? 'ELEGIR FACCIÓN ➔' : 'REVISAR ALISTAMIENTO ➔'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.btnFinalizarAlistamiento, alistandoseMilsim && styles.botonDeshabilitado]}
                  disabled={alistandoseMilsim}
                  onPress={confirmarAlistamientoMilsimFinal}
                >
                  {alistandoseMilsim ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-decagram" size={18} color="#000" style={{ marginRight: 6 }} />
                      <Text style={styles.txtBtnFinalizarAlistamiento}>CONFIRMAR ALISTAMIENTO</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para Modificar Operación */}
      <Modal
        visible={modalEditarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalEditarVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={[styles.modalContent, { maxHeight: '88%' }]}>
            <Pressable style={{ width: '100%' }} onPress={Keyboard.dismiss} accessible={false}>
              <Text style={styles.modalTitulo}>MODIFICAR OPERACIÓN</Text>
              <Text style={styles.modalSubtitulo}>Actualiza los parámetros tácticos y reglas:</Text>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ width: '100%' }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Pressable onPress={Keyboard.dismiss} accessible={false}>
              <Text style={styles.inputModalLabel}>TÍTULO (*):</Text>
              <TextInput
                style={styles.inputModal}
                value={editTitulo}
                onChangeText={setEditTitulo}
                placeholder="Título del evento"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
              />

              <Text style={styles.inputModalLabel}>BRIEFING / DESCRIPCIÓN:</Text>
              <TextInput
                style={[styles.inputModal, styles.inputModalArea]}
                value={editDescripcion}
                onChangeText={setEditDescripcion}
                placeholder="Detalles de la operación..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={Keyboard.dismiss}
              />

              <TacticalDateTimePicker
                label="HORA DE INICIO (*):"
                value={editFechaInicio}
                onChange={setEditFechaInicio}
              />

              <TacticalDateTimePicker
                label="HORA DE TÉRMINO (*):"
                value={editFechaFin}
                minimumDate={editFechaInicio}
                onChange={setEditFechaFin}
              />

              {esMasivo && (
                <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <MaterialCommunityIcons name="shield-sword" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>REGLAS TACSOP & CRONÓGRAFO</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputModalLabel}>VIDAS POR OPERADOR:</Text>
                      <TextInput
                        style={styles.inputModal}
                        value={editVidasMax}
                        onChangeText={setEditVidasMax}
                        keyboardType="numeric"
                        placeholder="2"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputModalLabel}>DESANGRADO (MIN):</Text>
                      <TextInput
                        style={styles.inputModal}
                        value={editTiempoDesangradoMin}
                        onChangeText={setEditTiempoDesangradoMin}
                        keyboardType="numeric"
                        placeholder="5"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={[styles.filaSwitchRecordatorio, { backgroundColor: '#181818', padding: 10, borderRadius: 8, marginBottom: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>¿Requiere torniquete obligatorio?</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>Auto-aplicación médica en combate</Text>
                    </View>
                    <Switch
                      value={editRequiereTorniquete}
                      onValueChange={setEditRequiereTorniquete}
                      trackColor={{ false: colors.inputBg, true: colors.primary }}
                      thumbColor={editRequiereTorniquete ? '#fff' : colors.textMuted}
                    />
                  </View>

                  <Text style={[styles.inputModalLabel, { marginBottom: 6 }]}>LÍMITES DE CRONO POR CATEGORÍA (FPS / JULIOS):</Text>
                  {editLimitesCrono.map((lim: any, idx: number) => (
                    <View key={lim.categoria || idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, backgroundColor: '#181818', padding: 8, borderRadius: 6 }}>
                      <Text style={{ width: 68, color: '#fff', fontSize: 11, fontWeight: '700' }}>{lim.categoria}</Text>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>FPS:</Text>
                        <TextInput
                          style={[styles.inputModal, { flex: 1, height: 34, paddingVertical: 2, fontSize: 11, marginBottom: 0 }]}
                          value={lim.maxFps ? String(lim.maxFps) : ''}
                          keyboardType="numeric"
                          onChangeText={(val) => {
                            const fpsNum = parseInt(val, 10) || 0;
                            const jNum = Number((0.5 * 0.0002 * Math.pow(fpsNum * 0.3048, 2)).toFixed(2));
                            setEditLimitesCrono((prev: any[]) =>
                              prev.map((item, i) => (i === idx ? { ...item, maxFps: fpsNum, maxJoules: jNum } : item))
                            );
                          }}
                        />
                      </View>
                      <View style={{ width: 65, alignItems: 'center' }}>
                        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{lim.maxJoules} J</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 9 }}>0.20g</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              </Pressable>
            </ScrollView>

            <View style={[styles.modalBotones, { marginTop: 12 }]}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => {
                  Keyboard.dismiss();
                  setModalEditarVisible(false);
                }}
              >
                <Text style={styles.modalTextoCancelar}>VOLVER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBotonConfirmar, guardandoEdicion && styles.botonDeshabilitado]}
                disabled={guardandoEdicion}
                onPress={handleGuardarModificacion}
              >
                {guardandoEdicion ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTextoConfirmar}>GUARDAR CAMBIOS</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para Cancelar Evento */}
      <Modal
        visible={modalCancelarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalCancelarVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={styles.modalContent}>
            <Pressable style={{ width: '100%' }} onPress={Keyboard.dismiss} accessible={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <MaterialCommunityIcons name="cancel" size={20} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={[styles.modalTitulo, { color: colors.danger, marginBottom: 0 }]}>CANCELAR OPERACIÓN</Text>
              </View>
              <Text style={styles.modalSubtitulo}>
                Indica el motivo de la cancelación. Se notificará a los participantes:
              </Text>
            </Pressable>

            {MOTIVOS_CANCELACION.map((motivo) => {
              const seleccionado = motivoSeleccionado === motivo;
              return (
                <TouchableOpacity
                  key={motivo}
                  style={[styles.itemMotivoChip, seleccionado && styles.itemMotivoChipActivo]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setMotivoSeleccionado(motivo);
                  }}
                >
                  <MaterialCommunityIcons
                    name={seleccionado ? 'radiobox-marked' : 'radiobox-blank'}
                    size={16}
                    color={seleccionado ? colors.danger : colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.txtMotivoChip, seleccionado && styles.txtMotivoChipActivo]}>
                    {motivo}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {motivoSeleccionado === 'Otro motivo...' && (
              <TextInput
                style={[styles.inputModal, styles.inputModalArea, { marginTop: 8 }]}
                value={motivoOtroTexto}
                onChangeText={setMotivoOtroTexto}
                placeholder="Escribe el motivo detallado..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={Keyboard.dismiss}
              />
            )}

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => {
                  Keyboard.dismiss();
                  setModalCancelarVisible(false);
                }}
              >
                <Text style={styles.modalTextoCancelar}>VOLVER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnConfirmarCancelarEvento, cancelandoEvento && styles.botonDeshabilitado]}
                disabled={cancelandoEvento}
                onPress={handleConfirmarCancelacion}
              >
                {cancelandoEvento ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.txtConfirmarCancelarEvento}>CONFIRMAR CANCELACIÓN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal QR para Operadores Atrasados */}
      <Modal
        visible={modalQrVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalQrVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentQr}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>QR DE ACCESO TÁCTICO</Text>
                <Text style={styles.modalSubtitulo}>
                  Muestra este código a los operadores en la cancha para ingreso rápido:
                </Text>
              </View>
            </View>

            <View style={styles.qrTabsContainer}>
              <TouchableOpacity
                style={[styles.qrTabBtn, tabQrAtrasados === 'PARTIDA' && styles.qrTabBtnActivo]}
                onPress={() => setTabQrAtrasados('PARTIDA')}
              >
                <Text style={[styles.qrTabTxt, tabQrAtrasados === 'PARTIDA' && styles.qrTabTxtActivo]}>
                  EVENTO GENERAL
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
                <Text style={[styles.qrTabTxt, tabQrAtrasados === 'BANDO' && styles.qrTabTxtActivo]}>
                  POR BANDO DIRECTO
                </Text>
              </TouchableOpacity>
            </View>

            {tabQrAtrasados === 'BANDO' && evento.bandos && (
              <View style={styles.bandoSelectorQrRow}>
                {evento.bandos.map((b) => {
                  const seleccionado = (bandoQrSeleccionadoId || evento.bandos![0].id) === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.chipBandoQr, seleccionado && { borderColor: b.colorHex || colors.primary }]}
                      onPress={() => setBandoQrSeleccionadoId(b.id)}
                    >
                      <View style={[styles.dotBando, { backgroundColor: b.colorHex || colors.primary }]} />
                      <Text style={[styles.txtChipBando, seleccionado && { color: '#fff', fontWeight: '800' }]}>
                        {b.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {(() => {
              const bandoActivo =
                tabQrAtrasados === 'BANDO'
                  ? evento.bandos?.find((b) => b.id === (bandoQrSeleccionadoId || evento.bandos![0].id))
                  : null;

              const qrPayload =
                tabQrAtrasados === 'BANDO' && bandoActivo?.qrToken
                  ? `bajatepo://bando/${bandoActivo.qrToken}`
                  : `bajatepo://evento/${evento.codigoInvitacion || evento.id}`;

              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                qrPayload,
              )}&color=000000&bgcolor=ffffff`;

              return (
                <View style={styles.qrContainerBox}>
                  <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
                  <View style={styles.qrCodigoFooter}>
                    <Text style={styles.qrCodigoSub}>CÓDIGO MNEMOTÉCNICO:</Text>
                    <Text style={styles.qrCodigoText}>{evento.codigoInvitacion || 'N/A'}</Text>
                    <Text style={styles.qrInstruccion}>
                      {tabQrAtrasados === 'BANDO'
                        ? `Al escanear ingresarán directo a "${bandoActivo?.nombre || 'Bando'}".`
                        : 'Al escanear accederán directamente al evento.'}
                    </Text>
                  </View>
                </View>
              );
            })()}

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => setModalQrVisible(false)}
              >
                <Text style={styles.modalTextoCancelar}>CERRAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCompartirModal}
                onPress={handleCompartirOperacion}
              >
                <MaterialCommunityIcons name="share-variant" size={15} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.modalTextoConfirmar}>COMPARTIR LINK</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="flag-checkered" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>INICIAR PARTIDA / MODALIDAD</Text>
                <Text style={styles.modalSubtitulo}>
                  Elige la modalidad táctica configurada:
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
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {modalidades.map((m) => {
                const activo = (modalidadSeleccionada?.id || modalidades[0]?.id) === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.itemModalidadCard, activo && styles.itemModalidadCardActivo]}
                    onPress={() => setModalidadSeleccionada(m)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txtModalidadNombre, activo && styles.txtModalidadNombreActivo]}>
                        {m.nombre}
                      </Text>
                      {m.descripcion ? (
                        <Text style={styles.txtModalidadDesc}>{m.descripcion}</Text>
                      ) : null}
                    </View>
                    {activo && (
                      <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => setModalIniciarPartidaVisible(false)}
              >
                <Text style={styles.modalTextoCancelar}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBotonConfirmar, creandoPartida && styles.botonDeshabilitado]}
                disabled={creandoPartida}
                onPress={handleIniciarPartida}
              >
                {creandoPartida ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTextoConfirmar}>DAR INICIO AL COMBATE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PARA HABILITAR / CREAR ESCUADRAS (EVENTOS MASIVOS) */}
      <Modal
        visible={modalEscuadrasVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalEscuadrasVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={styles.modalContent}>
            <Pressable
              style={styles.modalHeaderQr}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>HABILITAR ESCUADRAS</Text>
                <Text style={styles.modalSubtitulo}>
                  Facción: {bandoSeleccionadoParaEscuadras?.nombre}
                </Text>
              </View>
            </Pressable>

            {/* Pestañas de Modo: Rápido (X Escuadras) vs Específica */}
            <View style={styles.qrTabsContainer}>
              <TouchableOpacity
                style={[styles.qrTabBtn, modoEscuadra === 'GENERAR' && styles.qrTabBtnActivo]}
                onPress={() => setModoEscuadra('GENERAR')}
              >
                <Text style={[styles.qrTabTxt, modoEscuadra === 'GENERAR' && styles.qrTabTxtActivo]}>
                  MÚLTIPLES (X)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qrTabBtn, modoEscuadra === 'CREAR_UNA' && styles.qrTabBtnActivo]}
                onPress={() => setModoEscuadra('CREAR_UNA')}
              >
                <Text style={[styles.qrTabTxt, modoEscuadra === 'CREAR_UNA' && styles.qrTabTxtActivo]}>
                  + ESPECÍFICA
                </Text>
              </TouchableOpacity>
            </View>

            {modoEscuadra === 'GENERAR' ? (
              <View>
                <Text style={styles.inputModalLabel}>CANTIDAD DE ESCUADRAS A HABILITAR:</Text>
                <View style={styles.botonesCantidadRow}>
                  {['2', '3', '4', '6', '8'].map((cant) => (
                    <TouchableOpacity
                      key={cant}
                      style={[
                        styles.btnChipCantidad,
                        cantidadEscuadras === cant && styles.btnChipCantidadActivo,
                      ]}
                      onPress={() => setCantidadEscuadras(cant)}
                    >
                      <Text
                        style={[
                          styles.txtChipCantidad,
                          cantidadEscuadras === cant && styles.txtChipCantidadActivo,
                        ]}
                      >
                        {cant}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputModalLabel}>CUPO MÁXIMO POR ESCUADRA:</Text>
                <TextInput
                  style={styles.inputModal}
                  value={cupoMaxNuevaEscuadra}
                  onChangeText={setCupoMaxNuevaEscuadra}
                  keyboardType="numeric"
                  placeholder="ej: 10"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.inputModalLabel}>NOMBRE DE LA ESCUADRA (*):</Text>
                <TextInput
                  style={styles.inputModal}
                  value={nombreNuevaEscuadra}
                  onChangeText={setNombreNuevaEscuadra}
                  placeholder="ej: Escuadra Alfa Recon"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.inputModalLabel}>CUPO MÁXIMO DE OPERADORES:</Text>
                <TextInput
                  style={styles.inputModal}
                  value={cupoMaxNuevaEscuadra}
                  onChangeText={setCupoMaxNuevaEscuadra}
                  keyboardType="numeric"
                  placeholder="ej: 10"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => {
                  Keyboard.dismiss();
                  setModalEscuadrasVisible(false);
                }}
              >
                <Text style={styles.modalTextoCancelar}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBotonConfirmar, guardandoEscuadra && styles.botonDeshabilitado]}
                disabled={guardandoEscuadra}
                onPress={handleGenerarEscuadras}
              >
                {guardandoEscuadra ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTextoConfirmar}>
                    {modoEscuadra === 'GENERAR' ? 'HABILITAR ESCUADRAS' : 'CREAR ESCUADRA'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PARA DESIGNAR LÍDER DE BANDO / FACCIÓN */}
      <Modal
        visible={modalLiderBandoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalLiderBandoVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="star-shooting" size={24} color="#F59E0B" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>DESIGNAR LÍDER DE FACCIÓN</Text>
                <Text style={styles.modalSubtitulo}>
                  Facción: {bandoSeleccionadoParaLider?.nombre}
                </Text>
              </View>
            </View>

            <Text style={styles.inputModalLabel}>SELECCIONA AL COMANDANTE:</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {/* Opción para quitar líder */}
              <TouchableOpacity
                style={[
                  styles.itemCandidatoLider,
                  !bandoSeleccionadoParaLider?.liderId && styles.itemCandidatoLiderActivo,
                ]}
                onPress={() => handleDesignarLider(null)}
              >
                <MaterialCommunityIcons name="account-remove" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <Text style={styles.txtCandidatoNombre}>Dejar sin líder asignado</Text>
              </TouchableOpacity>

              {/* Lista de operadores de esta facción u organizadores */}
              {jugadores
                .filter((j) => j.bandoId === bandoSeleccionadoParaLider?.id || j.jugadorId === evento.organizadorId)
                .map((cand) => {
                  const esActual = bandoSeleccionadoParaLider?.liderId === cand.jugadorId;
                  return (
                    <TouchableOpacity
                      key={cand.jugadorId}
                      style={[styles.itemCandidatoLider, esActual && styles.itemCandidatoLiderActivo]}
                      onPress={() => handleDesignarLider(cand.jugadorId)}
                    >
                      <MaterialCommunityIcons
                        name={esActual ? 'star' : 'account'}
                        size={18}
                        color={esActual ? '#F59E0B' : colors.primary}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.txtCandidatoNombre, esActual && { color: '#F59E0B', fontWeight: '900' }]}>
                          {cand.alias || `Operador #${cand.jugadorId}`}
                          {cand.jugadorId === evento.organizadorId ? ' (ORGANIZADOR)' : ''}
                        </Text>
                        <Text style={styles.txtCandidatoRol}>Rol: {cand.rol || 'ASALTO'}</Text>
                      </View>
                      {esActual && <Text style={{ color: '#F59E0B', fontWeight: '900' }}>ACTUAL</Text>}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => setModalLiderBandoVisible(false)}
              >
                <Text style={styles.modalTextoCancelar}>CERRAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PARA NOMBRAR CO-ORGANIZADOR */}
      <Modal
        visible={modalCoorganizadorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalCoorganizadorVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="account-multiple-plus" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>NOMBRAR CO-ORGANIZADOR</Text>
                <Text style={styles.modalSubtitulo}>
                  Otorga facultades de mando a otro operador inscrito:
                </Text>
              </View>
            </View>

            <Text style={styles.inputModalLabel}>OPERADORES INSCRITOS:</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {jugadores
                .filter(
                  (j) =>
                    j.jugadorId !== evento.organizadorId &&
                    !evento.coorganizadores?.some((co) => co.jugadorId === j.jugadorId),
                )
                .map((cand) => (
                  <TouchableOpacity
                    key={cand.jugadorId}
                    style={styles.itemCandidatoLider}
                    onPress={() => handleAgregarCoorganizador(cand.jugadorId)}
                  >
                    <MaterialCommunityIcons name="shield-account" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txtCandidatoNombre}>{cand.alias || `Operador #${cand.jugadorId}`}</Text>
                      <Text style={styles.txtCandidatoRol}>Rol: {cand.rol || 'ASALTO'}</Text>
                    </View>
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 11 }}>+ NOMBRAR</Text>
                  </TouchableOpacity>
                ))}

              {jugadores.filter(
                (j) =>
                  j.jugadorId !== evento.organizadorId &&
                  !evento.coorganizadores?.some((co) => co.jugadorId === j.jugadorId),
              ).length === 0 && (
                <Text style={styles.sinOperadores}>No hay operadores disponibles para nombrar.</Text>
              )}
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => setModalCoorganizadorVisible(false)}
              >
                <Text style={styles.modalTextoCancelar}>VOLVER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 0: TABLA DE LÍMITES DE CRONÓGRAFO (SOLO CRONO)     */}
      {/* ======================================================== */}
      <Modal
        visible={modalSoloCronoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalSoloCronoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="speedometer" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>LÍMITES DE CRONÓGRAFO OFICIAL</Text>
                <Text style={styles.modalSubtitulo}>Homologación de réplicas en terreno (BB 0.20g)</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 12 }}>
              <View style={styles.cronoTablaPreMision}>
                <View style={styles.cronoTablaFilaHeader}>
                  <Text style={[styles.cronoTablaColHeader, { flex: 1.2 }]}>CATEGORÍA</Text>
                  <Text style={[styles.cronoTablaColHeader, { flex: 1 }]}>MAX J</Text>
                  <Text style={[styles.cronoTablaColHeader, { flex: 1 }]}>~FPS</Text>
                  <Text style={[styles.cronoTablaColHeader, { flex: 0.9 }]}>MED</Text>
                  <Text style={[styles.cronoTablaColHeader, { flex: 1.1 }]}>DISPARO</Text>
                </View>
                {(evento.tacsop?.limitesCrono || [
                  { categoria: 'PISTOLA', maxJoules: 1.0, maxFps: 328, medMetros: 0, tipoDisparo: 'SEMI' },
                  { categoria: 'ASALTO', maxJoules: 1.49, maxFps: 400, medMetros: 5, tipoDisparo: 'SEMI_AUTO' },
                  { categoria: 'SOPORTE', maxJoules: 1.6, maxFps: 415, medMetros: 15, tipoDisparo: 'AUTO_RAFAGA' },
                  { categoria: 'DMR', maxJoules: 1.88, maxFps: 450, medMetros: 20, tipoDisparo: 'SEMI' },
                  { categoria: 'SNIPER', maxJoules: 2.81, maxFps: 550, medMetros: 30, tipoDisparo: 'CERROJO' },
                ]).map((lim: any) => (
                  <View key={lim.categoria} style={styles.cronoTablaFila}>
                    <Text style={[styles.cronoTablaCol, { flex: 1.2, fontWeight: '800' }]}>{lim.categoria}</Text>
                    <Text style={[styles.cronoTablaCol, { flex: 1, color: colors.primary }]}>{lim.maxJoules} J</Text>
                    <Text style={[styles.cronoTablaCol, { flex: 1 }]}>{lim.maxFps ? `${lim.maxFps}` : '-'}</Text>
                    <Text style={[styles.cronoTablaCol, { flex: 0.9, color: colors.warning }]}>{lim.medMetros}m</Text>
                    <Text style={[styles.cronoTablaCol, { flex: 1.1, fontSize: 9, color: colors.textMuted }]}>
                      {lim.tipoDisparo || '-'}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.txtAvisoPreMisionCrono, { marginTop: 10 }]}>
                * Toda réplica debe disparar dentro de los parámetros estipulados para su categoría. Las BBs de prueba del cronógrafo son de 0.20g.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalBotonCancelar}
              onPress={() => setModalSoloCronoVisible(false)}
            >
              <Text style={styles.modalTextoCancelar}>ENTENDIDO / CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 1: FICHA TACSOP DIGITAL COMPLETA                   */}
      {/* ======================================================== */}
      <Modal
        visible={modalTacsopVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalTacsopVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="shield-sword" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>TACSOP & REGLAMENTO DE MISIÓN</Text>
                <Text style={styles.modalSubtitulo}>
                  Preset: {evento.tacsop?.presetTipo || 'ESTÁNDAR'}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {/* Reglas Médicas */}
              <Text style={styles.tacsopModalSeccion}>SISTEMA MÉDICO & VIDAS</Text>
              <View style={styles.tacsopModalCard}>
                <Text style={styles.txtTacsopFila}>
                  • Vidas por operador: <Text style={styles.txtTacsopHighlight}>{evento.tacsop?.vidasMax ?? 2} vidas</Text>
                </Text>
                <Text style={styles.txtTacsopFila}>
                  • Torniquetes requeridos:{' '}
                  <Text style={styles.txtTacsopHighlight}>
                    {evento.tacsop?.requiereTorniquete
                      ? `SÍ (${evento.tacsop?.torniquetesPorJugador ?? 1} por operador)`
                      : 'NO'}
                  </Text>
                </Text>
                <Text style={styles.txtTacsopFila}>
                  • Tiempo de desangrado (bleed-out):{' '}
                  <Text style={styles.txtTacsopHighlight}>
                    {evento.tacsop?.tiempoDesangradoMin ?? 3} minutos
                  </Text>
                </Text>
                <Text style={styles.txtTacsopFila}>
                  • Quién revive:{' '}
                  <Text style={styles.txtTacsopHighlight}>
                    {evento.tacsop?.soloMedicoRevive ? 'Solo Médico con rol' : 'Cualquier operador (Buddy Aid)'}
                  </Text>
                </Text>
                <Text style={styles.txtTacsopFila}>
                  • Pañuelo Rojo/Naranja de Muerto:{' '}
                  <Text style={styles.txtTacsopHighlight}>
                    {evento.tacsop?.requierePanueloRojo !== false ? 'OBLIGATORIO SIEMPRE' : 'RECOMENDADO'}
                  </Text>
                </Text>
                <Text style={styles.txtTacsopFila}>
                  • Luz Roja Nocturna:{' '}
                  <Text style={styles.txtTacsopHighlight}>
                    {evento.tacsop?.luzRojaNocturna || 'RECOMENDADA'}
                  </Text>
                </Text>
              </View>

              {/* Cargadores y Munición */}
              <Text style={styles.tacsopModalSeccion}>MUNICIÓN Y CARGADORES</Text>
              <View style={styles.tacsopModalCard}>
                <Text style={styles.txtTacsopFila}>
                  • Tipo de cargadores:{' '}
                  <Text style={styles.txtTacsopHighlight}>{evento.tacsop?.tipoCargadores || 'LIBRE'}</Text>
                </Text>
                <Text style={styles.txtTacsopFila}>
                  • Límite de munición BBs:{' '}
                  <Text style={styles.txtTacsopHighlight}>
                    {evento.tacsop?.limiteMunicionBbs ? `${evento.tacsop.limiteMunicionBbs} BBs` : 'Sin límite'}
                  </Text>
                </Text>
                <Text style={styles.txtTacsopFila}>
                  • Pirotecnia sonora / detonaciones:{' '}
                  <Text style={styles.txtTacsopHighlight}>
                    {evento.tacsop?.pirotecniaPermitida ? 'PERMITIDA' : 'PROHIBIDA'}
                  </Text>
                </Text>
                <Text style={styles.txtTacsopFila}>
                  • Granadas de humo frío:{' '}
                  <Text style={styles.txtTacsopHighlight}>
                    {evento.tacsop?.humoFrioPermitido !== false ? 'PERMITIDO (Solo frío)' : 'PROHIBIDO'}
                  </Text>
                </Text>
              </View>

              {/* Límites de Crono */}
              <Text style={styles.tacsopModalSeccion}>LÍMITES DE CRONÓGRAFO (JOULES & MED)</Text>
              <View style={styles.tacsopModalCard}>
                {(evento.tacsop?.limitesCrono || [
                  { categoria: 'PISTOLA', maxJoules: 1.0, maxFps: 328, medMetros: 0, tipoDisparo: 'SEMI' },
                  { categoria: 'ASALTO', maxJoules: 1.49, maxFps: 400, medMetros: 5, tipoDisparo: 'SEMI_AUTO' },
                  { categoria: 'SOPORTE', maxJoules: 1.6, maxFps: 415, medMetros: 15, tipoDisparo: 'AUTO_RAFAGA' },
                  { categoria: 'DMR', maxJoules: 1.88, maxFps: 450, medMetros: 20, tipoDisparo: 'SEMI' },
                  { categoria: 'SNIPER', maxJoules: 2.81, maxFps: 550, medMetros: 30, tipoDisparo: 'CERROJO' },
                ]).map((lim) => (
                  <View key={lim.categoria} style={styles.filaModalCronoItem}>
                    <Text style={styles.txtCatCronoModal}>{lim.categoria}:</Text>
                    <Text style={styles.txtValCronoModal}>
                      {lim.maxJoules} J (~{lim.maxFps} FPS) | MED: {lim.medMetros}m ({lim.tipoDisparo})
                    </Text>
                  </View>
                ))}
              </View>

              {/* Plan de COMMS */}
              <Text style={styles.tacsopModalSeccion}>COMUNICACIONES BAOFENG UV-5R</Text>
              <View style={styles.tacsopModalCard}>
                <Text style={styles.txtTacsopFila}>
                  • Canal Emergencia (Blind Man):{' '}
                  <Text style={[styles.txtTacsopHighlight, { color: colors.danger }]}>
                    {evento.tacsop?.frecuenciaEmergencia || '462.5625 MHz'}
                  </Text>
                </Text>
                <Text style={styles.txtTacsopFila}>
                  • Canal Staff / Control:{' '}
                  <Text style={styles.txtTacsopHighlight}>
                    {evento.tacsop?.frecuenciaStaff || '462.5875 MHz'} (CTCSS: {evento.tacsop?.subtonoStaff || '67.0 Hz'})
                  </Text>
                </Text>
                {(esMasivo && !soyOrganizador && miBando?.bandoId
                  ? evento.bandos?.filter((b) => b.id === miBando.bandoId)
                  : evento.bandos
                )?.map((b) => (
                  <Text key={b.id} style={styles.txtTacsopFila}>
                    • Frecuencia {b.nombre}:{' '}
                    <Text style={styles.txtTacsopHighlight}>
                      {b.frecuenciaRadio || '462.6125 MHz'} {b.subtonoRadio ? `(CTCSS: ${b.subtonoRadio})` : ''}
                    </Text>
                  </Text>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.btnCerrarModalTacsop}
              onPress={() => setModalTacsopVisible(false)}
            >
              <Text style={styles.txtBtnCerrarModalTacsop}>ENTENDIDO, VOLVER A LA OPERACIÓN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: CRONAJE OFICIAL (STAFF)                         */}
      {/* ======================================================== */}
      <Modal
        visible={modalCronoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalCronoVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Pressable
              style={styles.modalHeaderQr}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <MaterialCommunityIcons name="speedometer" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>CRONÓGRAFO OFICIAL (STAFF)</Text>
                <Text style={styles.modalSubtitulo}>Registra y homologa réplicas en terreno</Text>
              </View>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginVertical: 6, width: '100%' }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Pressable onPress={Keyboard.dismiss} accessible={false}>
              {/* Selección del Operador */}
              <Text style={styles.inputModalLabel}>SELECCIONA EL OPERADOR:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {jugadores.map((j) => (
                  <TouchableOpacity
                    key={j.jugadorId}
                    style={[
                      styles.chipJugadorCrono,
                      cronoJugadorId === j.jugadorId && styles.chipJugadorCronoActivo,
                    ]}
                    onPress={() => setCronoJugadorId(j.jugadorId)}
                  >
                    <Text
                      style={[
                        styles.txtChipJugadorCrono,
                        cronoJugadorId === j.jugadorId && styles.txtChipJugadorCronoActivo,
                      ]}
                    >
                      {j.alias || `Op #${j.jugadorId}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Tipo de Réplica */}
              <Text style={styles.inputModalLabel}>TIPO DE RÉPLICA:</Text>
              <View style={styles.chipsRowSelectorCrono}>
                {(['PRIMARIA', 'PRIMARIA_2', 'SECUNDARIA'] as const).map((tr) => (
                  <TouchableOpacity
                    key={tr}
                    style={[
                      styles.chipTipoRep,
                      cronoTipoReplica === tr && styles.chipTipoRepActivo,
                    ]}
                    onPress={() => setCronoTipoReplica(tr)}
                  >
                    <Text
                      style={[
                        styles.txtChipTipoRep,
                        cronoTipoReplica === tr && styles.txtChipTipoRepActivo,
                      ]}
                    >
                      {tr === 'PRIMARIA' ? 'PRIMARIA' : tr === 'PRIMARIA_2' ? 'PRIMARIA 2' : 'SECUNDARIA'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Categoría Táctica */}
              <Text style={styles.inputModalLabel}>CATEGORÍA:</Text>
              <View style={styles.chipsRowSelectorCrono}>
                {['PISTOLA', 'ASALTO', 'SOPORTE', 'DMR', 'SNIPER'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chipTipoRep,
                      cronoCategoria === cat && styles.chipTipoRepActivo,
                    ]}
                    onPress={() => setCronoCategoria(cat)}
                  >
                    <Text
                      style={[
                        styles.txtChipTipoRep,
                        cronoCategoria === cat && styles.txtChipTipoRepActivo,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Mediciones: Joules, FPS y Gramaje */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputModalLabel}>ENERGÍA (JOULES):</Text>
                  <TextInput
                    style={styles.inputModal}
                    placeholder="Ej: 1.14"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={cronoJoules}
                    onChangeText={setCronoJoules}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputModalLabel}>FPS (OPCIONAL):</Text>
                  <TextInput
                    style={styles.inputModal}
                    placeholder="Ej: 350"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={cronoFps}
                    onChangeText={setCronoFps}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputModalLabel}>BBs (GRAMOS):</Text>
                  <TextInput
                    style={styles.inputModal}
                    placeholder="0.25"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={cronoGramaje}
                    onChangeText={setCronoGramaje}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputModalLabel}>MODELO (OPCIONAL):</Text>
                  <TextInput
                    style={styles.inputModal}
                    placeholder="Ej: M4 MK18"
                    placeholderTextColor={colors.textMuted}
                    value={cronoModelo}
                    onChangeText={setCronoModelo}
                  />
                </View>
              </View>

              {/* Aprobado / Rechazado */}
              <View style={styles.switchAprobadoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txtAprobadoTitulo}>ESTADO DE HOMOLOGACIÓN</Text>
                  <Text style={[styles.txtAprobadoSub, { color: cronoAprobado ? colors.success : colors.danger }]}>
                    {cronoAprobado ? 'Aprobada para entrar a la cancha' : 'Rechazada (Sobrepasa el límite)'}
                  </Text>
                </View>
                <Switch
                  value={cronoAprobado}
                  onValueChange={setCronoAprobado}
                  trackColor={{ false: colors.danger, true: colors.primary }}
                />
              </View>
              </Pressable>
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => {
                  Keyboard.dismiss();
                  setModalCronoVisible(false);
                }}
              >
                <Text style={styles.modalTextoCancelar}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBotonConfirmar, guardandoCrono && styles.botonDeshabilitado]}
                onPress={handleGuardarCrono}
                disabled={guardandoCrono}
              >
                {guardandoCrono ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTextoConfirmar}>GUARDAR CRONAJE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: MAPA TÁCTICO SATELITAL                          */}
      {/* ======================================================== */}
      <Modal
        visible={modalMapaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalMapaVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%', alignItems: 'center' }]}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="map-legend" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>MAPA TÁCTICO DEL TERRENO</Text>
                <Text style={styles.modalSubtitulo}>Cuadrícula satelital y puntos de control</Text>
              </View>
            </View>

            {evento.mapaTacticoUrl ? (
              <Image
                source={{ uri: evento.mapaTacticoUrl }}
                style={styles.imgMapaTacticoModal}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.sinMapaBox}>
                <Text style={styles.txtSinCrono}>No se ha cargado una imagen táctica del mapa.</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.btnCerrarModalTacsop}
              onPress={() => setModalMapaVisible(false)}
            >
              <Text style={styles.txtBtnCerrarModalTacsop}>CERRAR MAPA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: ALERTA TÁCTICA BLIND MAN / ALTO AL FUEGO        */}
      {/* ======================================================== */}
      <Modal
        visible={modalBlindManVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalBlindManVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBlindManCard}>
            <MaterialCommunityIcons name="alert-octagon" size={48} color={colors.danger} />
            <Text style={styles.tituloBlindMan}>¡ALTO AL FUEGO INMEDIATO!</Text>
            <Text style={styles.subtituloBlindMan}>PROCEDIMIENTO DE EMERGENCIA TÁCTICA</Text>

            <Text style={styles.txtBlindManDesc}>
              En caso de accidente real, presencia de civiles sin protección ocular o emergencia médica en la cancha:
            </Text>

            <View style={styles.blindManInstruccionesBox}>
              <Text style={styles.txtBlindManPaso}>1. Grita en voz alta: "¡BLIND MAN! ¡ALTO AL FUEGO!"</Text>
              <Text style={styles.txtBlindManPaso}>2. Pon tu réplica en SEGURO apuntando al suelo.</Text>
              <Text style={styles.txtBlindManPaso}>
                3. Sintoniza el canal de radio de emergencia:
              </Text>
              <Text style={styles.frecuenciaBlindManDestacada}>
                {evento.tacsop?.frecuenciaEmergencia || '462.5625 MHz'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.btnCerrarBlindMan}
              onPress={() => setModalBlindManVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.txtBtnCerrarBlindMan}>ENTERADO • PROTOCOLO COMPRENDIDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: NUEVA ORDEN DE MISIÓN TÁCTICA (ORGANIZADOR)     */}
      {/* ======================================================== */}
      <Modal
        visible={modalMisionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalMisionVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
          <View style={[styles.modalContent, { maxHeight: '88%' }]}>
            <Pressable
              style={styles.modalHeaderQr}
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <MaterialCommunityIcons name="target" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>ASIGNAR ORDEN DE MISIÓN</Text>
                <Text style={styles.modalSubtitulo}>Directiva táctica de combate para facciones</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setModalMisionVisible(false);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginVertical: 8, width: '100%' }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Pressable onPress={Keyboard.dismiss} accessible={false}>
              {/* 1. Nombre / Título de la Misión */}
              <Text style={styles.lblFormMision}>NOMBRE DE LA MISIÓN:</Text>
              <TextInput
                style={styles.inputMision}
                placeholder="Ej: Captura de Puesto Radio Echo"
                placeholderTextColor={colors.textMuted}
                value={misionTitulo}
                onChangeText={setMisionTitulo}
                returnKeyType="done"
              />

              {/* 2. Facción Destinataria */}
              <Text style={styles.lblFormMision}>FACCIÓN DESTINATARIA:</Text>
              <View style={styles.selectorFaccionesMisionRow}>
                {(evento.bandos || []).map((b) => {
                  const sel = misionBandoId === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.chipBandoMision,
                        sel && { borderColor: b.colorHex || colors.primary, backgroundColor: 'rgba(255,255,255,0.08)' },
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setMisionBandoId(b.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.colorDotMini, { backgroundColor: b.colorHex || colors.primary }]} />
                      <Text style={[styles.txtChipBandoMision, sel && { color: b.colorHex || colors.primary, fontWeight: 'bold' }]}>
                        {b.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 3. Briefing Confidencial para el Líder de Facción */}
              <Text style={styles.lblFormMision}>
                BRIEFING CONFIDENCIAL PARA EL LÍDER:
              </Text>
              <Text style={styles.lblAyudaMision}>
                Solo el líder de la facción podrá ver estas directivas e instrucciones clasificadas.
              </Text>
              <TextInput
                style={[styles.inputMision, styles.inputMisionMultilinea]}
                placeholder="Coordenadas exactas, objetivos secundarios, condiciones de extracción o información confidencial..."
                placeholderTextColor={colors.textMuted}
                value={misionDescLider}
                onChangeText={setMisionDescLider}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={Keyboard.dismiss}
              />

              {/* 4. Orden General para Operadores */}
              <Text style={styles.lblFormMision}>
                ORDEN GENERAL PARA LOS OPERADORES:
              </Text>
              <Text style={styles.lblAyudaMision}>
                Directiva visible para todos los miembros de la facción en su radar de combate.
              </Text>
              <TextInput
                style={[styles.inputMision, styles.inputMisionMultilinea]}
                placeholder="Orden táctica visible para toda la tropa (ej: Avanzar a sector norte y asegurar perímetro)..."
                placeholderTextColor={colors.textMuted}
                value={misionDescOperadores}
                onChangeText={setMisionDescOperadores}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={Keyboard.dismiss}
              />

              {/* 5. Foto o Mapa Táctico Adjunto para el Líder */}
              <Text style={styles.lblFormMision}>
                FOTO ADJUNTA / CROQUIS PARA EL LÍDER (OPCIONAL):
              </Text>
              <Text style={styles.lblAyudaMision}>
                Adjunta una evidencia o croquis desde tu galería o captura una foto del terreno.
              </Text>

              {misionFotoUrl ? (
                <View style={styles.previewFotoAdjuntaBox}>
                  <Image source={{ uri: misionFotoUrl }} style={styles.imgFotoAdjuntaPreview} resizeMode="cover" />
                  <View style={styles.accionesFotoAdjuntaRow}>
                    <TouchableOpacity
                      style={styles.btnCambiarFotoAdjunta}
                      onPress={handleSeleccionarFotoMisionGaleria}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="image-edit" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.txtBtnCambiarFotoAdjunta}>Cambiar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnQuitarFotoAdjunta}
                      onPress={handleQuitarFotoMision}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                      <Text style={styles.txtBtnQuitarFotoAdjunta}>Quitar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.botonesAdjuntarFotoRow}>
                  <TouchableOpacity
                    style={styles.btnAdjuntarGaleria}
                    onPress={handleSeleccionarFotoMisionGaleria}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="image-plus" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnAdjuntarFoto}>GALERÍA</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnAdjuntarCamara}
                    onPress={handleTomarFotoMisionCamara}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="camera" size={18} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnAdjuntarFotoCamara}>TOMAR FOTO</Text>
                  </TouchableOpacity>
                </View>
              )}
              </Pressable>
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => {
                  Keyboard.dismiss();
                  setModalMisionVisible(false);
                }}
              >
                <Text style={styles.modalTextoCancelar}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBotonConfirmar, guardandoMision && styles.botonDeshabilitado, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={handleCrearMision}
                disabled={guardandoMision}
              >
                {guardandoMision ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="radio-tower" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.modalTextoConfirmar}>TRANSMITIR MISIÓN</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 6: VISOR DE FOTO / MAPA DE MISIÓN TÁCTICA          */}
      {/* ======================================================== */}
      <Modal
        visible={modalFotoMisionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalFotoMisionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%', alignItems: 'center' }]}>
            <View style={styles.modalHeaderQr}>
              <MaterialCommunityIcons name="image" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitulo}>FOTO TÁCTICA ADJUNTA</Text>
                <Text style={styles.modalSubtitulo}>Croquis clasificado para el mando</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalFotoMisionVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {fotoMisionSeleccionada ? (
              <Image
                source={{ uri: fotoMisionSeleccionada }}
                style={styles.imgFotoMisionGrande}
                resizeMode="contain"
              />
            ) : null}

            <TouchableOpacity
              style={styles.btnCerrarModalTacsop}
              onPress={() => setModalFotoMisionVisible(false)}
            >
              <Text style={styles.txtBtnCerrarModalTacsop}>CERRAR FOTO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Táctico Unificado para Confirmaciones y Avisos */}
      <ModalConfirmacionTactico
        visible={modalTactico.visible}
        titulo={modalTactico.titulo}
        mensaje={modalTactico.mensaje}
        textoConfirmar={modalTactico.textoConfirmar}
        textoCancelar={modalTactico.textoCancelar}
        tipo={modalTactico.tipo}
        icono={modalTactico.icono}
        soloAceptar={modalTactico.soloAceptar}
        cargando={modalTactico.cargando}
        onConfirmar={modalTactico.onConfirmar || (() => setModalTactico((prev) => ({ ...prev, visible: false })))}
        onCancelar={modalTactico.onCancelar || (() => setModalTactico((prev) => ({ ...prev, visible: false })))}
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
    alignItems: 'center',
    marginBottom: 8,
  },
  tagTipo: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  tagsDerechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeAlistadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 161, 105, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txtBadgeAlistadoHeader: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  estadoTagBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  estadoTagProgramado: {
    borderColor: colors.primary,
  },
  estadoTagEnCurso: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  estadoTagFinalizado: {
    borderColor: colors.success,
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
  },
  estadoTagCancelado: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
  },
  estadoTagTexto: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
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
  metaTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  badgeInscripcionesRow: {
    marginTop: 6,
    marginBottom: 8,
  },
  badgeInscripcionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeInscripcionAbierta: {
    backgroundColor: 'rgba(56, 161, 105, 0.1)',
    borderColor: 'rgba(56, 161, 105, 0.3)',
  },
  badgeInscripcionCerrada: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  txtBadgeInscripcion: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  codigoBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
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
    gap: 3,
  },
  badgePrivacidadCerrado: {
    backgroundColor: 'rgba(214, 158, 46, 0.15)',
  },
  badgePrivacidadAbierto: {
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
  },
  textoPrivacidadSmall: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  codigoValor: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 4,
  },
  codigoAyuda: {
    color: colors.textMuted,
    fontSize: 11,
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
  btnBajarseOperacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    paddingVertical: 10,
    marginTop: 12,
  },
  txtBtnBajarseOperacion: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    lineHeight: 18,
  },
  panelOrganizadorCard: {
    backgroundColor: 'rgba(56, 161, 105, 0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 161, 105, 0.35)',
    marginBottom: 16,
  },
  panelOrganizadorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  panelOrganizadorHeaderTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelOrganizadorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  panelOrganizadorSubtitulo: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  panelOrganizadorTitulo: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  panelOrganizadorDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 12,
  },
  panelOrganizadorBotones: {
    gap: 8,
  },
  btnToggleInscripciones: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  btnReabrirInscripciones: {
    backgroundColor: '#059669',
  },
  txtBtnToggleInscripciones: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  coorganizadoresBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  coorganizadoresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  txtCoorganizadoresTitulo: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listaCoorganizadores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chipCoorganizador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  txtChipCoorganizador: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  txtSinCoorganizadores: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  btnAgregarCoorganizador: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  txtBtnAgregarCoorganizador: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 3,
  },
  panelLiderFaccionCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 16,
  },
  tituloPanelLiderFaccion: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  descPanelLiderFaccion: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  btnIniciarEventoPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  textoBtnIniciarEventoPrincipal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnGenerarQrComandante: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  textoBtnGenerarQr: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  btnFinalizarEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C53030',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  textoBtnFinalizarEvento: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  panelBotonesSecundarios: {
    flexDirection: 'row',
    gap: 8,
  },
  btnModificarEvento: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 9,
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
  btnCancelarEvento: {
    flex: 1,
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  textoBtnCancelar: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  bannerEventoFinalizado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 158, 46, 0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.warning,
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
  seccionHeaderPartidas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  btnNuevaPartidaMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  txtNuevaPartidaMini: {
    color: colors.primary,
    fontSize: 10,
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
  avisoHistorialEnCurso: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 161, 105, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 161, 105, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  txtAvisoHistorialEnCurso: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  partidaCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: 8,
  },
  partidaCardFinalizada: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderLeftColor: '#10B981',
    backgroundColor: '#0F1D17',
  },
  partidaCardEnCurso: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderLeftColor: colors.danger,
    backgroundColor: '#1E1212',
  },
  partidaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partidaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  partidaNombre: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  badgeModalidad: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txtBadgeModalidad: {
    color: colors.primary,
    fontSize: 9,
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
  cardPartidaAlineacionBox: {
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardPartidaAlineacionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  txtCardPartidaAlineacionHeader: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardPartidaAlineacionRow: {
    flexDirection: 'row',
  },
  cardPartidaBandoCol: {
    flex: 1,
  },
  cardPartidaAlineacionDiv: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 8,
  },
  txtCardPartidaBandoNombre: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  txtCardPartidaJugador: {
    color: colors.text,
    fontSize: 11,
    marginBottom: 2,
  },
  txtCardPartidaRol: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },
  cardPartidaMvpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  txtCardPartidaMvpPill: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 3,
  },
  badgeEstadoVotacionMvp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  txtEstadoVotacionMvp: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  partidaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rondasConteo: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  btnEntrarRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 8,
  },
  bandoHeaderTouch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  bandoContenidoDesplegable: {
    marginTop: 8,
  },
  badgeTuBandoMini: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  txtBadgeTuBandoMini: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
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
  liderFaccionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  txtLiderFaccion: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
  },
  txtLiderFaccionDestacado: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  btnDesignarLiderMini: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtBtnDesignarLiderMini: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  bandoActualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bandoActualBadge: {
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  txtBandoActual: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  btnBajarseBandoMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 28,
    justifyContent: 'center',
  },
  txtBtnBajarseBandoMini: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  botonUnirseBando: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  textoBotonUnirse: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerInscripcionCerradaMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  txtBannerInscripcionCerradaMini: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  escuadrasSectionBox: {
    marginTop: 4,
  },
  escuadrasHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  txtEscuadrasHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnHabilitarEscuadrasMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  txtBtnHabilitarEscuadrasMini: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  btnCrearEscuadraMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  txtBtnCrearEscuadraMini: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  badgeInscripcionAbiertaEscuadras: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  txtBadgeInscripcionAbiertaEscuadras: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  sinEscuadrasBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  txtSinEscuadras: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  cardEscuadra: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  headerEscuadra: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nombreEscuadra: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  dotacionEscuadra: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  btnEliminarEscuadraIcon: {
    padding: 4,
  },
  listaOperadoresEscuadra: {
    marginBottom: 6,
    gap: 2,
  },
  sinOperadoresEscuadra: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  operadorEscuadraItem: {
    color: colors.text,
    fontSize: 11,
  },
  escuadraActualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  badgeTuEscuadra: {
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  txtTuEscuadra: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  btnSalirEscuadraMini: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  txtBtnSalirEscuadraMini: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
  },
  btnUnirseEscuadra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 6,
    minHeight: 34,
    paddingVertical: 8,
    marginTop: 4,
  },
  txtBtnUnirseEscuadra: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  boxReservasFaccion: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  txtTituloReservas: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  txtListaReservas: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  jugadoresList: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
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
    lineHeight: 16,
    marginBottom: 10,
  },
  btnAlistarsePichangaMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
  },
  txtAlistarsePichangaMini: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeTuPerfilMini: {
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  txtTuPerfilMini: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  jugadorInscritoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSinAsignar: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginTop: 10,
  },
  headerSinAsignar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tituloSinAsignar: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  descSinAsignar: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 6,
  },
  cardRecordatorios: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 16,
  },
  recordatoriosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recordatoriosTitulo: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  recordatoriosDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  filaSwitchRecordatorio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  txtTituloSwitchRecordatorio: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  txtSubSwitchRecordatorio: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  avisoNotifDesactivadasGlobal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  txtAvisoNotifDesactivadasGlobal: {
    flex: 1,
    color: colors.warning,
    fontSize: 11,
    lineHeight: 15,
  },
  bannerEventoCanceladoGlobal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: 16,
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
    marginTop: 2,
  },
  bannerEventoFinalizadoGlobal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 16,
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
    marginTop: 2,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalContentQr: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  modalHeaderQr: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  modalTitulo: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalSubtitulo: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  rolesModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  rolModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rolModalChipActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
  },
  rolModalTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  rolModalTextoActivo: {
    color: colors.primary,
  },
  rolModalCheck: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 4,
  },
  modalBotones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalBotonCancelar: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    minHeight: 46,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTextoCancelar: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  modalBotonConfirmar: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 46,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTextoConfirmar: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  inputModalLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  inputModal: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  inputModalArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  itemMotivoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  itemMotivoChipActivo: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  txtMotivoChip: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  txtMotivoChipActivo: {
    color: '#fff',
  },
  btnConfirmarCancelarEvento: {
    flex: 2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  txtConfirmarCancelarEvento: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  qrTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
    width: '100%',
  },
  qrTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 6,
  },
  qrTabBtnActivo: {
    backgroundColor: colors.primary,
  },
  qrTabTxt: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  qrTabTxtActivo: {
    color: '#000',
  },
  bandoSelectorQrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    width: '100%',
  },
  chipBandoQr: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  dotBando: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txtChipBando: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  qrContainerBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrCodigoFooter: {
    alignItems: 'center',
    marginTop: 8,
  },
  qrCodigoSub: {
    color: '#666',
    fontSize: 9,
    fontWeight: '800',
  },
  qrCodigoText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    marginVertical: 2,
  },
  qrInstruccion: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
  },
  btnCompartirModal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
  },
  itemModalidadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  itemModalidadCardActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.1)',
  },
  txtModalidadNombre: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  txtModalidadNombreActivo: {
    color: colors.primary,
  },
  txtModalidadDesc: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  botonesCantidadRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  btnChipCantidad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingVertical: 8,
  },
  btnChipCantidadActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
  },
  txtChipCantidad: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  txtChipCantidadActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  itemCandidatoLider: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  itemCandidatoLiderActivo: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  txtCandidatoNombre: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  txtCandidatoRol: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  terrenoGpsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  terrenoGpsTitulo: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  terrenoGpsCoords: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  terrenoGpsDir: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  terrenoGpsBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  btnGpsApp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34A853',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  txtBtnGpsApp: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hudTacticoContainer: {
    marginBottom: 12,
    gap: 10,
  },
  boxAltoAlFuegoBottom: {
    marginTop: 18,
    marginBottom: 28,
  },
  btnBlindManAlert: {
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    padding: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  blindManFranjaPeligro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  blindManIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blindManTextosCol: {
    flex: 1,
  },
  txtAlertaEmergenciaHeader: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  txtBtnBlindManAlert: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  txtAlertaEmergenciaSub: {
    color: '#FECACA',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  baofengHudCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  baofengHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  baofengTitulo: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  baofengCanalesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  baofengCanalBox: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
  },
  baofengCanalEtiqueta: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  baofengCanalFrec: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  baofengCanalSubtono: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  fasesHudCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  fasesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  fasesHeaderTitulo: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  listaFasesRow: {
    gap: 6,
  },
  itemFaseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemFaseBoxActiva: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.1)',
  },
  itemFaseBoxCompletada: {
    opacity: 0.6,
  },
  txtFaseNombre: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  txtFaseNombreActiva: {
    color: colors.primary,
  },
  badgeFaseEnCurso: {
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txtBadgeFaseEnCurso: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
  badgeFaseCrono: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txtBadgeFaseCrono: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: '800',
  },
  txtFaseDesc: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  btnActivarFase: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  txtBtnActivarFase: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  accesosTacsopRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnAccesoTacsop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  txtBtnAccesoTacsop: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  cronoSeccionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  cronoSeccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  txtCronoSeccionTitulo: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnRegistrarCronoStaff: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  txtBtnRegistrarCronoStaff: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  sinCronoBox: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  txtSinCrono: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  listaMisReplicas: {
    gap: 6,
  },
  itemReplicaCronada: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 8,
  },
  txtTipoReplica: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  txtCatReplica: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  badgeAprobadoCrono: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRechazadoCrono: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  txtBadgeAprobadoCrono: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '900',
  },
  txtStatsCrono: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  tacsopModalSeccion: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 4,
  },
  tacsopModalCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginBottom: 8,
  },
  txtTacsopFila: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 18,
  },
  txtTacsopHighlight: {
    color: colors.text,
    fontWeight: '800',
  },
  filaModalCronoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  txtCatCronoModal: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  txtValCronoModal: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  btnCerrarModalTacsop: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  txtBtnCerrarModalTacsop: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chipJugadorCrono: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  chipJugadorCronoActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
  },
  txtChipJugadorCrono: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  txtChipJugadorCronoActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  chipsRowSelectorCrono: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chipTipoRep: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipTipoRepActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
  },
  txtChipTipoRep: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  txtChipTipoRepActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  switchAprobadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginTop: 8,
  },
  txtAprobadoTitulo: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  txtAprobadoSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  imgMapaTacticoModal: {
    width: '100%',
    height: 350,
    borderRadius: 8,
    marginVertical: 10,
  },
  sinMapaBox: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlindManCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.danger,
    padding: 20,
    alignItems: 'center',
    width: '90%',
  },
  tituloBlindMan: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 8,
  },
  subtituloBlindMan: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  txtBlindManDesc: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  blindManInstruccionesBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    gap: 6,
  },
  txtBlindManPaso: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  frecuenciaBlindManDestacada: {
    color: colors.danger,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  btnCerrarBlindMan: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  txtBtnCerrarBlindMan: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Estilos Tácticos Dinámicos: Pre-Misión & Crono en Vivo
  preMisionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  preMisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 8,
  },
  preMisionTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  preMisionTitulo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgePresetTacsop: {
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  txtBadgePresetTacsop: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  preMisionSubseccion: {
    marginTop: 8,
    marginBottom: 6,
  },
  preMisionSubseccionTitulo: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cronoTablaPreMision: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
  },
  cronoTablaFilaHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 4,
    marginBottom: 4,
  },
  cronoTablaColHeader: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  cronoTablaFila: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  cronoTablaCol: {
    color: colors.text,
    fontSize: 11,
  },
  txtAvisoPreMisionCrono: {
    color: colors.textMuted,
    fontSize: 9,
    fontStyle: 'italic',
    marginTop: 4,
  },
  chipsReglasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipRegla: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
  },
  txtChipRegla: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  cronoFaseCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.warning,
    padding: 14,
    marginBottom: 12,
  },
  cronoFaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 8,
  },
  cronoFaseTitulo: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cronoFaseSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  badgeFaseCronoActiva: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  txtBadgeFaseCronoActiva: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  staffCronoBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginVertical: 6,
  },
  txtStaffCronoCount: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  btnCronoStaffGrande: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  txtBtnCronoStaffGrande: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  alertaCronoPendiente: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  txtAlertaCronoPendienteTitulo: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 2,
  },
  txtAlertaCronoPendiente: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  btnAlistamientoMilsimPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  txtBtnAlistamientoMilsimPrincipal: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtSubBtnAlistamientoMilsimPrincipal: {
    color: 'rgba(0,0,0,0.7)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  modalContentAlistamiento: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerAlistamiento: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tituloAlistamiento: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCircleCompletado: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  txtStepNumber: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  txtStepNumberActivo: {
    color: '#000',
  },
  txtStepLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  txtStepLabelActivo: {
    color: colors.primary,
  },
  txtStepLabelCompletado: {
    color: colors.success,
  },
  cuerpoPasoAlistamiento: {
    paddingVertical: 4,
  },
  subtituloPasoAlistamiento: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  descPasoAlistamiento: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  tacsopBoxAlistamiento: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginBottom: 10,
  },
  tacsopBoxTitulo: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tablaCronoAlistamiento: {
    gap: 4,
  },
  filaCronoAlistamiento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  colCatCrono: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    width: 65,
  },
  colStatsCrono: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  reglaItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  txtReglaItem: {
    color: colors.textSecondary,
    fontSize: 10,
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginTop: 4,
    gap: 10,
  },
  checkboxContainerAceptado: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  txtCheckbox: {
    color: colors.textSecondary,
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  txtCheckboxAceptado: {
    color: '#fff',
    fontWeight: '600',
  },
  cardReplicaAlistamiento: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  headerReplicaAlistamiento: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    paddingBottom: 6,
  },
  txtTipoReplicaHeader: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  labelCampoReplica: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
    marginTop: 4,
  },
  rolesGridReplica: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  chipCatReplica: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipCatReplicaActivo: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: colors.primary,
  },
  txtChipCatReplica: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  txtChipCatReplicaActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  inputReplicaModelo: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#fff',
    fontSize: 11,
  },
  inputReplicaFps: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  cajaJoulesCalculados: {
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
  },
  txtSubJoules: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  txtJoulesCalculados: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  botonesAgregarReplicasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  btnAgregarReplicaMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  txtBtnAgregarReplicaMini: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  cardBandoAlistamiento: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  cardBandoAlistamientoSeleccionado: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  cardBandoAlistamientoLleno: {
    opacity: 0.5,
  },
  dotBandoAlistamiento: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  nombreBandoAlistamiento: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  liderBandoAlistamiento: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  cupoBandoAlistamiento: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  badgeCupoLleno: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },
  badgeSeleccionado: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  resumenAlistamientoCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  filaResumenItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  lblResumen: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  valResumenDestacado: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  valResumen: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  notificacionesAlistamientoBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  tituloNotifAlistamiento: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  descNotifAlistamiento: {
    color: colors.textSecondary,
    fontSize: 10,
    marginBottom: 10,
    lineHeight: 14,
  },
  switchNotifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  txtSwitchNotifTitulo: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  txtSwitchNotifDesc: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 1,
  },
  footerAlistamientoBotones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  btnVolverAlistamiento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtBtnVolverAlistamiento: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  btnSiguienteAlistamiento: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  txtBtnSiguienteAlistamiento: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnFinalizarAlistamiento: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  txtBtnFinalizarAlistamiento: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnSiguienteFaseMilsim: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  txtBtnSiguienteFaseMilsim: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtSubBtnSiguienteFaseMilsim: {
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  btnAgregarReplicaStaffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  txtBtnAgregarReplicaStaffHeader: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  cronoBuscadorStaffBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  inputCronoBuscadorStaff: {
    flex: 1,
    color: '#fff',
    fontSize: 11,
    paddingVertical: 0,
  },
  tarjetaOperadorCronoStaff: {
    backgroundColor: '#181818',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerOperadorCronoStaff: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 6,
  },
  colorDotMini: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txtAliasCronoStaff: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  txtRolCronoStaff: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  badgeAprobadoCronoMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeVerde: {
    backgroundColor: '#064e3b',
  },
  badgeAmarillo: {
    backgroundColor: '#78350f',
  },
  badgeRojo: {
    backgroundColor: '#7f1d1d',
  },
  txtBadgeCronoMini: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  sinReplicasCronoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  txtSinReplicasCrono: {
    color: colors.textMuted,
    fontSize: 10,
  },
  btnAgregarReplicaStaffMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  txtBtnAgregarReplicaStaffMini: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 2,
  },
  filaReplicaCronoStaff: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 6,
    borderRadius: 4,
  },
  txtTipoReplicaStaff: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  txtDetalleReplicaStaff: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 1,
  },
  inputFpsRapido: {
    width: 58,
    height: 28,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 0,
  },
  btnAccionCronoRapida: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAprobarCronoRapido: {
    backgroundColor: '#10B981',
  },
  btnRechazarCronoRapido: {
    backgroundColor: '#EF4444',
  },
  btnEliminarCronoMini: {
    padding: 4,
  },
  bannerCronoHabilitado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    padding: 10,
  },
  txtBannerCronoHabilitadoTitulo: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtBannerCronoHabilitadoDesc: {
    color: '#d1fae5',
    fontSize: 10,
    marginTop: 2,
  },
  bannerCronoPendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451a03',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: 10,
  },
  txtBannerCronoPendienteTitulo: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtBannerCronoPendienteDesc: {
    color: '#fef3c7',
    fontSize: 10,
    marginTop: 2,
  },
  bannerCronoEscuadraHabilitado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  txtBannerCronoEscuadraHabilitado: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  bannerCronoEscuadraPendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  txtBannerCronoEscuadraPendiente: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  badgeFase0Escuadras: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txtBadgeFase0Escuadras: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  seccionFasesOrganizador: {
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  seccionFasesOrganizadorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  txtFasesOrganizadorTitulo: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemFaseBoxActivaVerde: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  txtFaseNombreActivaVerde: {
    color: '#10B981',
    fontWeight: '800',
  },
  badgeFaseActivaVerde: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  txtBadgeFaseActivaVerde: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  seccionConfiguracionDesplegable: {
    marginTop: 6,
    marginBottom: 4,
  },
  btnAbrirConfiguracion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1b1b1b',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  txtBtnAbrirConfiguracion: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  boxContenidoConfiguracion: {
    marginTop: 6,
    backgroundColor: '#141414',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  btnReabrirInscripcionesConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  txtBtnReabrirInscripcionesConfig: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnModificarEventoConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  txtBtnModificarEventoConfig: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnFinalizarEventoConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  txtBtnFinalizarEventoConfig: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnCancelarEventoConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  txtBtnCancelarEventoConfig: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Estilos de Misiones Tácticas (Fase 2)
  cardMisionesOrg: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  headerMisionesOrg: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  txtTituloMisionesOrg: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnNuevaMisionMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  txtBtnNuevaMisionMini: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  sinMisionesBox: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    marginTop: 4,
    paddingHorizontal: 12,
  },
  txtSinMisiones: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  btnAsignarPrimeraMision: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  txtBtnAsignarPrimeraMision: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemMisionOrg: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemMisionOrgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  txtItemMisionBando: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  txtItemMisionTitulo: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  badgeEstadoMision: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  badgeMisionActiva: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  badgeMisionCompletada: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  txtBadgeEstadoMision: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
  },
  txtItemMisionDescLider: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  txtItemMisionDescOp: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  btnVerFotoMini: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  txtBtnVerFotoMini: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  accionesMisionOrgRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  btnCompletarMisionMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  txtBtnCompletarMisionMini: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  btnCancelarMisionMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  txtBtnCancelarMisionMini: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Vista Líder
  cardMisionLiderVacia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginVertical: 6,
  },
  txtMisionLiderVaciaTitulo: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  txtMisionLiderVaciaDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  cardMisionLiderActiva: {
    backgroundColor: '#131b14',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#10B981',
    marginVertical: 6,
  },
  headerMisionLiderActiva: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  txtHeaderMisionLiderEtiqueta: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtMisionLiderTitulo: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cajaBriefingClasificadoLider: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    marginBottom: 12,
  },
  txtTituloBriefingClasificado: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  txtCuerpoBriefingClasificado: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
  },
  seccionFotoMisionLider: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  touchFotoMisionLider: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    height: 160,
    backgroundColor: '#000',
  },
  imgMisionLiderPreview: {
    width: '100%',
    height: '100%',
  },
  overlayAmpliarFoto: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  txtAmpliarFoto: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cajaOrdenTropasLider: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: 12,
  },
  txtTituloOrdenTropas: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  txtCuerpoOrdenTropas: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  btnReportarCumplimientoLider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
  },
  txtBtnReportarCumplimientoLider: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Vista Operador
  cardMisionOpVacia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 6,
  },
  txtMisionOpVaciaTitulo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  txtMisionOpVaciaDesc: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  cardMisionOpActiva: {
    backgroundColor: '#121a15',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginVertical: 6,
  },
  headerMisionOpActiva: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  txtHeaderMisionOpEtiqueta: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtMisionOpTitulo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  cajaMisionOpContenido: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  txtCuerpoMisionOp: {
    color: '#F3F4F6',
    fontSize: 13,
    lineHeight: 19,
  },
  // Formulario Modal Misión
  lblFormMision: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  lblAyudaMision: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 6,
  },
  inputMision: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  inputMisionMultilinea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  selectorFaccionesMisionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chipBandoMision: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  txtChipBandoMision: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 6,
  },
  imgFotoMisionGrande: {
    width: '100%',
    height: '75%',
    marginVertical: 10,
    borderRadius: 10,
  },
  badgeFaseDebriefingCerrada: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  txtBadgeFaseDebriefingCerrada: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  previewFotoAdjuntaBox: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  imgFotoAdjuntaPreview: {
    width: '100%',
    height: 140,
  },
  accionesFotoAdjuntaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnCambiarFotoAdjunta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txtBtnCambiarFotoAdjunta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnQuitarFotoAdjunta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txtBtnQuitarFotoAdjunta: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
  },
  botonesAdjuntarFotoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  btnAdjuntarGaleria: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  txtBtnAdjuntarFoto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnAdjuntarCamara: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  txtBtnAdjuntarFotoCamara: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
