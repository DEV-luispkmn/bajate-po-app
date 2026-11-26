import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { ModalConfirmacionTactico } from '../../components/ModalConfirmacionTactico';
import {
  obtenerPartidaApi,
  cambiarEstadoPartidaApi,
  registrarRondaApi,
  votarMvpPartidaApi,
  unirsePartidaApi,
  evaluarFamaApi,
  obtenerMisEvaluacionesFamaApi,
  CATEGORIAS_REPORTES,
  CATEGORIAS_RECONOCIMIENTOS,
  TipoEvaluacionFama,
  EvaluacionFamaItem,
  Ronda,
  Partida,
  JugadorPartidaInfo,
  MvpInfo,
} from '../../api/partidas.service';
import { obtenerEstiloFama } from '../../utils/fama.util';
import { limpiarRecordatoriosDePartida } from '../../services/deviceNotifications.service';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export const PartidaEnVivoScreen = () => {
  const route = useRoute<any>();
  const partidaId = route.params?.partidaId;
  const tituloInicial = route.params?.titulo || 'Partida en Vivo';

  const { socket, conectado, unirseASalaPartida, salirDeSalaPartida } = useSocket();
  const { jugador } = useAuth();

  const [partida, setPartida] = useState<Partida | null>(null);
  const [rondas, setRondas] = useState<Ronda[]>([]);
  const [marcador, setMarcador] = useState<Record<number, number>>({});
  const [bandos, setBandos] = useState<{ id: number; nombre: string; colorHex?: string }[]>([]);
  const [estadoPartida, setEstadoPartida] = useState<'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA'>('PENDIENTE');
  const [esOrganizador, setEsOrganizador] = useState(false);
  const [tituloPartida, setTituloPartida] = useState(tituloInicial);
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [jugadoresPartida, setJugadoresPartida] = useState<JugadorPartidaInfo[]>([]);
  const [mvps, setMvps] = useState<MvpInfo[]>([]);
  const [modalMvpVisible, setModalMvpVisible] = useState(false);
  const [votandoMvp, setVotandoMvp] = useState(false);
  const [haVotadoMvp, setHaVotadoMvp] = useState(false);
  const [uniendosePartida, setUniendosePartida] = useState(false);

  // Estados del Sistema de Fama
  const [misEvaluacionesFama, setMisEvaluacionesFama] = useState<Record<number, EvaluacionFamaItem>>({});
  const [modalFamaVisible, setModalFamaVisible] = useState(false);
  const [candidatoEvaluacion, setCandidatoEvaluacion] = useState<JugadorPartidaInfo | null>(null);
  const [tipoEvaluacion, setTipoEvaluacion] = useState<TipoEvaluacionFama>('RECONOCIMIENTO');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('HONESTO');
  const [enviandoEvaluacion, setEnviandoEvaluacion] = useState(false);

  // Modal Táctico Unificado
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

  // 1. Cargar datos de la partida desde el backend
  const cargarPartida = async () => {
    if (!partidaId) return;
    try {
      const res = await obtenerPartidaApi(partidaId);
      setPartida(res.partida);
      // Las rondas en orden cronológico inverso para el feed en vivo
      setRondas(res.partida.rondas ? [...res.partida.rondas].reverse() : []);
      setMarcador(res.partida.marcador || {});
      setEstadoPartida(res.partida.estado);
      setBandos(res.bandos || []);
      setJugadoresPartida(res.partida.jugadores || res.jugadores || []);
      setMvps(res.partida.mvps || []);
      setTituloPartida(res.partida.nombre || res.tituloEvento || tituloInicial);
      if (jugador?.id && res.organizadorId === jugador.id) {
        setEsOrganizador(true);
      }
    } catch (error: any) {
      mostrarAvisoTactico('ERROR DE CONEXIÓN', error.message || 'No se pudo cargar la información de la partida.', 'peligro', 'radar');
    } finally {
      setCargando(false);
    }
  };

  const cargarMisEvaluacionesFama = async () => {
    if (!partidaId || !jugador?.id) return;
    try {
      const lista = await obtenerMisEvaluacionesFamaApi(partidaId);
      const mapa: Record<number, EvaluacionFamaItem> = {};
      for (const item of lista) {
        mapa[item.evaluadoId] = item;
      }
      setMisEvaluacionesFama(mapa);
    } catch {}
  };

  useEffect(() => {
    cargarPartida();
    cargarMisEvaluacionesFama();
  }, [partidaId]);

  // 2. Unirse a la sala de WebSockets y escuchar eventos en tiempo real
  useEffect(() => {
    if (partidaId) {
      unirseASalaPartida(partidaId);
    }

    if (!socket) return;

    // Escuchar cuando entra una nueva ronda
    const handleRondaRegistrada = (data: {
      partidaId: number;
      ronda: Ronda;
      marcador: Record<number, number>;
    }) => {
      if (data.partidaId === partidaId) {
        setRondas((prev) => [data.ronda, ...prev]);
        setMarcador(data.marcador);
        setEstadoPartida('EN_CURSO');
      }
    };

    // Escuchar cuando se sincronizan masivamente rondas offline
    const handleRondasSincronizadas = (data: {
      partidaId: number;
      rondas: Ronda[];
      marcador: Record<number, number>;
    }) => {
      if (data.partidaId === partidaId) {
        setRondas((prev) => [...data.rondas.reverse(), ...prev]);
        setMarcador(data.marcador);
        setEstadoPartida('EN_CURSO');
      }
    };

    // Escuchar cuando la partida cambia de estado (ej: FINALIZADA)
    const handleEstadoCambiado = (data: {
      partidaId: number;
      nuevoEstado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA';
    }) => {
      if (data.partidaId === partidaId) {
        setEstadoPartida(data.nuevoEstado);
        if (data.nuevoEstado === 'FINALIZADA') {
          if (partida?.eventoId) {
            limpiarRecordatoriosDePartida(partida.eventoId).catch(() => null);
          }
          setTimeout(() => {
            setModalMvpVisible(true);
          }, 800);
        }
      }
    };

    // Escuchar actualización de MVPs en tiempo real
    const handleMvpActualizado = (data: { partidaId: number; mvps: MvpInfo[] }) => {
      if (data.partidaId === partidaId) {
        setMvps(data.mvps);
      }
    };

    // Escuchar actualización de jugadores / alineación en tiempo real
    const handleJugadoresActualizados = (data: {
      partidaId: number;
      jugadores: JugadorPartidaInfo[];
    }) => {
      if (data.partidaId === partidaId) {
        setJugadoresPartida(data.jugadores);
      }
    };

    socket.on('ronda_registrada', handleRondaRegistrada);
    socket.on('rondas_sincronizadas', handleRondasSincronizadas);
    socket.on('partida_estado_cambiado', handleEstadoCambiado);
    socket.on('mvp_actualizado', handleMvpActualizado);
    socket.on('partida_jugadores_actualizados', handleJugadoresActualizados);

    return () => {
      socket.off('ronda_registrada', handleRondaRegistrada);
      socket.off('rondas_sincronizadas', handleRondasSincronizadas);
      socket.off('partida_estado_cambiado', handleEstadoCambiado);
      socket.off('mvp_actualizado', handleMvpActualizado);
      socket.off('partida_jugadores_actualizados', handleJugadoresActualizados);
      if (partidaId) {
        salirDeSalaPartida(partidaId);
      }
    };
  }, [partidaId, socket, conectado]);

  // Bandos dinámicos reales de la partida
  const bando1 = bandos[0] || { id: 1, nombre: 'Bando Alfa', colorHex: colors.accent };
  const bando2 = bandos[1] || { id: 2, nombre: 'Bando Bravo', colorHex: '#3182CE' };
  const puntosBando1 = marcador[bando1.id] || 0;
  const puntosBando2 = marcador[bando2.id] || 0;

  // Regla de quórum: mínimo 1 jugador por bando asignado a la partida
  const cantBando1 = jugadoresPartida.filter((j) => j.bandoId === bando1.id).length;
  const cantBando2 = jugadoresPartida.filter((j) => j.bandoId === bando2.id).length;
  const tieneQuorumPuntaje =
    jugadoresPartida.length === 0 || (cantBando1 >= 1 && cantBando2 >= 1);

  // Participación del usuario actual en esta partida
  const miParticipacion = jugadoresPartida.find(
    (j) => Number(j.jugadorId) === Number(jugador?.id),
  );
  const companerosMismoBando = jugadoresPartida.filter(
    (j) =>
      j.bandoId === miParticipacion?.bandoId &&
      Number(j.jugadorId) !== Number(jugador?.id),
  );

  // Límite de 48 horas (2 días) para premiar MVP desde el fin de la partida
  const fechaFinPartida = partida?.finalizadaAt
    ? new Date(partida.finalizadaAt).getTime()
    : rondas.length > 0 && rondas[0]?.fechaRegistro
    ? new Date(rondas[0].fechaRegistro).getTime()
    : null;
  const plazoMvpExpirado =
    estadoPartida === 'FINALIZADA' &&
    fechaFinPartida !== null &&
    Date.now() - fechaFinPartida > 2 * 24 * 60 * 60 * 1000;

  const handleAnotarRonda = async (bandoId?: number) => {
    if (estadoPartida === 'FINALIZADA') {
      mostrarAvisoTactico('COMBATE CONCLUIDO', 'Este combate ya ha concluido oficialmente. No se pueden registrar más rondas.', 'advertencia', 'lock-outline');
      return;
    }

    if (!tieneQuorumPuntaje) {
      mostrarAvisoTactico(
        'FALTA DE QUÓRUM TÁCTICO',
        `No se pueden asignar puntajes a la partida hasta que haya al menos 1 jugador en cada bando.\n\n• ${bando1.nombre}: ${cantBando1} jugador(es)\n• ${bando2.nombre}: ${cantBando2} jugador(es)`,
        'advertencia',
        'account-group-outline',
      );
      return;
    }

    const siguienteRonda = rondas.length + 1;
    try {
      setRegistrando(true);
      await registrarRondaApi(partidaId, siguienteRonda, bandoId);
      if (estadoPartida === 'PENDIENTE') {
        setEstadoPartida('EN_CURSO');
      }
    } catch (error: any) {
      mostrarAvisoTactico('ERROR AL ANOTAR RONDA', error.message || 'No se pudo registrar la ronda.', 'peligro', 'alert-circle-outline');
    } finally {
      setRegistrando(false);
    }
  };

  const handleFinalizarPartida = () => {
    const ganadorTxt =
      puntosBando1 > puntosBando2
        ? `Victoria de ${bando1.nombre} (${puntosBando1} - ${puntosBando2})`
        : puntosBando2 > puntosBando1
        ? `Victoria de ${bando2.nombre} (${puntosBando2} - ${puntosBando1})`
        : `Empate Táctico (${puntosBando1} - ${puntosBando2})`;

    mostrarConfirmacionTactico(
      '¿FINALIZAR COMBATE?',
      `¿Deseas concluir oficialmente esta partida?\n\nResultado: ${ganadorTxt}\n\nUna vez finalizada, se congelará el marcador oficial.`,
      async () => {
        try {
          setModalTactico((prev) => ({ ...prev, visible: false }));
          setFinalizando(true);
          await cambiarEstadoPartidaApi(partidaId, 'FINALIZADA');
          setEstadoPartida('FINALIZADA');
          if (partida?.eventoId) {
            limpiarRecordatoriosDePartida(partida.eventoId).catch(() => null);
          }
          mostrarAvisoTactico('¡PARTIDA FINALIZADA!', `El combate ha concluido oficialmente.\n${ganadorTxt}`, 'exito', 'trophy-award');
          if (miParticipacion && !haVotadoMvp && !plazoMvpExpirado) {
            setTimeout(() => setModalMvpVisible(true), 600);
          }
        } catch (error: any) {
          mostrarAvisoTactico('ERROR AL FINALIZAR', error.message || 'No se pudo finalizar la partida.', 'peligro', 'alert-circle-outline');
        } finally {
          setFinalizando(false);
        }
      },
      {
        tipo: 'peligro',
        icono: 'flag-checkered',
        textoConfirmar: 'FINALIZAR COMBATE',
      },
    );
  };

  const handleVotarMvp = async (candidatoId: number) => {
    if (plazoMvpExpirado) {
      setModalMvpVisible(false);
      mostrarAvisoTactico(
        'PLAZO CONCLUIDO',
        'El plazo para premiar al MVP de esta partida concluyó (límite reglamentario de 48 horas).',
        'advertencia',
        'clock-alert-outline',
      );
      return;
    }
    try {
      setVotandoMvp(true);
      const res = await votarMvpPartidaApi(partidaId, candidatoId);
      setHaVotadoMvp(true);
      setModalMvpVisible(false);
      mostrarAvisoTactico(
        'VOTO REGISTRADO',
        res.mensaje || 'Has emitido tu voto de MVP exitosamente para tu escuadra.',
        'exito',
        'medal',
      );
    } catch (error: any) {
      mostrarAvisoTactico('AVISO DE VOTACIÓN', error.message || 'No se pudo registrar el voto.', 'peligro', 'alert-circle-outline');
    } finally {
      setVotandoMvp(false);
    }
  };

  const abrirModalFama = (operador: JugadorPartidaInfo) => {
    setCandidatoEvaluacion(operador);
    setTipoEvaluacion('RECONOCIMIENTO');
    setCategoriaSeleccionada('HONESTO');
    setModalFamaVisible(true);
  };

  const handleEnviarEvaluacionFama = async () => {
    if (!candidatoEvaluacion) return;
    try {
      setEnviandoEvaluacion(true);
      const res = await evaluarFamaApi(
        partidaId,
        candidatoEvaluacion.jugadorId,
        tipoEvaluacion,
        categoriaSeleccionada,
      );
      setMisEvaluacionesFama((prev) => ({
        ...prev,
        [candidatoEvaluacion.jugadorId]: {
          id: Date.now(),
          evaluadoId: candidatoEvaluacion.jugadorId,
          tipo: tipoEvaluacion,
          categoria: categoriaSeleccionada,
          createdAt: new Date().toISOString(),
        },
      }));
      setModalFamaVisible(false);
      mostrarAvisoTactico(
        tipoEvaluacion === 'RECONOCIMIENTO' ? '¡RECONOCIMIENTO REGISTRADO!' : 'REPORTE REGISTRADO',
        res.mensaje || 'Tu evaluación ha sido registrada e impacta en la reputación táctica del combatiente.',
        tipoEvaluacion === 'RECONOCIMIENTO' ? 'exito' : 'advertencia',
        tipoEvaluacion === 'RECONOCIMIENTO' ? 'hand-okay' : 'shield-alert',
      );
    } catch (error: any) {
      mostrarAvisoTactico('AVISO DE EVALUACIÓN', error.message || 'No se pudo enviar la evaluación.', 'peligro', 'alert-circle-outline');
    } finally {
      setEnviandoEvaluacion(false);
    }
  };

  const handleUnirseORebalancear = async (bandoIdDestino?: number) => {
    try {
      setUniendosePartida(true);
      const res = await unirsePartidaApi(partidaId, {
        bandoId: bandoIdDestino,
        rol: miParticipacion?.rol || (jugador as any)?.rol || 'ASALTO',
      });
      setJugadoresPartida(res.jugadores);
      mostrarAvisoTactico('DESPLIEGUE TÁCTICO', res.mensaje || 'Te has integrado al bando con éxito.', 'exito', 'shield-check');
    } catch (error: any) {
      mostrarAvisoTactico('AVISO DE DESPLIEGUE', error.message || 'No se pudo unir a la partida.', 'peligro', 'alert-circle-outline');
    } finally {
      setUniendosePartida(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centroCargando}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.textoCargando}>Sintonizando frecuencia táctica...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header en vivo */}
      <View style={styles.liveBar}>
        <View style={styles.liveIndicatorRow}>
          <View style={styles.liveIndicator}>
            <View
              style={[
                styles.dotLive,
                estadoPartida === 'FINALIZADA'
                  ? styles.dotGris
                  : conectado
                  ? styles.dotVerde
                  : styles.dotRojo,
              ]}
            />
            <Text style={styles.liveText}>
              {estadoPartida === 'FINALIZADA'
                ? 'COMBATE FINALIZADO'
                : conectado
                ? 'EN VIVO • WEBSOCKET ACTIVO'
                : 'SIN CONEXIÓN EN VIVO'}
            </Text>
          </View>

          <View
            style={[
              styles.estadoPartidaBadge,
              estadoPartida === 'FINALIZADA'
                ? styles.badgeFinalizada
                : estadoPartida === 'EN_CURSO'
                ? styles.badgeEnCurso
                : styles.badgePendiente,
            ]}
          >
            <Text style={styles.estadoPartidaTxt}>{estadoPartida}</Text>
          </View>
        </View>

        <Text style={styles.partidaTitulo}>{tituloPartida}</Text>
      </View>

      {/* Marcador táctico interactivo */}
      <View style={styles.marcadorCard}>
        <Text style={styles.marcadorLabel}>MARCADOR GENERAL</Text>
        <View style={styles.scoreRow}>
          <View style={styles.bandoScoreBox}>
            <View
              style={[
                styles.colorBarBando,
                { backgroundColor: bando1.colorHex || colors.accent },
              ]}
            />
            <Text style={styles.bandoScoreTitulo} numberOfLines={1}>
              {bando1.nombre.toUpperCase()}
            </Text>
            <Text style={styles.scoreNumero}>{puntosBando1}</Text>
          </View>

          <Text style={styles.scoreVs}>VS</Text>

          <View style={styles.bandoScoreBox}>
            <View
              style={[
                styles.colorBarBando,
                { backgroundColor: bando2.colorHex || colors.blueTeam },
              ]}
            />
            <Text style={styles.bandoScoreTitulo} numberOfLines={1}>
              {bando2.nombre.toUpperCase()}
            </Text>
            <Text style={styles.scoreNumero}>{puntosBando2}</Text>
          </View>
        </View>
      </View>

      {/* Banner de Victoria si la partida está finalizada */}
      {estadoPartida === 'FINALIZADA' ? (
        <View style={styles.bannerGanadorFinalContainer}>
          <View style={styles.bannerGanadorFinal}>
            <MaterialCommunityIcons name="trophy" size={28} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.txtGanadorFinal}>
                {puntosBando1 > puntosBando2
                  ? `VICTORIA: ${bando1.nombre.toUpperCase()}`
                  : puntosBando2 > puntosBando1
                  ? `VICTORIA: ${bando2.nombre.toUpperCase()}`
                  : 'EMPATE TÁCTICO'}
              </Text>
              <Text style={styles.txtMarcadorFinalSub}>
                Marcador oficial: {puntosBando1} - {puntosBando2} ({rondas.length} Rondas)
              </Text>
            </View>
          </View>

          {/* Sección de MVPs de la partida */}
          <View style={styles.mvpSectionContainer}>
            <View style={styles.mvpSectionHeader}>
              <MaterialCommunityIcons name="star-shooting" size={18} color={colors.warning} />
              <Text style={styles.txtMvpSectionHeader}>JUGADORES MÁS VALIOSOS (MVPs)</Text>
            </View>

            {mvps.length > 0 ? (
              <View style={styles.mvpListRow}>
                {mvps.map((m) => (
                  <View key={m.bandoId} style={styles.mvpBadgeCard}>
                    <MaterialCommunityIcons name="trophy-award" size={20} color={colors.warning} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={styles.mvpBandoTitulo} numberOfLines={1}>
                        {m.bandoNombre || `Bando #${m.bandoId}`}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons name="star" size={13} color={colors.warning} />
                        <Text style={styles.mvpAliasText} numberOfLines={1}>
                          {m.alias || `Operador #${m.jugadorId}`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.mvpVotosBadge}>
                      <Text style={styles.txtMvpVotosBadge}>
                        {m.votos} {m.votos === 1 ? 'voto' : 'votos'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.txtSinMvpsAun}>
                {plazoMvpExpirado
                  ? 'No se registraron votos de MVP en el plazo reglamentario (48 hrs).'
                  : 'Votaciones de MVP abiertas para los participantes de este combate.'}
              </Text>
            )}

            {/* Botón para votar MVP si participó en la partida */}
            {miParticipacion && (
              haVotadoMvp ? (
                <View style={styles.bannerVotoEmitido}>
                  <MaterialCommunityIcons name="check-decagram" size={16} color={colors.success} style={{ marginRight: 6 }} />
                  <Text style={styles.txtVotoEmitido}>Tu voto de MVP para este combate ya fue registrado.</Text>
                </View>
              ) : plazoMvpExpirado ? (
                <View style={styles.bannerMvpExpirado}>
                  <MaterialCommunityIcons name="clock-alert-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.txtMvpExpirado}>
                    El plazo para premiar al MVP concluyó (límite de 48 horas tras finalizar el combate).
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.btnAbrirModalMvp}
                  onPress={() => setModalMvpVisible(true)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Votar MVP de mi escuadra"
                >
                  <MaterialCommunityIcons name="star-circle" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnAbrirModalMvp}>VOTAR MVP DE MI ESCUADRA</Text>
                </TouchableOpacity>
              )
            )}

            {/* Banner Sistema de Fama Post-Partida */}
            {miParticipacion && (
              <View style={styles.cardFamaPostPartida}>
                <View style={styles.headerFamaPostPartida}>
                  <MaterialCommunityIcons name="scale-balance" size={18} color={colors.trophyGold} />
                  <Text style={styles.tituloFamaPostPartida}>SISTEMA DE FAMA Y REPUTACIÓN</Text>
                </View>
                <Text style={styles.subtituloFamaPostPartida}>
                  Reconoce la honestidad y estrategia de tus compañeros o reporta conductas antideportivas en la lista de combatientes de abajo.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : null}

      {/* Tarjeta de Incorporación Táctica si el operador no está asignado a la partida */}
      {!miParticipacion && estadoPartida !== 'FINALIZADA' && (
        <View style={styles.cardUnirsePartida}>
          <View style={styles.headerUnirsePartida}>
            <MaterialCommunityIcons name="shield-plus" size={20} color={colors.primary} />
            <Text style={styles.tituloUnirsePartida}>ÚNETE A ESTE COMBATE</Text>
          </View>
          <Text style={styles.subtituloUnirsePartida}>
            ¿Llegaste al combate o te estás integrando? Puedes entrar con balance automático o elegir bando:
          </Text>

          <TouchableOpacity
            style={[styles.btnBalanceAuto, uniendosePartida && styles.btnDeshabilitado]}
            disabled={uniendosePartida}
            onPress={() => handleUnirseORebalancear(undefined)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Entrar al combate con balance automático"
          >
            {uniendosePartida ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="scale-balance" size={16} color={colors.onPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.txtBtnBalanceAuto}>ENTRAR CON BALANCE AUTOMÁTICO</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.botonesBandosDirectosRow}>
            <TouchableOpacity
              style={[
                styles.btnBandoDirecto,
                { backgroundColor: bando1.colorHex || colors.accent },
                uniendosePartida && styles.btnDeshabilitado,
              ]}
              disabled={uniendosePartida}
              onPress={() => handleUnirseORebalancear(bando1.id)}
              accessibilityRole="button"
              accessibilityLabel={`Entrar al bando ${bando1.nombre}`}
            >
              <Text style={styles.txtBtnBandoDirecto} numberOfLines={1}>
                ENTRAR A {bando1.nombre.toUpperCase()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnBandoDirecto,
                { backgroundColor: bando2.colorHex || colors.blueTeam },
                uniendosePartida && styles.btnDeshabilitado,
              ]}
              disabled={uniendosePartida}
              onPress={() => handleUnirseORebalancear(bando2.id)}
              accessibilityRole="button"
              accessibilityLabel={`Entrar al bando ${bando2.nombre}`}
            >
              <Text style={styles.txtBtnBandoDirecto} numberOfLines={1}>
                ENTRAR A {bando2.nombre.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {estadoPartida !== 'FINALIZADA' && (esOrganizador ? (
        /* Acciones de combate (Registro rápido de ronda y botón finalizar) para el organizador */
        <View style={styles.accionesContainer}>
          <Text style={styles.seccionTitulo}>ANOTAR GANADOR DE RONDA #{rondas.length + 1}</Text>

          {/* Advertencia de falta de quórum táctico (mínimo 1 por bando) */}
          {!tieneQuorumPuntaje && (
            <View style={styles.bannerQuorumIncompleto}>
              <MaterialCommunityIcons name="alert-outline" size={16} color={colors.warning} style={{ marginRight: 6 }} />
              <Text style={styles.txtBannerQuorumIncompleto}>
                Quórum insuficiente: Cada bando debe contar con al menos 1 jugador para anotar puntajes ({bando1.nombre}: {cantBando1}, {bando2.nombre}: {cantBando2}).
              </Text>
            </View>
          )}

          <View style={styles.botonesAccionRow}>
            <TouchableOpacity
              style={[
                styles.botonVictoria,
                { backgroundColor: bando1.colorHex || colors.accent },
                (registrando || !tieneQuorumPuntaje) && styles.btnDeshabilitado,
              ]}
              disabled={registrando || !tieneQuorumPuntaje}
              onPress={() => handleAnotarRonda(bando1.id)}
              accessibilityRole="button"
              accessibilityLabel={`Anotar punto para ${bando1.nombre}`}
            >
              <Text style={styles.textoBotonVictoria} numberOfLines={1}>
                + PUNTO {bando1.nombre.toUpperCase()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonVictoria,
                styles.botonEmpate,
                (registrando || !tieneQuorumPuntaje) && styles.btnDeshabilitado,
              ]}
              disabled={registrando || !tieneQuorumPuntaje}
              onPress={() => handleAnotarRonda(undefined)}
              accessibilityRole="button"
              accessibilityLabel="Anotar empate de ronda"
            >
              <Text style={styles.textoBotonEmpate}>EMPATE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonVictoria,
                { backgroundColor: bando2.colorHex || colors.blueTeam },
                (registrando || !tieneQuorumPuntaje) && styles.btnDeshabilitado,
              ]}
              disabled={registrando || !tieneQuorumPuntaje}
              onPress={() => handleAnotarRonda(bando2.id)}
              accessibilityRole="button"
              accessibilityLabel={`Anotar punto para ${bando2.nombre}`}
            >
              <Text style={styles.textoBotonVictoria} numberOfLines={1}>
                + PUNTO {bando2.nombre.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botón Finalizar Partida */}
          <TouchableOpacity
            style={[styles.btnFinalizarPartida, finalizando && styles.btnDeshabilitado]}
            onPress={handleFinalizarPartida}
            disabled={finalizando}
            accessibilityRole="button"
            accessibilityLabel="Finalizar combate y declarar ganador"
          >
            {finalizando ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={styles.txtBtnFinalizarPartida}>FINALIZAR COMBATE (DECLARAR GANADOR)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Modo espectador / operador */
        <View style={styles.espectadorCard}>
          <MaterialCommunityIcons name="broadcast" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.txtEspectadorTitulo}>MODO OPERADOR (EN VIVO)</Text>
            <Text style={styles.txtEspectadorSub}>
              Estás presenciando la transmisión táctica en vivo. El comandante de la partida es el único autorizado para registrar rondas y finalizar el combate.
            </Text>
          </View>
        </View>
      ))}

      {/* Historial de alineación de escuadras en esta partida */}
      {jugadoresPartida.length > 0 && (
        <View style={styles.seccionAlineacion}>
          <Text style={styles.seccionTitulo}>ESCUADRAS DE ESTA PARTIDA ({jugadoresPartida.length})</Text>
          <View style={styles.alineacionRow}>
            {/* Columna Bando 1 */}
            <View style={styles.bandoColumna}>
              <Text style={[styles.tituloColumnaBando, { color: bando1.colorHex || colors.accent }]}>
                {bando1.nombre.toUpperCase()} ({cantBando1})
              </Text>
              {jugadoresPartida.filter((j) => j.bandoId === bando1.id).map((j) => {
                const esYo = Number(j.jugadorId) === Number(jugador?.id);
                const evalPrevia = misEvaluacionesFama[j.jugadorId];
                const estiloOperador = obtenerEstiloFama(j.fama);
                return (
                  <View key={j.jugadorId} style={styles.filaOperadorAlineacion}>
                    <Text
                      style={[styles.txtOperadorAlineacion, { color: estiloOperador.colorTexto, flex: 1 }]}
                      numberOfLines={1}
                    >
                      • {j.alias} <Text style={styles.txtRolMini}>[{j.rol || 'OPERADOR'}]</Text>
                      {esYo ? ' (TÚ)' : ''}
                    </Text>
                    {estadoPartida === 'FINALIZADA' && miParticipacion && !esYo && (
                      evalPrevia ? (
                        <View style={styles.badgeYaEvaluadoMini}>
                          <MaterialCommunityIcons
                            name={evalPrevia.tipo === 'RECONOCIMIENTO' ? 'star' : 'alert-circle'}
                            size={11}
                            color={evalPrevia.tipo === 'RECONOCIMIENTO' ? colors.gold : colors.danger}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={styles.txtYaEvaluadoMini}>
                            {evalPrevia.tipo === 'RECONOCIMIENTO' ? 'Elogiado' : 'Reportado'}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.btnEvaluarOperadorMini}
                          onPress={() => abrirModalFama(j)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Evaluar fama de ${j.alias}`}
                        >
                          <MaterialCommunityIcons name="scale-balance" size={11} color={colors.primary} />
                          <Text style={styles.txtBtnEvaluarOperadorMini}>Evaluar</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                );
              })}

              {/* Botón para cambiar o indicador de escuadra */}
              {estadoPartida !== 'FINALIZADA' && miParticipacion && (
                miParticipacion.bandoId === bando1.id ? (
                  <View style={styles.badgeTuEscuadra}>
                    <MaterialCommunityIcons name="shield-check" size={12} color={colors.text} style={{ marginRight: 3 }} />
                    <Text style={styles.txtTuEscuadra}>TU ESCUADRA</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.btnCambiarBandoPartida, uniendosePartida && styles.btnDeshabilitado]}
                    disabled={uniendosePartida}
                    onPress={() => handleUnirseORebalancear(bando1.id)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.txtBtnCambiarBandoPartida}>CAMBIAR A ESTE BANDO</Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <View style={styles.separadorVertical} />

            {/* Columna Bando 2 */}
            <View style={styles.bandoColumna}>
              <Text style={[styles.tituloColumnaBando, { color: bando2.colorHex || colors.blueTeam }]}>
                {bando2.nombre.toUpperCase()} ({cantBando2})
              </Text>
              {jugadoresPartida.filter((j) => j.bandoId === bando2.id).map((j) => {
                const esYo = Number(j.jugadorId) === Number(jugador?.id);
                const evalPrevia = misEvaluacionesFama[j.jugadorId];
                const estiloOperador = obtenerEstiloFama(j.fama);
                return (
                  <View key={j.jugadorId} style={styles.filaOperadorAlineacion}>
                    <Text
                      style={[styles.txtOperadorAlineacion, { color: estiloOperador.colorTexto, flex: 1 }]}
                      numberOfLines={1}
                    >
                      • {j.alias} <Text style={styles.txtRolMini}>[{j.rol || 'OPERADOR'}]</Text>
                      {esYo ? ' (TÚ)' : ''}
                    </Text>
                    {estadoPartida === 'FINALIZADA' && miParticipacion && !esYo && (
                      evalPrevia ? (
                        <View style={styles.badgeYaEvaluadoMini}>
                          <MaterialCommunityIcons
                            name={evalPrevia.tipo === 'RECONOCIMIENTO' ? 'star' : 'alert-circle'}
                            size={11}
                            color={evalPrevia.tipo === 'RECONOCIMIENTO' ? colors.gold : colors.danger}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={styles.txtYaEvaluadoMini}>
                            {evalPrevia.tipo === 'RECONOCIMIENTO' ? 'Elogiado' : 'Reportado'}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.btnEvaluarOperadorMini}
                          onPress={() => abrirModalFama(j)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Evaluar fama de ${j.alias}`}
                        >
                          <MaterialCommunityIcons name="scale-balance" size={11} color={colors.primary} />
                          <Text style={styles.txtBtnEvaluarOperadorMini}>Evaluar</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                );
              })}

              {/* Botón para cambiar o indicador de escuadra */}
              {estadoPartida !== 'FINALIZADA' && miParticipacion && (
                miParticipacion.bandoId === bando2.id ? (
                  <View style={styles.badgeTuEscuadra}>
                    <MaterialCommunityIcons name="shield-check" size={12} color={colors.text} style={{ marginRight: 3 }} />
                    <Text style={styles.txtTuEscuadra}>TU ESCUADRA</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.btnCambiarBandoPartida, uniendosePartida && styles.btnDeshabilitado]}
                    disabled={uniendosePartida}
                    onPress={() => handleUnirseORebalancear(bando2.id)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.txtBtnCambiarBandoPartida}>CAMBIAR A ESTE BANDO</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>
      )}

      {/* Historial de rondas */}
      <Text style={styles.seccionTitulo}>HISTORIAL DE RONDAS EN TIEMPO REAL</Text>
      <ScrollView style={styles.rondasScroll} contentContainerStyle={styles.rondasContent}>
        {rondas.length === 0 ? (
          <View style={styles.sinRondas}>
            <Text style={styles.textoSinRondas}>Esperando inicio de la primera ronda...</Text>
          </View>
        ) : (
          rondas.map((r) => (
            <View key={r.id || r.numeroRonda} style={styles.rondaCard}>
              <View style={styles.rondaNumeroBadge}>
                <Text style={styles.textoRondaBadge}>R{r.numeroRonda}</Text>
              </View>
              <View style={styles.rondaInfo}>
                <Text style={styles.ganadorText}>
                  Ganador:{' '}
                  <Text style={styles.ganadorDestacado}>
                    {r.bandoGanadorNombre || (r.bandoGanadorId === bando1.id ? bando1.nombre : r.bandoGanadorId === bando2.id ? bando2.nombre : r.bandoGanadorId ? `Bando #${r.bandoGanadorId}` : 'Empate')}
                  </Text>
                </Text>
                <Text style={styles.rondaHora}>
                  {new Date(r.fechaRegistro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
              </View>
              <View style={styles.syncBadge}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <MaterialCommunityIcons name="broadcast" size={11} color={colors.success} />
                  <Text style={styles.textoSyncBadge}>LIVE</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal Emergente para Elegir MVP de su propio bando */}
      <Modal
        visible={modalMvpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalMvpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderMvp}>
              <MaterialCommunityIcons name="trophy-award" size={28} color={colors.warning} />
              <Text style={styles.modalTituloMvp}>ELIGE AL MVP DE TU ESCUADRA</Text>
            </View>
            <Text style={styles.modalSubtituloMvp}>
              Vota por el compañero más destacado de tu bando ({miParticipacion?.bandoNombre || 'tu escuadra'}) en esta partida. No puedes votarte a ti mismo.
            </Text>

            <ScrollView style={styles.listaCompanerosScroll} contentContainerStyle={{ paddingVertical: 6 }}>
              {companerosMismoBando.length === 0 ? (
                <View style={styles.sinCompanerosBox}>
                  <MaterialCommunityIcons name="account-alert" size={32} color={colors.textMuted} style={{ marginBottom: 6 }} />
                  <Text style={styles.txtSinCompaneros}>
                    Eres el único operador registrado en tu escuadra para esta partida. No hay compañeros por los cuales votar.
                  </Text>
                </View>
              ) : (
                companerosMismoBando.map((comp) => (
                  <View key={comp.jugadorId} style={styles.cardCompaneroMvp}>
                    <View style={styles.avatarCompaneroBox}>
                      <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.txtAliasCompanero}>{comp.alias || `Operador #${comp.jugadorId}`}</Text>
                      <Text style={styles.txtRolCompanero}>Rol: {comp.rol || 'OPERADOR'}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.btnVotarCandidato, votandoMvp && styles.btnDeshabilitado]}
                      onPress={() => handleVotarMvp(comp.jugadorId)}
                      disabled={votandoMvp}
                    >
                      <MaterialCommunityIcons name="star" size={14} color={colors.onPrimary} style={{ marginRight: 4 }} />
                      <Text style={styles.txtBtnVotarCandidato}>VOTAR</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.btnCerrarModalMvp}
              onPress={() => setModalMvpVisible(false)}
              disabled={votandoMvp}
            >
              <Text style={styles.txtBtnCerrarModalMvp}>
                {companerosMismoBando.length === 0 ? 'ENTENDIDO / CERRAR' : 'MÁS TARDE / CERRAR'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Emergente: EVALUAR FAMA (Reconocimientos y Reportes) */}
      <Modal
        visible={modalFamaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!enviandoEvaluacion) setModalFamaVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderMvp}>
              <MaterialCommunityIcons
                name={tipoEvaluacion === 'RECONOCIMIENTO' ? 'shield-star' : 'alert-decagram'}
                size={26}
                color={tipoEvaluacion === 'RECONOCIMIENTO' ? colors.trophyGold : colors.danger}
              />
              <Text style={styles.modalTituloMvp}>EVALUACIÓN DE CONDUCTA</Text>
            </View>

            {candidatoEvaluacion && (
              <View style={styles.candidatoFamaCard}>
                <Text style={styles.txtCandidatoFamaAlias}>{candidatoEvaluacion.alias}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
                  <Text style={styles.txtCandidatoFamaBando}>
                    {candidatoEvaluacion.bandoNombre || 'Bando'} •
                  </Text>
                  <MaterialCommunityIcons
                    name={candidatoEvaluacion.bandoId === miParticipacion?.bandoId ? 'shield' : 'sword-cross'}
                    size={13}
                    color={candidatoEvaluacion.bandoId === miParticipacion?.bandoId ? colors.success : colors.danger}
                  />
                  <Text style={[styles.txtCandidatoFamaBando, { fontWeight: '800' }]}>
                    {candidatoEvaluacion.bandoId === miParticipacion?.bandoId ? 'ALIADO' : 'ADVERSARIO'}
                  </Text>
                </View>
              </View>
            )}

            {/* Selector de Tipo: Reconocimiento vs Reporte */}
            <View style={styles.tipoEvaluacionSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.btnTipoEvaluacion,
                  tipoEvaluacion === 'RECONOCIMIENTO' && styles.btnTipoEvaluacionActivoReconocimiento,
                ]}
                onPress={() => {
                  setTipoEvaluacion('RECONOCIMIENTO');
                  setCategoriaSeleccionada('HONESTO');
                }}
                disabled={enviandoEvaluacion}
              >
                <MaterialCommunityIcons
                  name="trophy-award"
                  size={15}
                  color={tipoEvaluacion === 'RECONOCIMIENTO' ? colors.trophyGold : colors.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.txtTipoEvaluacion,
                    tipoEvaluacion === 'RECONOCIMIENTO' && styles.txtTipoEvaluacionActivoReconocimiento,
                  ]}
                >
                  RECONOCER (+FAMA)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnTipoEvaluacion,
                  tipoEvaluacion === 'REPORTE' && styles.btnTipoEvaluacionActivoReporte,
                ]}
                onPress={() => {
                  setTipoEvaluacion('REPORTE');
                  setCategoriaSeleccionada('INMORTAL');
                }}
                disabled={enviandoEvaluacion}
              >
                <MaterialCommunityIcons
                  name="shield-alert"
                  size={15}
                  color={tipoEvaluacion === 'REPORTE' ? colors.danger : colors.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.txtTipoEvaluacion,
                    tipoEvaluacion === 'REPORTE' && styles.txtTipoEvaluacionActivoReporte,
                  ]}
                >
                  REPORTAR (-FAMA)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Listado de Categorías disponibles */}
            <ScrollView style={{ maxHeight: 250, marginVertical: 8 }}>
              {(tipoEvaluacion === 'RECONOCIMIENTO' ? CATEGORIAS_RECONOCIMIENTOS : CATEGORIAS_REPORTES).map((cat) => {
                const seleccionada = categoriaSeleccionada === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.cardCategoriaFama,
                      seleccionada && (tipoEvaluacion === 'RECONOCIMIENTO' ? styles.cardCategoriaFamaActivaRecon : styles.cardCategoriaFamaActivaRep),
                    ]}
                    onPress={() => setCategoriaSeleccionada(cat.id)}
                    disabled={enviandoEvaluacion}
                    activeOpacity={0.8}
                  >
                    <View style={styles.radioDotFama}>
                      {seleccionada && (
                        <View
                          style={[
                            styles.radioDotInnerFama,
                            { backgroundColor: tipoEvaluacion === 'RECONOCIMIENTO' ? colors.trophyGold : colors.danger },
                          ]}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.txtTituloCategoriaFama,
                          seleccionada && { color: tipoEvaluacion === 'RECONOCIMIENTO' ? colors.trophyGold : colors.danger },
                        ]}
                      >
                        {cat.label}
                      </Text>
                      <Text style={styles.txtDescCategoriaFama}>{cat.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Botón Enviar */}
            <TouchableOpacity
              style={[
                styles.btnEnviarEvaluacionFama,
                { backgroundColor: tipoEvaluacion === 'RECONOCIMIENTO' ? colors.trophyGold : '#DC2626' },
                enviandoEvaluacion && styles.btnDeshabilitado,
              ]}
              onPress={handleEnviarEvaluacionFama}
              disabled={enviandoEvaluacion}
              activeOpacity={0.85}
            >
              {enviandoEvaluacion ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons
                    name={tipoEvaluacion === 'RECONOCIMIENTO' ? 'star' : 'alert-circle'}
                    size={16}
                    color={tipoEvaluacion === 'RECONOCIMIENTO' ? colors.onPrimary : colors.text}
                  />
                  <Text
                    style={[
                      styles.txtBtnEnviarEvaluacionFama,
                      { color: tipoEvaluacion === 'RECONOCIMIENTO' ? '#000' : '#FFF' },
                    ]}
                  >
                    {tipoEvaluacion === 'RECONOCIMIENTO' ? 'EMITIR RECONOCIMIENTO' : 'ENVIAR REPORTE'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Botón Cancelar */}
            <TouchableOpacity
              style={styles.btnCerrarModalMvp}
              onPress={() => setModalFamaVisible(false)}
              disabled={enviandoEvaluacion}
            >
              <Text style={styles.txtBtnCerrarModalMvp}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Táctico Unificado de Confirmaciones y Avisos */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centroCargando: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCargando: {
    color: colors.textSecondary,
    marginTop: 10,
    fontSize: 13,
  },
  liveBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotLive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotVerde: {
    backgroundColor: colors.success,
  },
  dotRojo: {
    backgroundColor: colors.danger,
  },
  dotGris: {
    backgroundColor: colors.textMuted,
  },
  liveText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  estadoPartidaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgePendiente: {
    backgroundColor: colors.warningSoft,
  },
  badgeEnCurso: {
    backgroundColor: 'rgba(229, 62, 62, 0.25)',
  },
  badgeFinalizada: {
    backgroundColor: colors.successSoft,
  },
  estadoPartidaTxt: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  partidaTitulo: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.displayBold,
    letterSpacing: 0.5,
  },
  marcadorCard: {
    margin: 16,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  marcadorLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bandoScoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  colorBarBando: {
    width: 32,
    height: 4,
    borderRadius: 2,
    marginBottom: 6,
  },
  bandoScoreTitulo: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.displaySemiBold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scoreNumero: {
    color: colors.primary,
    fontSize: 48,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
  },
  scoreVs: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '800',
    marginHorizontal: 16,
  },
  bannerGanadorFinalContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  bannerGanadorFinal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: 14,
  },
  bannerRecompensasProximamente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtRecompensasProximamente: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },
  espectadorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtEspectadorTitulo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtEspectadorSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  txtGanadorFinal: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtMarcadorFinalSub: {
    color: colors.warning,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
  },
  accionesContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seccionTitulo: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  botonesAccionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  botonVictoria: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  botonEmpate: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  textoBotonVictoria: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textoBotonEmpate: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  btnFinalizarPartida: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229, 62, 62, 0.85)',
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnFinalizarPartida: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnDeshabilitado: {
    opacity: 0.5,
  },
  rondasScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  rondasContent: {
    paddingBottom: 24,
  },
  sinRondas: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  textoSinRondas: {
    color: colors.textMuted,
    fontSize: 13,
  },
  rondaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rondaNumeroBadge: {
    backgroundColor: colors.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  textoRondaBadge: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  rondaInfo: {
    flex: 1,
  },
  ganadorText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  ganadorDestacado: {
    fontWeight: '900',
    color: colors.text,
  },
  rondaHora: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  syncBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textoSyncBadge: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  mvpSectionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  mvpSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  txtMvpSectionHeader: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  mvpListRow: {
    gap: 8,
    marginBottom: 8,
  },
  mvpBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    borderRadius: 8,
    padding: 10,
  },
  mvpBandoTitulo: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mvpAliasText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  mvpVotosBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  txtMvpVotosBadge: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '800',
  },
  txtSinMvpsAun: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  bannerVotoEmitido: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  txtVotoEmitido: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  bannerMvpExpirado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  txtMvpExpirado: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  btnAbrirModalMvp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  txtBtnAbrirModalMvp: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerQuorumIncompleto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(237, 137, 54, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(237, 137, 54, 0.3)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  txtBannerQuorumIncompleto: {
    flex: 1,
    color: colors.warning,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  seccionAlineacion: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  alineacionRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  bandoColumna: {
    flex: 1,
  },
  tituloColumnaBando: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  txtOperadorAlineacion: {
    color: colors.text,
    fontSize: 12,
    marginBottom: 3,
  },
  txtRolMini: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  separadorVertical: {
    width: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '100%',
    maxHeight: '80%',
    padding: 18,
  },
  modalHeaderMvp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  modalTituloMvp: {
    color: colors.warning,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  modalSubtituloMvp: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  listaCompanerosScroll: {
    maxHeight: 280,
  },
  sinCompanerosBox: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  txtSinCompaneros: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  cardCompaneroMvp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatarCompaneroBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtAliasCompanero: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  txtRolCompanero: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  btnVotarCandidato: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  txtBtnVotarCandidato: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900',
  },
  btnCerrarModalMvp: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  txtBtnCerrarModalMvp: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  cardUnirsePartida: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
  },
  headerUnirsePartida: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tituloUnirsePartida: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  subtituloUnirsePartida: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  btnBalanceAuto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  txtBtnBalanceAuto: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  botonesBandosDirectosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnBandoDirecto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  txtBtnBandoDirecto: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTuEscuadra: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  txtTuEscuadra: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  btnCambiarBandoPartida: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginTop: 6,
  },
  txtBtnCambiarBandoPartida: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  cardFamaPostPartida: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  headerFamaPostPartida: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tituloFamaPostPartida: {
    color: colors.trophyGold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  subtituloFamaPostPartida: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  filaOperadorAlineacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badgeYaEvaluadoMini: {
    backgroundColor: colors.borderSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txtYaEvaluadoMini: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  btnEvaluarOperadorMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    minHeight: 28,
  },
  txtBtnEvaluarOperadorMini: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 3,
  },
  candidatoFamaCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtCandidatoFamaAlias: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtCandidatoFamaBando: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  tipoEvaluacionSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  btnTipoEvaluacion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 9,
  },
  btnTipoEvaluacionActivoReconocimiento: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: colors.trophyGold,
  },
  btnTipoEvaluacionActivoReporte: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  txtTipoEvaluacion: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txtTipoEvaluacionActivoReconocimiento: {
    color: colors.trophyGold,
  },
  txtTipoEvaluacionActivoReporte: {
    color: colors.danger,
  },
  cardCategoriaFama: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginBottom: 6,
  },
  cardCategoriaFamaActivaRecon: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderColor: colors.trophyGold,
  },
  cardCategoriaFamaActivaRep: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  radioDotFama: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotInnerFama: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txtTituloCategoriaFama: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  txtDescCategoriaFama: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
  },
  btnEnviarEvaluacionFama: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  txtBtnEnviarEvaluacionFama: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
