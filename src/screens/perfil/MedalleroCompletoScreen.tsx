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
import { MedallaItem, obtenerPerfilCompletoApi } from '../../api/auth.service';

type MedalleroScreenRouteProp = RouteProp<RootStackParamList, 'MedalleroCompleto'>;

type FiltroMedalla = 'TODAS' | 'DESBLOQUEADAS' | 'BLOQUEADAS';

export const MedalleroCompletoScreen = () => {
  const route = useRoute<MedalleroScreenRouteProp>();
  const [medallas, setMedallas] = useState<MedallaItem[]>(
    route.params?.medallas || []
  );
  const [cargando, setCargando] = useState(!route.params?.medallas);
  const [refrescando, setRefrescando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroMedalla>('TODAS');

  const recargarMedallas = async () => {
    try {
      setRefrescando(true);
      const perfil = await obtenerPerfilCompletoApi();
      setMedallas(perfil.medallas || []);
    } catch {
      // Se mantiene el estado previo si hay error de red
    } finally {
      setRefrescando(false);
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!route.params?.medallas) {
      recargarMedallas();
    }
  }, [route.params?.medallas]);

  // Contadores y Progreso
  const { total, obtenidas, bloqueadas, porcentaje } = useMemo(() => {
    const tot = medallas.length;
    const obt = medallas.filter((m) => m.obtenida).length;
    const bloq = tot - obt;
    const pct = tot > 0 ? Math.round((obt / tot) * 100) : 0;
    return { total: tot, obtenidas: obt, bloqueadas: bloq, porcentaje: pct };
  }, [medallas]);

  // Lista filtrada
  const medallasFiltradas = useMemo(() => {
    if (filtro === 'DESBLOQUEADAS') return medallas.filter((m) => m.obtenida);
    if (filtro === 'BLOQUEADAS') return medallas.filter((m) => !m.obtenida);
    return medallas;
  }, [medallas, filtro]);

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Cargando vitrina de condecoraciones...</Text>
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
            onRefresh={recargarMedallas}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
      >
        {/* Banner de Rango y Progreso */}
        <View style={styles.resumenCard}>
          <View style={styles.resumenHeader}>
            <MaterialCommunityIcons name="medal" size={26} color={colors.secondary} style={{ marginRight: 8 }} />
            <Text style={styles.resumenTitulo}>VITRINA DE CONDECORACIONES</Text>
          </View>

          <Text style={styles.resumenSubtitulo}>
            Medallas tácticas otorgadas por rendimiento militar, fidelidad de escuadra y victorias en combate.
          </Text>

          {/* Barra de progreso */}
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabel}>PROGRESO DEL MEDALLERO</Text>
            <Text style={styles.progressValue}>
              {obtenidas} de {total} ({porcentaje}%)
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${porcentaje}%` }]} />
          </View>
        </View>

        {/* Filtros */}
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
            style={[styles.filtroBtn, filtro === 'DESBLOQUEADAS' && styles.filtroBtnActivo]}
            onPress={() => setFiltro('DESBLOQUEADAS')}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.filtroTexto, filtro === 'DESBLOQUEADAS' && styles.filtroTextoActivo]}>
              DESBLOQUEADAS ({obtenidas})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBtn, filtro === 'BLOQUEADAS' && styles.filtroBtnActivo]}
            onPress={() => setFiltro('BLOQUEADAS')}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.filtroTexto, filtro === 'BLOQUEADAS' && styles.filtroTextoActivo]}>
              BLOQUEADAS ({bloqueadas})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Medallas */}
        {medallasFiltradas.length === 0 ? (
          <View style={styles.sinMedallasBox}>
            <MaterialCommunityIcons name="medal-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.sinMedallasTitulo}>Sin condecoraciones en este filtro</Text>
            <Text style={styles.sinMedallasDesc}>
              No hay medallas que coincidan con la categoría seleccionada.
            </Text>
          </View>
        ) : (
          <View style={styles.listaMedallas}>
            {medallasFiltradas.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.medallaCard,
                  !m.obtenida && styles.medallaCardBloqueada,
                  m.obtenida && styles.medallaCardObtenida,
                ]}
              >
                {/* Icono de la medalla */}
                <View
                  style={[
                    styles.medallaIconContainer,
                    m.obtenida ? styles.medallaIconObtenida : styles.medallaIconBloqueada,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={m.obtenida ? 'medal' : 'lock-outline'}
                    size={28}
                    color={m.obtenida ? colors.secondary : colors.textMuted}
                  />
                </View>

                {/* Info de la medalla */}
                <View style={styles.medallaInfo}>
                  <View style={styles.medallaHeaderRow}>
                    <Text style={[styles.medallaTitulo, !m.obtenida && styles.medallaTituloBloqueado]}>
                      {m.titulo}
                    </Text>
                    {m.obtenida ? (
                      <View style={[styles.tagObtenidaBadge, { flexDirection: 'row', alignItems: 'center' }]}>
                        <MaterialCommunityIcons name="check" size={12} color="#81C784" style={{ marginRight: 3 }} />
                        <Text style={styles.tagObtenidaTexto}>DESBLOQUEADA</Text>
                      </View>
                    ) : (
                      <View style={[styles.tagBloqueadaBadge, { flexDirection: 'row', alignItems: 'center' }]}>
                        <MaterialCommunityIcons name="lock" size={11} color={colors.textMuted} style={{ marginRight: 3 }} />
                        <Text style={styles.tagBloqueadaTexto}>BLOQUEADA</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.medallaDesc}>{m.descripcion}</Text>

                  <View style={styles.requisitoRow}>
                    <MaterialCommunityIcons
                      name="flag-checkered"
                      size={13}
                      color={m.obtenida ? '#81C784' : colors.textMuted}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.requisitoTexto, m.obtenida && { color: '#A5D6A7' }]}>
                      {m.obtenida ? 'Mérito militar cumplido' : 'Requisito pendiente en combate'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
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
    borderLeftColor: colors.gold,
    marginBottom: 16,
  },
  resumenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resumenTitulo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resumenSubtitulo: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressValue: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.inputBg,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 4,
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
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  filtroTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  filtroTextoActivo: {
    color: colors.background,
    fontWeight: '900',
  },
  listaMedallas: {
    gap: 12,
  },
  medallaCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.disabled,
    alignItems: 'flex-start',
  },
  medallaCardObtenida: {
    borderColor: 'rgba(255, 179, 0, 0.35)',
    borderLeftColor: colors.gold,
  },
  medallaCardBloqueada: {
    opacity: 0.65,
    borderLeftColor: colors.disabled,
  },
  medallaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  medallaIconObtenida: {
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  medallaIconBloqueada: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  medallaInfo: {
    flex: 1,
  },
  medallaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  medallaTitulo: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  medallaTituloBloqueado: {
    color: colors.textSecondary,
  },
  tagObtenidaBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  tagObtenidaTexto: {
    color: '#81C784',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagBloqueadaBadge: {
    backgroundColor: colors.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tagBloqueadaTexto: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  medallaDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  requisitoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requisitoTexto: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  sinMedallasBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 20,
  },
  sinMedallasTitulo: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  sinMedallasDesc: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
