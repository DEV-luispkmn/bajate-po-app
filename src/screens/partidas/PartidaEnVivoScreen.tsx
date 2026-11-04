import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import {
  obtenerPartidaApi,
  cambiarEstadoPartidaApi,
  registrarRondaApi,
  Ronda,
  Partida,
} from '../../api/partidas.service';
import { colors } from '../../theme/colors';

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
      setTituloPartida(res.partida.nombre || res.tituloEvento || tituloInicial);
      if (jugador?.id && res.organizadorId === jugador.id) {
        setEsOrganizador(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cargar la información de la partida');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPartida();
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
      }
    };

    socket.on('ronda_registrada', handleRondaRegistrada);
    socket.on('rondas_sincronizadas', handleRondasSincronizadas);
    socket.on('partida_estado_cambiado', handleEstadoCambiado);

    return () => {
      socket.off('ronda_registrada', handleRondaRegistrada);
      socket.off('rondas_sincronizadas', handleRondasSincronizadas);
      socket.off('partida_estado_cambiado', handleEstadoCambiado);
      if (partidaId) {
        salirDeSalaPartida(partidaId);
      }
    };
  }, [partidaId, socket, conectado]);

  // Bandos dinámicos reales de la partida
  const bando1 = bandos[0] || { id: 1, nombre: 'Bando Alfa', colorHex: '#E53E3E' };
  const bando2 = bandos[1] || { id: 2, nombre: 'Bando Bravo', colorHex: '#3182CE' };
  const puntosBando1 = marcador[bando1.id] || 0;
  const puntosBando2 = marcador[bando2.id] || 0;

  const handleAnotarRonda = async (bandoId?: number) => {
    if (estadoPartida === 'FINALIZADA') {
      Alert.alert('Partida Finalizada', 'Este combate ya ha concluido. No se pueden registrar más rondas.');
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
      Alert.alert('Error', error.message || 'No se pudo registrar la ronda');
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

    Alert.alert(
      '🏁 ¿FINALIZAR PARTIDA?',
      `¿Deseas concluir oficialmente esta partida?\n\nResultado: ${ganadorTxt}\n\nUna vez finalizada, se congelará el marcador oficial.`,
      [
        { text: 'CANCELAR', style: 'cancel' },
        {
          text: 'FINALIZAR COMBATE',
          style: 'destructive',
          onPress: async () => {
            try {
              setFinalizando(true);
              await cambiarEstadoPartidaApi(partidaId, 'FINALIZADA');
              setEstadoPartida('FINALIZADA');
              Alert.alert('🏆 ¡PARTIDA FINALIZADA!', `El combate ha concluido oficialmente.\n${ganadorTxt}`);
            } catch (error: any) {
              Alert.alert('Error al finalizar', error.message || 'No se pudo finalizar la partida');
            } finally {
              setFinalizando(false);
            }
          },
        },
      ],
    );
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
                ? 'COMBATE FINALIZADO 🏁'
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
                  ? `VICTORIA: ${bando1.nombre.toUpperCase()} 🏆`
                  : puntosBando2 > puntosBando1
                  ? `VICTORIA: ${bando2.nombre.toUpperCase()} 🏆`
                  : 'EMPATE TÁCTICO 🤝'}
              </Text>
              <Text style={styles.txtMarcadorFinalSub}>
                Marcador oficial: {puntosBando1} - {puntosBando2} ({rondas.length} Rondas)
              </Text>
            </View>
          </View>
          <View style={styles.bannerRecompensasProximamente}>
            <MaterialCommunityIcons name="medal-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.txtRecompensasProximamente}>
              Próximamente: condecorar compañeros y reportar jugadores.
            </Text>
          </View>
        </View>
      ) : esOrganizador ? (
        /* Acciones de combate (Registro rápido de ronda y botón finalizar) para el organizador */
        <View style={styles.accionesContainer}>
          <Text style={styles.seccionTitulo}>ANOTAR GANADOR DE RONDA #{rondas.length + 1}</Text>
          <View style={styles.botonesAccionRow}>
            <TouchableOpacity
              style={[
                styles.botonVictoria,
                { backgroundColor: bando1.colorHex || colors.accent },
                registrando && styles.btnDeshabilitado,
              ]}
              disabled={registrando}
              onPress={() => handleAnotarRonda(bando1.id)}
            >
              <Text style={styles.textoBotonVictoria} numberOfLines={1}>
                + PUNTO {bando1.nombre.toUpperCase()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonVictoria, styles.botonEmpate, registrando && styles.btnDeshabilitado]}
              disabled={registrando}
              onPress={() => handleAnotarRonda(undefined)}
            >
              <Text style={styles.textoBotonEmpate}>EMPATE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonVictoria,
                { backgroundColor: bando2.colorHex || colors.blueTeam },
                registrando && styles.btnDeshabilitado,
              ]}
              disabled={registrando}
              onPress={() => handleAnotarRonda(bando2.id)}
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
          >
            {finalizando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="flag-checkered" size={16} color="#fff" style={{ marginRight: 6 }} />
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
                <Text style={styles.textoSyncBadge}>✓ LIVE</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    backgroundColor: colors.primary,
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
    backgroundColor: 'rgba(214, 158, 46, 0.2)',
  },
  badgeEnCurso: {
    backgroundColor: 'rgba(229, 62, 62, 0.25)',
  },
  badgeFinalizada: {
    backgroundColor: 'rgba(56, 161, 105, 0.25)',
  },
  estadoPartidaTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  partidaTitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scoreNumero: {
    color: colors.primary,
    fontSize: 48,
    fontWeight: '900',
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
    backgroundColor: 'rgba(214, 158, 46, 0.15)',
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
    color: '#fff',
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
    color: '#fff',
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
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textoSyncBadge: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
});
