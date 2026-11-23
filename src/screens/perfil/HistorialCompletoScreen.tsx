import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/types';
import { PartidaHistorialItem, obtenerPerfilCompletoApi } from '../../api/auth.service';

type HistorialScreenRouteProp = RouteProp<RootStackParamList, 'HistorialCompleto'>;

type FiltroTipo = 'TODAS' | 'VICTORIAS' | 'DERROTAS' | 'EMPATES';

export const HistorialCompletoScreen = () => {
  const route = useRoute<HistorialScreenRouteProp>();
  const [historial, setHistorial] = useState<PartidaHistorialItem[]>(
    route.params?.historial || []
  );
  const [cargando, setCargando] = useState(!route.params?.historial);
  const [refrescando, setRefrescando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroTipo>('TODAS');

  const recargarHistorial = async () => {
    try {
      setRefrescando(true);
      const perfil = await obtenerPerfilCompletoApi();
      setHistorial(perfil.historialPartidas || []);
    } catch {
      // Si falla, se mantiene lo que hay
    } finally {
      setRefrescando(false);
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!route.params?.historial) {
      recargarHistorial();
    }
  }, [route.params?.historial]);

  // Métricas de desempeño táctico
  const { total, victorias, derrotas, empates, winRate } = useMemo(() => {
    const tot = historial.length;
    const vict = historial.filter((p) => p.resultado === 'VICTORIA').length;
    const derr = historial.filter((p) => p.resultado === 'DERROTA').length;
    const emp = historial.filter((p) => p.resultado === 'EMPATE').length;
    const rate = tot > 0 ? Math.round((vict / tot) * 100) : 0;
    return { total: tot, victorias: vict, derrotas: derr, empates: emp, winRate: rate };
  }, [historial]);

  // Lista filtrada
  const historialFiltrado = useMemo(() => {
    if (filtro === 'VICTORIAS') return historial.filter((p) => p.resultado === 'VICTORIA');
    if (filtro === 'DERROTAS') return historial.filter((p) => p.resultado === 'DERROTA');
    if (filtro === 'EMPATES') return historial.filter((p) => p.resultado === 'EMPATE');
    return historial;
  }, [historial, filtro]);

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando registro de operaciones tácticas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={recargarHistorial}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Banner Resumen de Combate */}
        <View style={styles.resumenCard}>
          <View style={styles.resumenHeader}>
            <MaterialCommunityIcons name="shield-sword" size={24} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.resumenTitulo}>HOJA DE SERVICIO EN CANCHA</Text>
          </View>

          <View style={styles.resumenStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumero}>{total}</Text>
              <Text style={styles.statLabel}>PARTIDAS</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNumero, { color: '#81C784' }]}>{victorias}</Text>
              <Text style={styles.statLabel}>VICTORIAS</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNumero, { color: '#EF9A9A' }]}>{derrotas}</Text>
              <Text style={styles.statLabel}>DERROTAS</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNumero, { color: colors.secondary }]}>{winRate}%</Text>
              <Text style={styles.statLabel}>EFECTIVIDAD</Text>
            </View>
          </View>
        </View>

        {/* Filtros Tácticos */}
        <View style={styles.filtrosRow}>
          <TouchableOpacity
            style={[styles.filtroBtn, filtro === 'TODAS' && styles.filtroBtnActivo]}
            onPress={() => setFiltro('TODAS')}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.filtroTexto, filtro === 'TODAS' && styles.filtroTextoActivo]}>
              TODAS ({total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBtn, filtro === 'VICTORIAS' && styles.filtroBtnActivo]}
            onPress={() => setFiltro('VICTORIAS')}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.filtroTexto, filtro === 'VICTORIAS' && styles.filtroTextoActivo]}>
              VICTORIAS ({victorias})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBtn, filtro === 'DERROTAS' && styles.filtroBtnActivo]}
            onPress={() => setFiltro('DERROTAS')}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.filtroTexto, filtro === 'DERROTAS' && styles.filtroTextoActivo]}>
              DERROTAS ({derrotas})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBtn, filtro === 'EMPATES' && styles.filtroBtnActivo]}
            onPress={() => setFiltro('EMPATES')}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.filtroTexto, filtro === 'EMPATES' && styles.filtroTextoActivo]}>
              EMPATES ({empates})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Partidas */}
        {historialFiltrado.length === 0 ? (
          <View style={styles.sinPartidasBox}>
            <MaterialCommunityIcons name="target" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.sinPartidasTitulo}>Sin registros en este filtro</Text>
            <Text style={styles.sinPartidasDesc}>
              No se han encontrado partidas con el resultado seleccionado.
            </Text>
          </View>
        ) : (
          <View style={styles.listaPartidas}>
            {historialFiltrado.map((item) => {
              const esVictoria = item.resultado === 'VICTORIA';
              const esDerrota = item.resultado === 'DERROTA';
              const esEmpate = item.resultado === 'EMPATE';
              const bordeColor = esVictoria ? '#4CAF50' : esDerrota ? '#E53935' : '#FFB300';

              return (
                <View key={item.id} style={[styles.partidaCard, { borderLeftColor: bordeColor }]}>
                  {/* Encabezado: Título y Badge Resultado */}
                  <View style={styles.partidaHeader}>
                    <Text style={styles.partidaTitulo} numberOfLines={1}>
                      {item.tituloEvento}
                    </Text>
                    <View
                      style={[
                        styles.resultadoBadge,
                        esVictoria && styles.resultadoVictoria,
                        esDerrota && styles.resultadoDerrota,
                        esEmpate && styles.resultadoEmpate,
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultadoTexto,
                          esVictoria && styles.textoVictoria,
                          esDerrota && styles.textoDerrota,
                          esEmpate && styles.textoEmpate,
                        ]}
                      >
                        {item.resultado}
                      </Text>
                    </View>
                  </View>

                  {/* Metadatos Tácticos */}
                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="map-marker" size={15} color={colors.primary} style={styles.metaIcon} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.canchaNombre}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="crosshairs" size={15} color={colors.secondary} style={styles.metaIcon} />
                      <Text style={styles.metaText}>
                        Marcador de Rondas: <Text style={styles.marcadorTexto}>{item.marcador}</Text>
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="shield-outline" size={15} color={colors.textSecondary} style={styles.metaIcon} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        Bando: <Text style={{ color: colors.text }}>{item.bandoNombre}</Text> • Rol: [{item.rol}]
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="calendar-clock" size={15} color={colors.textSecondary} style={styles.metaIcon} />
                      <Text style={styles.metaText}>
                        {new Date(item.fecha).toLocaleDateString([], {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  resumenCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: 16,
  },
  resumenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  resumenTitulo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resumenStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statNumero: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
  },
  filtrosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filtroBtn: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filtroBtnActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtroTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  filtroTextoActivo: {
    color: colors.text,
    fontWeight: '900',
  },
  listaPartidas: {
    gap: 12,
  },
  partidaCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  partidaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  partidaTitulo: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  resultadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  resultadoVictoria: {
    backgroundColor: 'rgba(46, 125, 50, 0.25)',
    borderColor: '#4CAF50',
  },
  resultadoDerrota: {
    backgroundColor: 'rgba(198, 40, 40, 0.25)',
    borderColor: '#E53935',
  },
  resultadoEmpate: {
    backgroundColor: 'rgba(239, 108, 0, 0.25)',
    borderColor: '#FFB300',
  },
  resultadoTexto: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textoVictoria: {
    color: '#81C784',
  },
  textoDerrota: {
    color: '#EF9A9A',
  },
  textoEmpate: {
    color: '#FFE082',
  },
  metaGrid: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 6,
    width: 18,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  marcadorTexto: {
    color: colors.text,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  sinPartidasBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 20,
  },
  sinPartidasTitulo: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  sinPartidasDesc: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
