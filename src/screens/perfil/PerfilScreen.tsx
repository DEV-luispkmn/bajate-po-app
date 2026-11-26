import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  obtenerPerfilCompletoApi,
  actualizarPerfilApi,
  PerfilCompleto,
  PartidaHistorialItem,
} from '../../api/auth.service';
import { REGIONES_CHILE } from '../eventos/CrearEventoScreen';
import { ModalConfirmacionTactico } from '../../components/ModalConfirmacionTactico';
import { colors } from '../../theme/colors';
import { obtenerEstiloFama } from '../../utils/fama.util';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const ROLES_INFO: Record<string, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  ASALTO: { label: 'Asalto', icon: 'lightning-bolt' },
  CQB: { label: 'CQB', icon: 'door-open' },
  SNIPER: { label: 'Sniper', icon: 'crosshairs' },
  DMR: { label: 'DMR', icon: 'telescope' },
  APOYO: { label: 'Apoyo', icon: 'shield-plus' },
  MÉDICO: { label: 'Médico', icon: 'medical-bag' },
};

const TODOS_LOS_ROLES = ['ASALTO', 'CQB', 'SNIPER', 'DMR', 'APOYO', 'MÉDICO'];

const APODOS_TACTICOS_SUGERIDOS: {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  desbloqueadoPor: string;
  minEventos?: number;
  medallaReq?: string;
}[] = [
  { id: 'Pichón', label: 'Pichón', icon: 'egg-outline', desbloqueadoPor: 'Rango inicial por defecto', minEventos: 0 },
  { id: 'Combatiente', label: 'Combatiente', icon: 'shield-sword-outline', desbloqueadoPor: '1 partida oficial jugada', minEventos: 1 },
  { id: 'Punta de Lanza', label: 'Punta de Lanza', icon: 'lightning-bolt', desbloqueadoPor: '3 partidas oficiales jugadas', minEventos: 3 },
  { id: 'Campero Táctico', label: 'Campero', icon: 'nature', desbloqueadoPor: '5 partidas oficiales jugadas', minEventos: 5 },
  { id: 'Francotirador', label: 'Francotirador', icon: 'crosshairs', desbloqueadoPor: 'Medalla Tirador de Élite (5 rondas ganadas)', medallaReq: 'tirador' },
  { id: 'Fantasma', label: 'Fantasma', icon: 'ghost-outline', desbloqueadoPor: '8 partidas oficiales jugadas', minEventos: 8 },
  { id: 'Lobo Solitario', label: 'Lobo Solitario', icon: 'paw', desbloqueadoPor: '10 partidas jugadas', minEventos: 10 },
  { id: 'Veterano de Cancha', label: 'Veterano', icon: 'medal-outline', desbloqueadoPor: 'Medalla Veterano y 15 partidas', minEventos: 15, medallaReq: 'primera_partida' },
  { id: 'Leyenda / Inmortal', label: 'Inmortal', icon: 'crown-outline', desbloqueadoPor: '25 partidas oficiales jugadas', minEventos: 25 },
];

export const esApodoDesbloqueado = (
  apodoItem: typeof APODOS_TACTICOS_SUGERIDOS[0],
  perf: PerfilCompleto | null,
): boolean => {
  if (!perf) return false;
  if (!apodoItem.minEventos && !apodoItem.medallaReq) return true;
  const eventos = perf.estadisticas?.eventosParticipados || 0;
  if (apodoItem.minEventos && eventos < apodoItem.minEventos) return false;
  if (apodoItem.medallaReq) {
    const medalla = perf.medallas?.find((m) => m.id === apodoItem.medallaReq);
    if (!medalla || !medalla.obtenida) return false;
  }
  return true;
};

export const PerfilScreen = () => {
  const navigation = useNavigation();
  const { logout, recargarPerfil } = useAuth();
  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Modal para editar foto rápida con URL manual
  const [modalFotoVisible, setModalFotoVisible] = useState(false);
  const [nuevoAvatar, setNuevoAvatar] = useState('');
  const [guardandoFoto, setGuardandoFoto] = useState(false);

  // Modal Integral: MODIFICAR FICHA DE OPERADOR (Nick, Región, Ciudad, Rango, Roles)
  const [modalEditarFichaVisible, setModalEditarFichaVisible] = useState(false);
  const [editAlias, setEditAlias] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [editCiudad, setEditCiudad] = useState('');
  const [editRango, setEditRango] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [modalSelectorRegionVisible, setModalSelectorRegionVisible] = useState(false);
  const [guardandoFicha, setGuardandoFicha] = useState(false);
  const [errorFichaModal, setErrorFichaModal] = useState<string | null>(null);
  const [modalLogoutVisible, setModalLogoutVisible] = useState(false);
  const [avisoTactico, setAvisoTactico] = useState<{
    visible: boolean;
    titulo: string;
    mensaje: string;
    tipo: 'exito' | 'advertencia' | 'peligro';
    icono?: keyof typeof MaterialCommunityIcons.glyphMap;
  }>({
    visible: false,
    titulo: '',
    mensaje: '',
    tipo: 'exito',
  });

  const cargarPerfil = async () => {
    try {
      const data = await obtenerPerfilCompletoApi();
      setPerfil(data);
    } catch (error: any) {
      setAvisoTactico({
        visible: true,
        titulo: 'FALLO DE CONEXIÓN',
        mensaje: error.message || 'No se pudo cargar la ficha del operador.',
        tipo: 'peligro',
        icono: 'cloud-alert',
      });
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarPerfil();
    }, []),
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarPerfil();
  };

  const guardarAvatarEnBackend = async (avatarData: string) => {
    try {
      setGuardandoFoto(true);
      await actualizarPerfilApi({ avatarUrl: avatarData });
      await recargarPerfil();
      await cargarPerfil();
      setAvisoTactico({
        visible: true,
        titulo: 'FOTO ACTUALIZADA',
        mensaje: 'La foto de tu operador ha sido sincronizada en el sistema.',
        tipo: 'exito',
        icono: 'check-decagram',
      });
    } catch (error: any) {
      setAvisoTactico({
        visible: true,
        titulo: 'ERROR DE SINCRONIZACIÓN',
        mensaje: error.message || 'No se pudo sincronizar el avatar.',
        tipo: 'peligro',
        icono: 'alert-circle-outline',
      });
    } finally {
      setGuardandoFoto(false);
    }
  };

  const tomarFotoCamara = async () => {
    try {
      setModalFotoVisible(false);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setAvisoTactico({
          visible: true,
          titulo: 'PERMISO DENEGADO',
          mensaje: 'Se requiere permiso de acceso a la cámara para tomar tu foto táctica.',
          tipo: 'advertencia',
          icono: 'camera-off',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Image = asset.uri;
        if (asset.base64) {
          base64Image = `data:image/jpeg;base64,${asset.base64}`;
        }
        await guardarAvatarEnBackend(base64Image);
      }
    } catch (error: any) {
      setAvisoTactico({
        visible: true,
        titulo: 'ERROR AL CAPTURAR FOTO',
        mensaje: error.message || 'Ocurrió un problema al abrir la cámara táctica.',
        tipo: 'peligro',
        icono: 'camera-off',
      });
    }
  };

  const seleccionarFotoGaleria = async () => {
    try {
      setModalFotoVisible(false);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setAvisoTactico({
          visible: true,
          titulo: 'PERMISO DENEGADO',
          mensaje: 'Se requiere permiso de acceso a la galería para cambiar tu foto táctica.',
          tipo: 'advertencia',
          icono: 'image-off',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Image = asset.uri;
        if (asset.base64) {
          base64Image = `data:image/jpeg;base64,${asset.base64}`;
        }
        await guardarAvatarEnBackend(base64Image);
      }
    } catch (error: any) {
      setAvisoTactico({
        visible: true,
        titulo: 'ERROR AL SELECCIONAR IMAGEN',
        mensaje: error.message || 'Ocurrió un problema al acceder a la galería táctica.',
        tipo: 'peligro',
        icono: 'image-off',
      });
    }
  };

  const handleOpcionesAvatar = () => {
    setModalFotoVisible(true);
  };

  const handleActualizarAvatarManual = async () => {
    Keyboard.dismiss();
    if (!nuevoAvatar.trim()) return;
    await guardarAvatarEnBackend(nuevoAvatar.trim());
    setModalFotoVisible(false);
    setNuevoAvatar('');
  };

  // Apertura y Guardado de la Modificación Integral de Perfil (Configuración de Ficha)
  const abrirModalModificarPerfil = () => {
    if (!perfil) return;
    setEditAlias(perfil.alias);
    setEditRegion(perfil.region || 'Región Metropolitana');
    setEditCiudad(perfil.ciudad || '');
    setEditRango(perfil.rango || 'Pichón');
    const rolesArray = perfil.roles
      ? perfil.roles.split(',').map((r) => r.trim()).filter(Boolean)
      : ['ASALTO'];
    setEditRoles(rolesArray);
    setErrorFichaModal(null);
    setModalEditarFichaVisible(true);
  };

  const toggleEditRol = (rolId: string) => {
    if (editRoles.includes(rolId)) {
      if (editRoles.length === 1) {
        setErrorFichaModal('Debes conservar al menos 1 rol táctico en tu ficha.');
        return;
      }
      setErrorFichaModal(null);
      setEditRoles(editRoles.filter((r) => r !== rolId));
    } else {
      setErrorFichaModal(null);
      setEditRoles([...editRoles, rolId]);
    }
  };

  const handleGuardarFichaCompleta = async () => {
    Keyboard.dismiss();
    if (!editAlias.trim()) {
      setErrorFichaModal('El callsign o alias táctico no puede estar vacío.');
      return;
    }
    setErrorFichaModal(null);

    try {
      setGuardandoFicha(true);
      await actualizarPerfilApi({
        alias: editAlias.trim(),
        region: editRegion,
        ciudad: editCiudad.trim() || undefined,
        rango: editRango.trim() || undefined,
        roles: editRoles.join(','),
      });

      await recargarPerfil();
      await cargarPerfil();
      setModalEditarFichaVisible(false);
      setErrorFichaModal(null);
      setAvisoTactico({
        visible: true,
        titulo: 'FICHA ACTUALIZADA',
        mensaje: 'Los datos de tu operador fueron guardados y sincronizados en línea.',
        tipo: 'exito',
        icono: 'shield-check',
      });
    } catch (error: any) {
      setErrorFichaModal(error.message || 'No se pudieron guardar los cambios en la ficha.');
    } finally {
      setGuardandoFicha(false);
    }
  };

  const confirmarLogout = () => {
    setModalLogoutVisible(true);
  };

  if (cargando) {
    return (
      <View style={styles.centroCargando}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.textoCargando}>Cargando ficha del operador...</Text>
      </View>
    );
  }

  if (!perfil) {
    return (
      <View style={styles.centroCargando}>
        <Text style={styles.textoCargando}>No se pudo cargar la información.</Text>
      </View>
    );
  }

  const avatarSource = perfil.avatarUrl
    ? { uri: perfil.avatarUrl }
    : { uri: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400' };

  // Roles configurados del jugador
  const rolesActivos = perfil.roles
    ? perfil.roles.split(',').map((r) => r.trim()).filter(Boolean)
    : [perfil.estadisticas.rolPredilecto || 'ASALTO'];

  const estiloFama = obtenerEstiloFama(perfil.fama);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Tarjeta Superior: Foto, Callsign, Rango, Región y Botón de Edición */}
      <View style={styles.fichaHeaderCard}>
        <View style={styles.avatarWrapper}>
          <Image
            source={avatarSource}
            style={[styles.avatarImg, { borderColor: estiloFama.colorBorde }]}
          />
          <TouchableOpacity
            style={[styles.btnEditarAvatar, { borderColor: estiloFama.colorBorde }]}
            onPress={handleOpcionesAvatar}
            disabled={guardandoFoto}
          >
            {guardandoFoto ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialCommunityIcons name="camera" size={16} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.callsign, { color: estiloFama.colorTexto }]}>
          {perfil.alias.toUpperCase()}
        </Text>
        <Text style={styles.emailText}>{perfil.email}</Text>

        {/* Rango Oficial de Logro vs Apodo Personalizado */}
        {(() => {
          const rangoActual = perfil.rango || 'Pichón';
          const matchOficial = APODOS_TACTICOS_SUGERIDOS.find(
            (a) =>
              a.id.toLowerCase() === rangoActual.trim().toLowerCase() ||
              a.label.toLowerCase() === rangoActual.trim().toLowerCase(),
          );
          const esOficialDesbloqueado = matchOficial && esApodoDesbloqueado(matchOficial, perfil);

          if (esOficialDesbloqueado && matchOficial) {
            return (
              <View style={styles.rangoBadge}>
                <MaterialCommunityIcons
                  name={matchOficial.icon || 'shield-star-outline'}
                  size={15}
                  color={colors.secondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.textoRango}>{rangoActual.toUpperCase()}</Text>
              </View>
            );
          }

          // Si es un apodo personalizado, se muestra sin el logo de logro
          return (
            <View style={styles.apodoPersonalizadoBadge}>
              <Text style={styles.textoApodoPersonalizado}>{rangoActual.toUpperCase()}</Text>
            </View>
          );
        })()}

        {perfil.region && (
          <View style={styles.regionRow}>
            <MaterialCommunityIcons name="map-marker" size={15} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.textoRegion}>
              {perfil.region}
              {perfil.ciudad ? ` • ${perfil.ciudad}` : ''}
            </Text>
          </View>
        )}

        <Text style={styles.antiguedad}>
          En servicio desde {new Date(perfil.createdAt).toLocaleDateString()}
        </Text>

        {/* Botón Principal para Modificar Perfil Completo */}
        <TouchableOpacity
          style={styles.btnModificarPerfilCompleto}
          onPress={abrirModalModificarPerfil}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="account-cog" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.txtModificarPerfilCompleto}>MODIFICAR FICHA DE OPERADOR</Text>
        </TouchableOpacity>
      </View>

      {/* ROLES & ESPECIALIDADES TÁCTICAS */}
      <View style={styles.seccionCard}>
        <Text style={styles.seccionTitulo}>ESPECIALIDADES TÁCTICAS</Text>

        <View style={styles.rolesPerfilGrid}>
          {rolesActivos.map((rolId) => {
            const info = ROLES_INFO[rolId] || { label: rolId, icon: 'crosshairs' as const };
            return (
              <View key={rolId} style={styles.rolChipPerfil}>
                <MaterialCommunityIcons name={info.icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.rolTxtPerfil}>{info.label.toUpperCase()}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Tarjeta de Equipo / Escuadra */}
      <View style={styles.seccionCard}>
        <Text style={styles.seccionTitulo}>MI ESCUADRA / EQUIPO</Text>
        {perfil.equipo ? (
          <View>
            <View style={styles.equipoContenido}>
              {perfil.equipo.logoUrl ? (
                <Image source={{ uri: perfil.equipo.logoUrl }} style={styles.equipoLogoThumbPerfil} />
              ) : (
                <View style={styles.equipoIconoBox}>
                  <MaterialCommunityIcons name="shield-star" size={28} color={colors.primary} />
                </View>
              )}
              <View style={styles.equipoInfo}>
                <Text style={styles.equipoNombre}>{perfil.equipo.nombre}</Text>
                <Text style={styles.equipoDesc}>
                  {perfil.equipo.descripcion || 'Escuadra táctica oficial registrada'}
                </Text>
                <View style={styles.badgeMiembro}>
                  <Text style={styles.textoBadgeMiembro}>MIEMBRO OFICIAL</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.btnVerMiEquipoPerfil}
              onPress={() => (navigation as any).navigate('Equipos')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="shield-account" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.txtBtnVerMiEquipoPerfil}>VER DETALLES DE MI ESCUADRA</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sinEquipoBox}>
            <MaterialCommunityIcons name="shield-off-outline" size={36} color={colors.textMuted} style={{ marginBottom: 6 }} />
            <Text style={styles.sinEquipoTitulo}>Operador Libre (Lobo Solitario)</Text>
            <Text style={styles.sinEquipoDesc}>
              Aún no perteneces a ningún equipo oficial. Puedes explorar las escuadras de tu región o fundar tu propio equipo.
            </Text>
            <TouchableOpacity
              style={styles.btnBuscarCrearEquipoPerfil}
              onPress={() => (navigation as any).navigate('Equipos')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="shield-search" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.txtBtnBuscarCrearEquipoPerfil}>UNIRSE O CREAR EQUIPO</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Estadísticas Tácticas de Combate */}
      <View style={styles.seccionCard}>
        <Text style={styles.seccionTitulo}>ESTADÍSTICAS EN CAMPO</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumero}>{perfil.estadisticas.eventosParticipados}</Text>
            <Text style={styles.statLabel}>PARTIDAS</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statNumero, { color: colors.success }]}>
              {perfil.estadisticas.rondasGanadas}
            </Text>
            <Text style={styles.statLabel}>RONDAS GANADAS</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statNumero, { color: colors.gold }]}>
              {perfil.mvpsGanados ?? perfil.estadisticas.mvpsGanados ?? 0}
            </Text>
            <Text style={styles.statLabel}>MVPs GANADOS</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statNumero, { color: colors.primary }]}>
              {perfil.estadisticas.rolPredilecto}
            </Text>
            <Text style={styles.statLabel}>ROL MÁS JUGADO</Text>
          </View>
        </View>
      </View>

      {/* HISTORIAL DE OPERACIONES / PARTIDAS */}
      <View style={styles.seccionCard}>
        <View style={styles.seccionTituloRow}>
          <Text style={styles.seccionTitulo}>HISTORIAL DE OPERACIONES</Text>
          <Text style={styles.conteoHistorialBadge}>
            {perfil.historialPartidas?.length ?? 0} REGISTRADAS
          </Text>
        </View>

        {!perfil.historialPartidas || perfil.historialPartidas.length === 0 ? (
          <View style={styles.sinHistorialBox}>
            <MaterialCommunityIcons name="crosshairs" size={38} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.sinHistorialTitulo}>Sin partidas registradas aún</Text>
            <Text style={styles.sinHistorialDesc}>
              Participa en una pichanga o versus para registrar tus victorias y derrotas tácticas.
            </Text>
          </View>
        ) : (
          <View style={styles.historialLista}>
            {perfil.historialPartidas.slice(0, 3).map((item: PartidaHistorialItem) => {
              const esVictoria = item.resultado === 'VICTORIA';
              const esDerrota = item.resultado === 'DERROTA';
              const esEmpate = item.resultado === 'EMPATE';
              const bordeColor = esVictoria ? '#4CAF50' : esDerrota ? '#E53935' : '#FFB300';

              return (
                <View key={item.id} style={[styles.historialCard, { borderLeftColor: bordeColor }]}>
                  {/* Fila superior: Título del evento y Badge de resultado */}
                  <View style={styles.historialHeader}>
                    <Text style={styles.historialTituloEvento} numberOfLines={1}>
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

                  {/* Metadatos de la partida */}
                  <View style={styles.historialMetaGrid}>
                    <View style={styles.historialMetaItem}>
                      <MaterialCommunityIcons name="map-marker" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.historialMetaText} numberOfLines={1}>
                        {item.canchaNombre}
                      </Text>
                    </View>

                    <View style={styles.historialMetaItem}>
                      <MaterialCommunityIcons name="crosshairs" size={14} color={colors.secondary} style={{ marginRight: 4 }} />
                      <Text style={styles.historialMetaText}>
                        Marcador: <Text style={styles.marcadorTexto}>{item.marcador}</Text>
                      </Text>
                    </View>

                    <View style={styles.historialMetaItem}>
                      <MaterialCommunityIcons name="shield-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.historialMetaText} numberOfLines={1}>
                        {item.bandoNombre} • Rol: [{item.rol}]
                      </Text>
                    </View>

                    <View style={styles.historialMetaItem}>
                      <MaterialCommunityIcons name="calendar" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.historialMetaText}>
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

            {perfil.historialPartidas.length > 0 && (
              <TouchableOpacity
                style={styles.btnVerTodas}
                onPress={() =>
                  (navigation as any).navigate('HistorialCompleto', {
                    historial: perfil.historialPartidas,
                  })
                }
              >
                <Text style={styles.btnVerTodasTexto}>
                  VER HISTORIAL COMPLETO ({perfil.historialPartidas.length})
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Medallas y Condecoraciones */}
      <View style={styles.seccionCard}>
        <View style={styles.seccionTituloRow}>
          <Text style={styles.seccionTitulo}>MEDALLERO DE OPERACIONES</Text>
          <Text style={styles.conteoMedallasBadge}>
            {perfil.medallas?.filter((m) => m.obtenida).length ?? 0}/{perfil.medallas?.length ?? 0} DESBLOQUEADAS
          </Text>
        </View>

        <View style={styles.medallasLista}>
          {perfil.medallas.slice(0, 3).map((m) => (
            <View
              key={m.id}
              style={[
                styles.medallaItem,
                !m.obtenida && styles.medallaBloqueada,
                { borderLeftColor: m.obtenida ? colors.gold : colors.disabled },
              ]}
            >
              <MaterialCommunityIcons
                name="medal"
                size={26}
                color={m.obtenida ? colors.secondary : colors.textMuted}
                style={{ marginRight: 12 }}
              />
              <View style={styles.medallaInfo}>
                <View style={styles.medallaHeaderRow}>
                  <Text style={styles.medallaTitulo}>{m.titulo}</Text>
                  {m.obtenida ? (
                    <View style={styles.tagObtenidaBox}>
                      <MaterialCommunityIcons name="check-circle" size={12} color={colors.secondary} style={{ marginRight: 3 }} />
                      <Text style={styles.tagObtenida}>DESBLOQUEADA</Text>
                    </View>
                  ) : (
                    <View style={styles.tagBloqueadaBox}>
                      <MaterialCommunityIcons name="lock" size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
                      <Text style={styles.tagBloqueada}>BLOQUEADA</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.medallaDesc}>{m.descripcion}</Text>
              </View>
            </View>
          ))}

          {perfil.medallas.length > 0 && (
            <TouchableOpacity
              style={[styles.btnVerTodas, styles.btnVerTodasMedallas]}
              onPress={() =>
                (navigation as any).navigate('MedalleroCompleto', {
                  medallas: perfil.medallas,
                })
              }
            >
              <Text style={[styles.btnVerTodasTexto, styles.btnVerTodasTextoMedallas]}>
                VER MEDALLERO COMPLETO ({perfil.medallas.length})
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Botón Cerrar Sesión */}
      <TouchableOpacity style={styles.btnCerrarSesion} onPress={confirmarLogout}>
        <MaterialCommunityIcons name="logout" size={18} color={colors.danger} style={{ marginRight: 8 }} />
        <Text style={styles.textoCerrarSesion}>CERRAR SESIÓN</Text>
      </TouchableOpacity>

      {/* MODAL: MODIFICAR FICHA COMPLETA DE OPERADOR */}
      <Modal
        visible={modalEditarFichaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalEditarFichaVisible(false);
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
            <Pressable onPress={Keyboard.dismiss} accessible={false}>
              <Text style={styles.modalTitulo}>MODIFICAR FICHA DE OPERADOR</Text>
              <Text style={styles.modalSubtitulo}>
                Actualiza tu identidad, ubicación y especialidades en el radar táctico:
              </Text>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginBottom: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Pressable onPress={Keyboard.dismiss} accessible={false}>
                {/* Callsign / Nick */}
                <Text style={styles.inputModalLabel}>CALLSIGN / NICK DE COMBATE (*):</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="ej: DeltaBravo99"
                  placeholderTextColor={colors.textMuted}
                  value={editAlias}
                  onChangeText={(t) => {
                    if (errorFichaModal) setErrorFichaModal(null);
                    setEditAlias(t);
                  }}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                {/* Región de Chile */}
                <Text style={styles.inputModalLabel}>REGIÓN DE COMBATE (*):</Text>
                <TouchableOpacity
                  style={styles.dropdownModal}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalSelectorRegionVisible(true);
                  }}
                >
                  <Text style={styles.dropdownModalTxt}>{editRegion}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Ciudad / Comuna */}
                <Text style={styles.inputModalLabel}>CIUDAD / COMUNA:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="ej: Lampa / Viña del Mar / Concepción"
                  placeholderTextColor={colors.textMuted}
                  value={editCiudad}
                  onChangeText={setEditCiudad}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                {/* Apodo Táctico / Título de Cancha */}
                <Text style={styles.inputModalLabel}>TÍTULOS DE HONOR POR LOGRO:</Text>
                <Text style={styles.inputModalAyuda}>
                  Los títulos tácticos oficiales se desbloquean combatiendo. También puedes ingresar tu propio apodo personalizado abajo:
                </Text>
                <View style={styles.modalApodosGrid}>
                  {APODOS_TACTICOS_SUGERIDOS.map((item) => {
                    const desbloqueado = esApodoDesbloqueado(item, perfil);
                    const seleccionado =
                      editRango.trim().toLowerCase() === item.id.toLowerCase() ||
                      editRango.trim().toLowerCase() === item.label.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.modalApodoChip,
                          seleccionado && styles.modalApodoChipActivo,
                          !desbloqueado && styles.modalApodoChipBloqueado,
                        ]}
                        onPress={() => {
                          Keyboard.dismiss();
                          if (!desbloqueado) {
                            setAvisoTactico({
                              visible: true,
                              titulo: 'TÍTULO BLOQUEADO',
                              mensaje: `"${item.label}" es un título táctico oficial que se desbloquea por mérito en combate:\n\nRequisito: ${item.desbloqueadoPor}.\n\n¡Sigue combatiendo o escribe tu apodo personalizado abajo!`,
                              tipo: 'advertencia',
                              icono: 'lock-outline',
                            });
                            return;
                          }
                          setEditRango(item.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={desbloqueado ? item.icon : 'lock-outline'}
                          size={14}
                          color={
                            seleccionado
                              ? '#fff'
                              : desbloqueado
                              ? colors.textMuted
                              : 'rgba(255,255,255,0.3)'
                          }
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.modalApodoTxt,
                            seleccionado && styles.modalApodoTxtActivo,
                            !desbloqueado && styles.modalApodoTxtBloqueado,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {seleccionado && (
                          <MaterialCommunityIcons
                            name="check"
                            size={14}
                            color="#fff"
                            style={{ marginLeft: 3 }}
                          />
                        )}
                        {!desbloqueado && (
                          <MaterialCommunityIcons
                            name="lock"
                            size={11}
                            color="rgba(255,255,255,0.35)"
                            style={{ marginLeft: 3 }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.inputModalLabel, { marginTop: 6 }]}>
                  O ESCRIBE UN APODO PERSONALIZADO:
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="ej: Jedi / Lobo Gris / Halcón"
                  placeholderTextColor={colors.textMuted}
                  value={editRango}
                  onChangeText={setEditRango}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                {/* Roles / Especialidades */}
                <Text style={styles.inputModalLabel}>ESPECIALIDADES TÁCTICAS QUE DOMINAS:</Text>
                <View style={styles.modalRolesGrid}>
                  {TODOS_LOS_ROLES.map((rolId) => {
                    const activo = editRoles.includes(rolId);
                    const info = ROLES_INFO[rolId];
                    return (
                      <TouchableOpacity
                        key={rolId}
                        style={[styles.modalRolChip, activo && styles.modalRolChipActivo]}
                        onPress={() => toggleEditRol(rolId)}
                      >
                        <MaterialCommunityIcons
                          name={info.icon}
                          size={18}
                          color={activo ? '#fff' : colors.textMuted}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.modalRolTxt, activo && styles.modalRolTxtActivo]}>
                          {info.label}
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
              </Pressable>
            </ScrollView>

            {errorFichaModal ? (
              <View style={styles.bannerErrorModal}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.txtErrorModal}>{errorFichaModal}</Text>
              </View>
            ) : null}

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => {
                  Keyboard.dismiss();
                  setErrorFichaModal(null);
                  setModalEditarFichaVisible(false);
                }}
                disabled={guardandoFicha}
              >
                <Text style={styles.modalTxtCancelar}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnGuardar}
                onPress={handleGuardarFichaCompleta}
                disabled={guardandoFicha}
              >
                {guardandoFicha ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="content-save" size={16} color="#fff" />
                    <Text style={styles.modalTxtGuardar}>GUARDAR CAMBIOS</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL SELECTOR DE REGIÓN */}
      <Modal
        visible={modalSelectorRegionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalSelectorRegionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <Text style={styles.modalTitulo}>SELECCIONA TU REGIÓN</Text>
            <ScrollView style={{ marginBottom: 12 }}>
              {REGIONES_CHILE.map((reg) => (
                <TouchableOpacity
                  key={reg}
                  style={[
                    styles.modalRegionItem,
                    reg === editRegion && styles.modalRegionItemActivo,
                  ]}
                  onPress={() => {
                    setEditRegion(reg);
                    setModalSelectorRegionVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalRegionTexto,
                      reg === editRegion && styles.modalRegionTextoActivo,
                    ]}
                  >
                    {reg}
                  </Text>
                  {reg === editRegion && (
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
              style={styles.modalBtnCancelar}
              onPress={() => setModalSelectorRegionVisible(false)}
            >
              <Text style={styles.modalTxtCancelar}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para editar Avatar con Cámara, Galería o URL */}
      <Modal
        visible={modalFotoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalFotoVisible(false);
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
            <Pressable onPress={Keyboard.dismiss} accessible={false}>
              <Text style={styles.modalTitulo}>ACTUALIZAR FOTO DE OPERADOR</Text>
              <Text style={styles.modalSubtitulo}>
                Elige cómo deseas actualizar tu avatar táctico:
              </Text>
            </Pressable>

            {/* Acciones Rápidas: Cámara y Galería */}
            <View style={styles.modalAvatarOpcionesRow}>
              <TouchableOpacity
                style={styles.modalBtnCamara}
                onPress={tomarFotoCamara}
                disabled={guardandoFoto}
              >
                <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                <Text style={styles.modalTxtCamara}>TOMAR FOTO</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnGaleria}
                onPress={seleccionarFotoGaleria}
                disabled={guardandoFoto}
              >
                <MaterialCommunityIcons name="image" size={20} color="#fff" />
                <Text style={styles.modalTxtGaleria}>GALERÍA</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSeparadorRow}>
              <View style={styles.modalSeparadorLinea} />
              <Text style={styles.modalSeparadorTexto}>O MEDIANTE ENLACE WEB</Text>
              <View style={styles.modalSeparadorLinea} />
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="https://ejemplo.com/mifoto.jpg"
              placeholderTextColor={colors.textMuted}
              value={nuevoAvatar}
              onChangeText={setNuevoAvatar}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => {
                  Keyboard.dismiss();
                  setModalFotoVisible(false);
                }}
              >
                <Text style={styles.modalTxtCancelar}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnGuardar}
                onPress={handleActualizarAvatarManual}
                disabled={guardandoFoto || !nuevoAvatar.trim()}
              >
                {guardandoFoto ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTxtGuardar}>GUARDAR URL</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Táctico de Cierre de Sesión */}
      <ModalConfirmacionTactico
        visible={modalLogoutVisible}
        titulo="¿ABANDONAR LA ESTACIÓN?"
        mensaje="¿Estás seguro de que deseas cerrar tu sesión de combate y desvincular este dispositivo?"
        textoConfirmar="CERRAR SESIÓN"
        textoCancelar="PERMANECER"
        tipo="peligro"
        icono="logout-variant"
        onConfirmar={() => {
          setModalLogoutVisible(false);
          logout();
        }}
        onCancelar={() => setModalLogoutVisible(false)}
      />

      {/* Modal Táctico de Avisos y Notificaciones del Sistema */}
      <ModalConfirmacionTactico
        visible={avisoTactico.visible}
        titulo={avisoTactico.titulo}
        mensaje={avisoTactico.mensaje}
        textoConfirmar="ENTENDIDO"
        tipo={avisoTactico.tipo}
        icono={avisoTactico.icono}
        soloAceptar
        onConfirmar={() => setAvisoTactico((prev) => ({ ...prev, visible: false }))}
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
    paddingTop: 50,
    paddingBottom: 40,
  },
  centroCargando: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCargando: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 13,
  },
  fichaHeaderCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  btnEditarAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconoLapiz: {
    fontSize: 16,
  },
  callsign: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emailText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  rangoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  apodoPersonalizadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  textoApodoPersonalizado: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  iconoRango: {
    fontSize: 14,
    marginRight: 6,
  },
  textoRango: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  iconoRegion: {
    fontSize: 12,
    marginRight: 4,
  },
  textoRegion: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  antiguedad: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  btnModificarPerfilCompleto: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
    width: '100%',
    alignItems: 'center',
  },
  txtModificarPerfilCompleto: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  seccionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  seccionTituloRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seccionTitulo: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  btnEditarRolesTxt: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  rolesPerfilGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolChipPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  rolIconPerfil: {
    fontSize: 14,
  },
  rolTxtPerfil: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  conteoHistorialBadge: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  conteoMedallasBadge: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  btnVerTodas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 6,
    gap: 6,
  },
  btnVerTodasTexto: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnVerTodasMedallas: {
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
    borderColor: 'rgba(255, 179, 0, 0.25)',
  },
  btnVerTodasTextoMedallas: {
    color: colors.secondary,
  },
  equipoContenido: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipoIconoBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  equipoIcono: {
    fontSize: 24,
  },
  equipoInfo: {
    flex: 1,
  },
  equipoNombre: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  equipoDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  badgeMiembro: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  textoBadgeMiembro: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  equipoLogoThumbPerfil: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginRight: 14,
  },
  btnVerMiEquipoPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
  },
  txtBtnVerMiEquipoPerfil: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnBuscarCrearEquipoPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  txtBtnBuscarCrearEquipoPerfil: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sinEquipoBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sinEquipoIcono: {
    fontSize: 32,
    marginBottom: 8,
  },
  sinEquipoTitulo: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  sinEquipoDesc: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statNumero: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sinHistorialBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  sinHistorialIcono: {
    fontSize: 30,
    marginBottom: 8,
  },
  sinHistorialTitulo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  sinHistorialDesc: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  historialLista: {
    gap: 12,
  },
  historialCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  historialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historialTituloEvento: {
    color: colors.text,
    fontSize: 14,
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
  historialMetaGrid: {
    gap: 6,
  },
  historialMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historialMetaIcon: {
    fontSize: 12,
    marginRight: 6,
    width: 16,
  },
  historialMetaText: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  marcadorTexto: {
    color: colors.text,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  medallasLista: {
    gap: 10,
  },
  medallaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.disabled,
  },
  medallaBloqueada: {
    opacity: 0.45,
  },
  medallaIcono: {
    fontSize: 28,
    marginRight: 12,
  },
  medallaInfo: {
    flex: 1,
  },
  medallaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  medallaTitulo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  tagObtenidaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagBloqueadaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagObtenida: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagBloqueada: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  medallaDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  btnCerrarSesion: {
    backgroundColor: 'rgba(229, 62, 62, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  textoCerrarSesion: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
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
    lineHeight: 16,
  },
  inputModalLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inputModalAyuda: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 8,
  },
  modalApodosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  modalApodoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  modalApodoChipActivo: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
  },
  modalApodoChipBloqueado: {
    opacity: 0.45,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalApodoTxt: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  modalApodoTxtActivo: {
    color: colors.secondary,
    fontWeight: '800',
  },
  modalApodoTxtBloqueado: {
    color: 'rgba(255,255,255,0.3)',
  },
  modalApodoCheck: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 3,
  },
  modalInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  dropdownModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  dropdownModalTxt: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownFlecha: {
    color: colors.primary,
    fontSize: 12,
  },
  avatarEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarEditPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  btnFotoModal: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
  },
  txtFotoModal: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalRolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modalRolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  modalRolChipActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(224, 109, 40, 0.18)',
  },
  modalRolIcon: {
    fontSize: 14,
  },
  modalRolTxt: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalRolTxtActivo: {
    color: colors.primary,
    fontWeight: '800',
  },
  modalRolCheck: {
    color: colors.primary,
    fontSize: 13,
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
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalBtnCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
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
    justifyContent: 'center',
  },
  modalTxtGuardar: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  modalAvatarOpcionesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modalBtnCamara: {
    flex: 1,
    backgroundColor: '#2d6a4f',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalTxtCamara: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalBtnGaleria: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalTxtGaleria: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalSeparadorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  modalSeparadorLinea: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  modalSeparadorTexto: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bannerErrorModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  txtErrorModal: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
});
