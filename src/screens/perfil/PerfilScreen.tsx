import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
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
import { colors } from '../../theme/colors';
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

const APODOS_TACTICOS_SUGERIDOS: { id: string; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'Pichón', label: 'Pichón', icon: 'egg-outline' },
  { id: 'Combatiente', label: 'Combatiente', icon: 'shield-sword-outline' },
  { id: 'Punta de Lanza', label: 'Punta de Lanza', icon: 'lightning-bolt' },
  { id: 'Campero Táctico', label: 'Campero', icon: 'nature' },
  { id: 'Francotirador', label: 'Francotirador', icon: 'crosshairs' },
  { id: 'Fantasma', label: 'Fantasma', icon: 'ghost-outline' },
  { id: 'Lobo Solitario', label: 'Lobo Solitario', icon: 'paw' },
  { id: 'Veterano de Cancha', label: 'Veterano', icon: 'medal-outline' },
  { id: 'Leyenda / Inmortal', label: 'Inmortal', icon: 'crown-outline' },
];

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

  const cargarPerfil = async () => {
    try {
      const data = await obtenerPerfilCompletoApi();
      setPerfil(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cargar la ficha del operador');
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
      Alert.alert('¡Excelente!', 'Foto de operador actualizada y sincronizada en línea.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo sincronizar el avatar');
    } finally {
      setGuardandoFoto(false);
    }
  };

  const seleccionarFotoGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso denegado',
          'Se requiere permiso de acceso a la galería para cambiar tu foto táctica.',
        );
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
      Alert.alert('Error al seleccionar imagen', error.message || 'Ocurrió un problema');
    }
  };

  const handleOpcionesAvatar = () => {
    Alert.alert(
      'Actualizar Foto de Operador',
      'Elige el método para actualizar tu foto táctica:',
      [
        {
          text: 'ELEGIR DE MI TELÉFONO (GALERÍA)',
          onPress: seleccionarFotoGaleria,
        },
        {
          text: 'INGRESAR URL DE IMAGEN',
          onPress: () => setModalFotoVisible(true),
        },
        { text: 'CANCELAR', style: 'cancel' },
      ],
    );
  };

  const handleActualizarAvatarManual = async () => {
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
    setModalEditarFichaVisible(true);
  };

  const toggleEditRol = (rolId: string) => {
    if (editRoles.includes(rolId)) {
      if (editRoles.length === 1) {
        Alert.alert('Atención', 'Debes conservar al menos 1 rol en tu ficha.');
        return;
      }
      setEditRoles(editRoles.filter((r) => r !== rolId));
    } else {
      setEditRoles([...editRoles, rolId]);
    }
  };

  const handleGuardarFichaCompleta = async () => {
    if (!editAlias.trim()) {
      Alert.alert('Atención', 'El alias o callsign no puede estar vacío.');
      return;
    }

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
      Alert.alert('🎯 ¡FICHA ACTUALIZADA!', 'Los datos de tu operador fueron guardados y sincronizados en línea.');
    } catch (error: any) {
      Alert.alert('Error al actualizar', error.message || 'No se pudieron guardar los cambios');
    } finally {
      setGuardandoFicha(false);
    }
  };

  const confirmarLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Deseas desvincularte de la estación táctica?',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { text: 'SALIR', style: 'destructive', onPress: logout },
      ],
    );
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
          <Image source={avatarSource} style={styles.avatarImg} />
          <TouchableOpacity
            style={styles.btnEditarAvatar}
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

        <Text style={styles.callsign}>{perfil.alias.toUpperCase()}</Text>
        <Text style={styles.emailText}>{perfil.email}</Text>

        <View style={styles.rangoBadge}>
          <MaterialCommunityIcons name="shield-star-outline" size={15} color={colors.secondary} style={{ marginRight: 4 }} />
          <Text style={styles.textoRango}>{(perfil.rango || 'Pichón').toUpperCase()}</Text>
        </View>

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
              <Text style={styles.txtBtnVerMiEquipoPerfil}>VER DETALLES DE MI ESCUADRA 🛡️</Text>
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
              <Text style={styles.txtBtnBuscarCrearEquipoPerfil}>UNIRSE O CREAR EQUIPO 🛡️</Text>
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
            {perfil.historialPartidas.map((item: PartidaHistorialItem) => {
              const esVictoria = item.resultado === 'VICTORIA';
              const esDerrota = item.resultado === 'DERROTA';
              const esEmpate = item.resultado === 'EMPATE';

              return (
                <View key={item.id} style={styles.historialCard}>
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
          </View>
        )}
      </View>

      {/* Medallas y Condecoraciones */}
      <View style={styles.seccionCard}>
        <Text style={styles.seccionTitulo}>MEDALLERO DE OPERACIONES</Text>
        <View style={styles.medallasLista}>
          {perfil.medallas.map((m) => (
            <View
              key={m.id}
              style={[
                styles.medallaItem,
                !m.obtenida && styles.medallaBloqueada,
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
                    <Text style={styles.tagObtenida}>✓ DESBLOQUEADA</Text>
                  ) : (
                    <Text style={styles.tagBloqueada}>🔒 BLOQUEADA</Text>
                  )}
                </View>
                <Text style={styles.medallaDesc}>{m.descripcion}</Text>
              </View>
            </View>
          ))}
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
        onRequestClose={() => setModalEditarFichaVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '88%' }]}>
            <Text style={styles.modalTitulo}>MODIFICAR FICHA DE OPERADOR</Text>
            <Text style={styles.modalSubtitulo}>
              Actualiza tu identidad, ubicación y especialidades en el radar táctico:
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {/* Callsign / Nick */}
              <Text style={styles.inputModalLabel}>CALLSIGN / NICK DE COMBATE (*):</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ej: DeltaBravo99"
                placeholderTextColor={colors.textMuted}
                value={editAlias}
                onChangeText={setEditAlias}
                autoCapitalize="none"
              />

              {/* Región de Chile */}
              <Text style={styles.inputModalLabel}>REGIÓN DE COMBATE (*):</Text>
              <TouchableOpacity
                style={styles.dropdownModal}
                onPress={() => setModalSelectorRegionVisible(true)}
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
              />

              {/* Apodo Táctico / Título de Cancha */}
              <Text style={styles.inputModalLabel}>APODO TÁCTICO / TÍTULO DE CANCHA 🎖️:</Text>
              <Text style={styles.inputModalAyuda}>
                Selecciona tu apodo característico de airsoft o escribe uno personalizado:
              </Text>
              <View style={styles.modalApodosGrid}>
                {APODOS_TACTICOS_SUGERIDOS.map((item) => {
                  const seleccionado = editRango === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.modalApodoChip, seleccionado && styles.modalApodoChipActivo]}
                      onPress={() => setEditRango(item.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={14}
                        color={seleccionado ? '#fff' : colors.textMuted}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.modalApodoTxt, seleccionado && styles.modalApodoTxtActivo]}>
                        {item.label}
                      </Text>
                      {seleccionado && <Text style={styles.modalApodoCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="ej: Pichón / Francotirador / Veterano"
                placeholderTextColor={colors.textMuted}
                value={editRango}
                onChangeText={setEditRango}
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
                      {activo && <Text style={styles.modalRolCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalEditarFichaVisible(false)}
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
                  <Text style={styles.modalTxtGuardar}>GUARDAR CAMBIOS 🎯</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
                  {reg === editRegion && <Text style={styles.modalRegionCheck}>✓</Text>}
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

      {/* Modal para editar Avatar rápido mediante URL */}
      <Modal
        visible={modalFotoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalFotoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>ACTUALIZAR FOTO DE PERFIL</Text>
            <Text style={styles.modalSubtitulo}>
              Pega la URL de tu imagen o foto táctica:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="https://ejemplo.com/mifoto.jpg"
              placeholderTextColor={colors.textMuted}
              value={nuevoAvatar}
              onChangeText={setNuevoAvatar}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalFotoVisible(false)}
              >
                <Text style={styles.modalTxtCancelar}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnGuardar}
                onPress={handleActualizarAvatarManual}
                disabled={guardandoFoto}
              >
                {guardandoFoto ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTxtGuardar}>GUARDAR</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
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
    letterSpacing: 0.5,
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
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statNumero: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
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
  tagObtenida: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
  tagBloqueada: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  medallaDesc: {
    color: colors.textSecondary,
    fontSize: 11,
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
  modalApodoTxt: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  modalApodoTxtActivo: {
    color: colors.secondary,
    fontWeight: '800',
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
});
