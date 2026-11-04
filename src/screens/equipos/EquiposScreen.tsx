import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { REGIONES_CHILE } from '../eventos/CrearEventoScreen';
import {
  Equipo,
  MiembroEquipo,
  listarEquiposApi,
  obtenerMiEquipoApi,
  crearEquipoApi,
  unirseEquipoApi,
  unirsePorCodigoApi,
  salirEquipoApi,
  desintegrarEquipoApi,
  cambiarPostulacionesApi,
  asignarTLApi,
} from '../../api/equipos.service';

export const EquiposScreen = () => {
  const { jugador, recargarPerfil } = useAuth();

  // Pestaña Principal (EXPLORAR vs MI EQUIPO)
  const [tabActual, setTabActual] = useState<'EXPLORAR' | 'MI_EQUIPO'>('EXPLORAR');

  // Estados de datos
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [miEquipo, setMiEquipo] = useState<Equipo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Filtros de Exploración
  const [regionFiltro, setRegionFiltro] = useState<string>('TODAS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [modalRegionVisible, setModalRegionVisible] = useState(false);

  // Modal Detalle de Equipo
  const [equipoDetalle, setEquipoDetalle] = useState<Equipo | null>(null);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [uniendose, setUniendose] = useState(false);

  // Modal Crear Equipo
  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [crearNombre, setCrearNombre] = useState('');
  const [crearLema, setCrearLema] = useState('');
  const [crearDescripcion, setCrearDescripcion] = useState('');
  const [crearRegion, setCrearRegion] = useState(jugador?.region || 'Región Metropolitana');
  const [crearCiudad, setCrearCiudad] = useState(jugador?.ciudad || '');
  const [crearLogoUrl, setCrearLogoUrl] = useState('');
  const [modalRegionCrearVisible, setModalRegionCrearVisible] = useState(false);
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);

  // Modal Unirse por Código
  const [modalCodigoVisible, setModalCodigoVisible] = useState(false);
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [procesandoCodigo, setProcesandoCodigo] = useState(false);

  // Gestión TL (Team Leader)
  const [cambiandoPostulaciones, setCambiandoPostulaciones] = useState(false);

  useEffect(() => {
    if (jugador?.region) {
      setCrearRegion(jugador.region);
    }
  }, [jugador?.region]);

  const cargarDatos = async () => {
    try {
      const [resEquipos, resMiEquipo] = await Promise.all([
        listarEquiposApi({
          region: regionFiltro === 'TODAS' ? undefined : regionFiltro,
          search: busqueda.trim() || undefined,
        }),
        obtenerMiEquipoApi().catch(() => null),
      ]);

      setEquipos(resEquipos);
      setMiEquipo(resMiEquipo);
    } catch (error: any) {
      console.warn('Error al cargar equipos:', error);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [regionFiltro, busqueda, jugador?.region]),
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarDatos();
  };

  // Selección de Foto de Logo para el Equipo
  const handleSeleccionarLogoGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Requerido', 'Se necesita acceso a la galería para subir el logo de tu escuadra.');
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
        let base64Uri = asset.uri;
        if (asset.base64) {
          base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        }
        setCrearLogoUrl(base64Uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cargar la imagen');
    }
  };

  // Crear Equipo Oficial
  const handleCrearEquipo = async () => {
    if (!crearNombre.trim()) {
      Alert.alert('Atención', 'El nombre de la escuadra es obligatorio.');
      return;
    }

    try {
      setGuardandoEquipo(true);
      const nuevo = await crearEquipoApi({
        nombre: crearNombre.trim(),
        lema: crearLema.trim() || undefined,
        descripcion: crearDescripcion.trim() || undefined,
        region: crearRegion,
        ciudad: crearCiudad.trim() || undefined,
        logoUrl: crearLogoUrl || undefined,
      });

      setModalCrearVisible(false);
      setCrearNombre('');
      setCrearLema('');
      setCrearDescripcion('');
      setCrearLogoUrl('');

      Alert.alert(
        '🎖️ ¡ESCUADRA FUNDADA!',
        `Has creado exitosamente "${nuevo.nombre}". Eres el Fundador y Team Leader (TL) inicial de la escuadra.`,
      );

      setTabActual('MI_EQUIPO');
      await cargarDatos();
      if (recargarPerfil) {
        await recargarPerfil();
      }
    } catch (error: any) {
      Alert.alert('Error al fundar equipo', error.message || 'Ocurrió un error');
    } finally {
      setGuardandoEquipo(false);
    }
  };

  // Unirse a un Equipo
  const handleUnirmeEquipo = async (equipo: Equipo) => {
    Alert.alert(
      '🛡️ ¿ALISTARTE A ESTA ESCUADRA?',
      `¿Deseas sumarte formalmente a las filas de "${equipo.nombre}"?${
        miEquipo ? `\n\n(Dejarás de pertenecer a "${miEquipo.nombre}")` : ''
      }`,
      [
        { text: 'CANCELAR', style: 'cancel' },
        {
          text: 'CONFIRMAR Y ALISTARME',
          onPress: async () => {
            try {
              setUniendose(true);
              const actualizado = await unirseEquipoApi(equipo.id);
              setModalDetalleVisible(false);
              Alert.alert('¡Bienvenido camarada!', `Ahora formas parte de "${actualizado.nombre}".`);
              setTabActual('MI_EQUIPO');
              await cargarDatos();
              if (recargarPerfil) {
                await recargarPerfil();
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo completar el alistamiento');
            } finally {
              setUniendose(false);
            }
          },
        },
      ],
    );
  };

  // Unirse por Código
  const handleUnirsePorCodigo = async () => {
    if (!codigoIngresado.trim()) {
      Alert.alert('Atención', 'Ingresa el código táctico de 6 caracteres.');
      return;
    }

    try {
      setProcesandoCodigo(true);
      const equipo = await unirsePorCodigoApi(codigoIngresado.trim().toUpperCase());
      setModalCodigoVisible(false);
      setCodigoIngresado('');
      Alert.alert('¡Alistamiento Exitoso!', `Te has sumado a la escuadra "${equipo.nombre}".`);
      setTabActual('MI_EQUIPO');
      await cargarDatos();
      if (recargarPerfil) {
        await recargarPerfil();
      }
    } catch (error: any) {
      Alert.alert('Error de Código', error.message || 'Código inválido o equipo no encontrado.');
    } finally {
      setProcesandoCodigo(false);
    }
  };

  // Salir del Equipo
  const handleSalirEquipo = () => {
    if (!miEquipo) return;

    Alert.alert(
      '⚠️ ¿DESVINCULARTE DE TU ESCUADRA?',
      `¿Estás seguro de que deseas salir de "${miEquipo.nombre}"?\nQuedarás registrado como operador libre (Lobo Solitario).`,
      [
        { text: 'CANCELAR', style: 'cancel' },
        {
          text: 'SÍ, DESVINCULARME',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              await salirEquipoApi();
              Alert.alert('Desvinculación Completa', 'Has abandonado la escuadra.');
              setMiEquipo(null);
              await cargarDatos();
              if (recargarPerfil) {
                await recargarPerfil();
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo salir del equipo');
            } finally {
              setCargando(false);
            }
          },
        },
      ],
    );
  };

  // Desintegrar el Equipo (Exclusivo para el Team Leader / Fundador)
  const handleDesintegrarEquipo = () => {
    if (!miEquipo) return;
    const esUnico = (miEquipo.totalMiembros || 0) <= 1;

    Alert.alert(
      '💥 ¿DESINTEGRAR ESCUADRA?',
      esUnico
        ? `Eres el único operador y Team Leader de "${miEquipo.nombre}".\n\nAl desintegrar el equipo, este se eliminará definitivamente del sistema y del radar táctico.\n\n¿Estás seguro de que deseas desintegrar la escuadra?`
        : `Eres el Team Leader (TL) de "${miEquipo.nombre}".\n\n⚠️ ¡ESTA ACCIÓN ES DEFINITIVA!\nDisolverás la escuadra por completo, desvinculando a los ${miEquipo.totalMiembros} operadores activos y eliminando su registro de forma permanente.\n\n(Si deseas salirte sin disolver el equipo, primero transfiere el mando de TL a otro operador usando el botón "NOMBRAR TL ⭐").\n\n¿Confirmas la desintegración?`,
      [
        { text: 'CANCELAR', style: 'cancel' },
        {
          text: 'SÍ, DESINTEGRAR ESCUADRA',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              const res = await desintegrarEquipoApi();
              Alert.alert('💥 Escuadra Desintegrada', res.mensaje || 'La escuadra ha sido desintegrada.');
              setMiEquipo(null);
              setTabActual('EXPLORAR');
              await cargarDatos();
              if (recargarPerfil) {
                await recargarPerfil();
              }
            } catch (error: any) {
              Alert.alert('Error al desintegrar', error.message || 'No se pudo desintegrar la escuadra');
            } finally {
              setCargando(false);
            }
          },
        },
      ],
    );
  };

  // Control TL: Abrir o Cerrar Postulaciones
  const handleTogglePostulaciones = async () => {
    if (!miEquipo) return;
    const nuevoEstado = !miEquipo.postulacionesAbiertas;
    try {
      setCambiandoPostulaciones(true);
      await cambiarPostulacionesApi(nuevoEstado);
      Alert.alert(
        'Postulaciones Actualizadas',
        nuevoEstado
          ? 'Las postulaciones ahora están ABIERTAS. Cualquier operador podrá solicitar unirse desde Explorar.'
          : 'Las postulaciones ahora están CERRADAS. Los nuevos operadores solo podrán ingresar con tu código de reclutamiento oficial.',
      );
      cargarDatos();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cambiar el estado de postulaciones');
    } finally {
      setCambiandoPostulaciones(false);
    }
  };

  // Control TL: Nombrar a otro camarada como Team Leader (TL)
  const handleNombrarTl = (miembro: MiembroEquipo) => {
    if (!miEquipo) return;
    Alert.alert(
      '⭐ ¿NOMBRAR COMO TEAM LEADER (TL)?',
      `¿Deseas ceder el mando de Team Leader a "${miembro.alias}"?\n\nTendrá el rango más alto para la gestión del equipo y el control de postulaciones.`,
      [
        { text: 'CANCELAR', style: 'cancel' },
        {
          text: 'SÍ, NOMBRAR COMO TL',
          onPress: async () => {
            try {
              await asignarTLApi(miembro.id);
              Alert.alert('¡Nuevo TL Designado!', `${miembro.alias} es ahora el Team Leader oficial de la escuadra.`);
              cargarDatos();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo designar al nuevo TL');
            }
          },
        },
      ],
    );
  };

  // Compartir Código del Equipo
  const handleCompartirCodigoEquipo = async () => {
    if (!miEquipo?.codigoAcceso) return;
    try {
      await Share.share({
        message: `🇨🇱 *BÁJATE PO! AIRSOFT CHILE* 🇨🇱\n\n🛡️ *Únete a mi escuadra táctica:* *${miEquipo.nombre}*\n📍 *Región:* ${miEquipo.region || 'Chile'}\n🔑 *Código de reclutamiento:* *${miEquipo.codigoAcceso}*\n\nIngresa este código en la app Bájate Po! para sumarte a nuestras filas.`,
        title: `Reclutamiento: ${miEquipo.nombre}`,
      });
    } catch {}
  };

  // Render Tarjeta de Equipo en la Lista
  const renderItemEquipo = ({ item }: { item: Equipo }) => {
    const esMiEquipo = miEquipo?.id === item.id;

    return (
      <View style={[styles.equipoCard, esMiEquipo && styles.equipoCardPropio]}>
        <View style={styles.equipoCardHeader}>
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} style={styles.equipoLogoThumb} />
          ) : (
            <View style={styles.equipoLogoPlaceholder}>
              <MaterialCommunityIcons name="shield-account" size={26} color={colors.primary} />
            </View>
          )}

          <View style={styles.equipoHeaderInfo}>
            <View style={styles.equipoTituloRow}>
              <Text style={styles.equipoNombre} numberOfLines={1}>
                {item.nombre}
              </Text>
              {esMiEquipo && (
                <View style={styles.badgeMiEquipoMini}>
                  <Text style={styles.txtMiEquipoMini}>TU ESCUADRA</Text>
                </View>
              )}
            </View>

            {item.lema ? (
              <Text style={styles.equipoLema} numberOfLines={1}>
                "{item.lema}"
              </Text>
            ) : null}

            <View style={styles.equipoMetaRow}>
              <MaterialCommunityIcons name="map-marker" size={13} color={colors.textSecondary} />
              <Text style={styles.equipoMetaTexto} numberOfLines={1}>
                {item.ciudad ? `${item.ciudad}, ` : ''}
                {item.region || 'Chile'}
              </Text>
            </View>

            {/* Badge de Postulaciones Abiertas / Cerradas */}
            <View style={styles.badgePostulacionesRow}>
              {item.postulacionesAbiertas ? (
                <View style={styles.badgePostulacionesAbiertas}>
                  <Text style={styles.txtPostulacionesAbiertas}>🟢 POSTULACIONES ABIERTAS</Text>
                </View>
              ) : (
                <View style={styles.badgePostulacionesCerradas}>
                  <Text style={styles.txtPostulacionesCerradas}>🔒 POSTULACIONES CERRADAS</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {item.descripcion ? (
          <Text style={styles.equipoDescripcionCorta} numberOfLines={2}>
            {item.descripcion}
          </Text>
        ) : null}

        <View style={styles.equipoCardFooter}>
          <View style={styles.equipoConteoBox}>
            <MaterialCommunityIcons name="account-multiple" size={15} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.equipoConteoTexto}>
              {item.totalMiembros} {item.totalMiembros === 1 ? 'Operador' : 'Operadores'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.btnVerFicha}
            onPress={() => {
              setEquipoDetalle(item);
              setModalDetalleVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.txtBtnVerFicha}>VER FICHA</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const esTlDeMiEquipo = miEquipo?.tlId === jugador?.id;
  const esFundadorDeMiEquipo = miEquipo?.fundadorId === jugador?.id;
  const esTLActivo = Boolean(esTlDeMiEquipo || (!miEquipo?.tlId && esFundadorDeMiEquipo));
  const tienePoderesGestion = esTlDeMiEquipo || esFundadorDeMiEquipo;

  return (
    <View style={styles.container}>
      {/* Cabecera Superior Táctica */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>ESCUADRAS & EQUIPOS</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Revisa las escuadras de tu región o del país, o gestiona las filas de tu propio equipo.
        </Text>
      </View>

      {/* Segmented Control (Pestañas) */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, tabActual === 'EXPLORAR' && styles.segmentBtnActivo]}
          onPress={() => setTabActual('EXPLORAR')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="compass-outline"
            size={16}
            color={tabActual === 'EXPLORAR' ? '#fff' : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentTxt, tabActual === 'EXPLORAR' && styles.segmentTxtActivo]}>
            EXPLORAR EQUIPOS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, tabActual === 'MI_EQUIPO' && styles.segmentBtnActivo]}
          onPress={() => setTabActual('MI_EQUIPO')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="shield-star"
            size={16}
            color={tabActual === 'MI_EQUIPO' ? '#fff' : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentTxt, tabActual === 'MI_EQUIPO' && styles.segmentTxtActivo]}>
            MI EQUIPO {miEquipo ? '✓' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO SEGÚN PESTAÑA */}
      {tabActual === 'EXPLORAR' ? (
        <View style={{ flex: 1 }}>
          {/* Barra de Filtros: Región y Buscador */}
          <View style={styles.filtrosBar}>
            {/* Selector de Región */}
            <TouchableOpacity
              style={styles.selectorRegionBtn}
              onPress={() => setModalRegionVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="map-marker-radius" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.txtRegionSeleccionada} numberOfLines={1}>
                {regionFiltro === 'TODAS' ? '🇨🇱 Todo Chile (Todas las regiones)' : regionFiltro}
              </Text>
              <MaterialCommunityIcons name="menu-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Input de Búsqueda */}
            <View style={styles.inputSearchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.inputSearch}
                placeholder="Buscar por nombre, lema o ciudad..."
                placeholderTextColor={colors.textMuted}
                value={busqueda}
                onChangeText={setBusqueda}
              />
              {busqueda.length > 0 && (
                <TouchableOpacity onPress={() => setBusqueda('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Botones de acción rápida: Fundar y Código */}
          <View style={styles.accionesBar}>
            <TouchableOpacity
              style={styles.btnAccionMiniFundar}
              onPress={() => setModalCrearVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus-circle" size={15} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.txtBtnAccionMiniFundar}>FUNDAR EQUIPO</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnAccionMiniCodigo}
              onPress={() => setModalCodigoVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="key" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.txtBtnAccionMiniCodigo}>INGRESAR CÓDIGO</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Equipos */}
          {cargando ? (
            <View style={styles.centroCargando}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.txtCargando}>Explorando escuadras tácticas...</Text>
            </View>
          ) : (
            <FlatList
              data={equipos}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItemEquipo}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="shield-outline" size={48} color={colors.textMuted} style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyTitulo}>No se encontraron escuadras</Text>
                  <Text style={styles.emptySubtitulo}>
                    {regionFiltro !== 'TODAS'
                      ? `No hay equipos registrados en ${regionFiltro}. Prueba seleccionando Todo Chile o funda la primera escuadra de tu zona.`
                      : 'Aún no hay escuadras tácticas registradas. ¡Sé el primero en fundar un equipo!'}
                  </Text>
                  <TouchableOpacity
                    style={styles.btnFundarPrimerEquipo}
                    onPress={() => setModalCrearVisible(true)}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnFundarPrimerEquipo}>FUNDAR PRIMERA ESCUADRA</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      ) : (
        /* PESTAÑA MI EQUIPO */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.miEquipoContainer}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {miEquipo ? (
            /* Ficha Completa del Equipo del Usuario */
            <View style={styles.fichaMiEquipoCard}>
              <View style={styles.miEquipoHeader}>
                {miEquipo.logoUrl ? (
                  <Image source={{ uri: miEquipo.logoUrl }} style={styles.miEquipoLogoGrande} />
                ) : (
                  <View style={styles.miEquipoLogoGrandePlaceholder}>
                    <MaterialCommunityIcons name="shield-star" size={48} color={colors.primary} />
                  </View>
                )}

                <Text style={styles.miEquipoNombreGrande}>{miEquipo.nombre}</Text>

                {miEquipo.lema ? (
                  <Text style={styles.miEquipoLemaGrande}>"{miEquipo.lema}"</Text>
                ) : null}

                <View style={styles.miEquipoUbicacionRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.miEquipoUbicacionTexto}>
                    {miEquipo.ciudad ? `${miEquipo.ciudad}, ` : ''}
                    {miEquipo.region || 'Chile'}
                  </Text>
                </View>

                {/* Badge de Cargo del Jugador en la Escuadra */}
                {esTlDeMiEquipo ? (
                  <View style={styles.badgeComandanteOficial}>
                    <MaterialCommunityIcons name="star-circle" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.txtBadgeComandanteOficial}>ERES EL TEAM LEADER (TL) OFICIAL ⭐</Text>
                  </View>
                ) : esFundadorDeMiEquipo ? (
                  <View style={styles.badgeFundadorOficial}>
                    <MaterialCommunityIcons name="shield-crown" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.txtBadgeFundadorOficial}>ERES EL FUNDADOR HISTÓRICO 🏛️</Text>
                  </View>
                ) : (
                  <View style={styles.badgeOperadorOficial}>
                    <MaterialCommunityIcons name="shield-account" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.txtBadgeOperadorOficial}>OPERADOR OFICIAL DE ESCUADRA</Text>
                  </View>
                )}
              </View>

              {/* Panel Exclusivo de Mando del TL / Fundador */}
              {tienePoderesGestion && (
                <View style={styles.panelTlCard}>
                  <View style={styles.panelTlHeader}>
                    <MaterialCommunityIcons name="shield-crown" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.panelTlTitulo}>PANEL DE MANDO DEL TEAM LEADER (TL)</Text>
                  </View>
                  <Text style={styles.panelTlSub}>
                    Como TL tienes el rango más alto para la gestión y control de postulaciones de la escuadra.
                  </Text>

                  <View style={styles.tlControlPostulacionesRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.txtControlPostulacionesLabel}>ESTADO DE POSTULACIONES:</Text>
                      <Text
                        style={[
                          styles.txtControlPostulacionesValor,
                          miEquipo.postulacionesAbiertas ? { color: colors.success } : { color: colors.danger },
                        ]}
                      >
                        {miEquipo.postulacionesAbiertas ? '🟢 ABIERTAS' : '🔒 CERRADAS'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.btnTogglePostulaciones,
                        miEquipo.postulacionesAbiertas ? styles.btnCerrarPostulaciones : styles.btnAbrirPostulaciones,
                      ]}
                      onPress={handleTogglePostulaciones}
                      disabled={cambiandoPostulaciones}
                      activeOpacity={0.85}
                    >
                      {cambiandoPostulaciones ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <MaterialCommunityIcons
                            name={miEquipo.postulacionesAbiertas ? 'lock' : 'lock-open-variant'}
                            size={14}
                            color="#fff"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.txtBtnTogglePostulaciones}>
                            {miEquipo.postulacionesAbiertas ? 'CERRAR POSTULACIONES' : 'ABRIR POSTULACIONES'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Código de Invitación / Reclutamiento */}
              {miEquipo.codigoAcceso && (
                <View style={styles.codigoReclutaBox}>
                  <Text style={styles.codigoReclutaLabel}>CÓDIGO DE RECLUTAMIENTO TÁCTICO:</Text>
                  <Text style={styles.codigoReclutaValor}>{miEquipo.codigoAcceso}</Text>
                  <Text style={styles.codigoReclutaAyuda}>
                    {miEquipo.postulacionesAbiertas
                      ? 'Comparte este código con nuevos camaradas para sumarse directamente.'
                      : 'Las postulaciones públicas están cerradas; este código permite ingresar a invitados directos del TL.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.btnCompartirCodigo}
                    onPress={handleCompartirCodigoEquipo}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="share-variant" size={15} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnCompartirCodigo}>COMPARTIR CÓDIGO CON CAMARADAS</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Reseña / Historia */}
              {miEquipo.descripcion ? (
                <View style={styles.miEquipoSeccion}>
                  <Text style={styles.miEquipoSeccionTitulo}>RESEÑA & HISTORIA DE LA ESCUADRA</Text>
                  <Text style={styles.miEquipoDescripcionTexto}>{miEquipo.descripcion}</Text>
                </View>
              ) : null}

              {/* Roster de Operadores */}
              <View style={styles.miEquipoSeccion}>
                <View style={styles.seccionHeaderRow}>
                  <Text style={styles.miEquipoSeccionTitulo}>
                    ROSTER DE OPERADORES ({miEquipo.miembros?.length || 0})
                  </Text>
                  <Text style={styles.subConteoMiembros}>Filas oficiales</Text>
                </View>

                <View style={styles.rosterList}>
                  {miEquipo.miembros?.map((m) => (
                    <View key={m.id} style={styles.operadorRow}>
                      {m.avatarUrl ? (
                        <Image source={{ uri: m.avatarUrl }} style={styles.operadorAvatar} />
                      ) : (
                        <View style={styles.operadorAvatarPlaceholder}>
                          <MaterialCommunityIcons name="account" size={18} color={colors.textSecondary} />
                        </View>
                      )}

                      <View style={styles.operadorInfo}>
                        <View style={styles.operadorNombreRow}>
                          <Text style={styles.operadorAlias}>{m.alias}</Text>
                          {m.id === jugador?.id && (
                            <View style={styles.badgeTuMini}>
                              <Text style={styles.txtTuMini}>TÚ</Text>
                            </View>
                          )}
                          {m.esTL ? (
                            <View style={styles.badgeTlMini}>
                              <MaterialCommunityIcons name="star" size={10} color="#F59E0B" style={{ marginRight: 2 }} />
                              <Text style={styles.txtTlMini}>TL</Text>
                            </View>
                          ) : m.esFundador ? (
                            <View style={styles.badgeFundadorMini}>
                              <Text style={styles.txtFundadorMini}>FUNDADOR</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.operadorSub}>
                          {m.rango || 'Pichón'} • Rol: [{m.roles || 'ASALTO'}]
                        </Text>
                      </View>

                      {/* Botón para que el TL / Fundador transfiera el mando de TL */}
                      {tienePoderesGestion && !m.esTL && (
                        <TouchableOpacity
                          style={styles.btnDesignarTlMini}
                          onPress={() => handleNombrarTl(m)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="star-outline" size={11} color="#F59E0B" style={{ marginRight: 2 }} />
                          <Text style={styles.txtDesignarTlMini}>NOMBRAR TL</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Para el TL no existe la opción de abandonar, solo la de desintegrar el equipo */}
              {esTLActivo ? (
                <View style={styles.contenedorAccionSalida}>
                  <TouchableOpacity
                    style={styles.btnDesintegrarEquipo}
                    onPress={handleDesintegrarEquipo}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="bomb" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnDesintegrarEquipo}>DESINTEGRAR ESCUADRA</Text>
                  </TouchableOpacity>
                  {(miEquipo.totalMiembros || 0) > 1 && (
                    <Text style={styles.ayudaDesintegrarTl}>
                      Como Team Leader (TL), no puedes abandonar la escuadra directamente. Si deseas dejarla sin disolverla, primero transfiere el mando a otro operador con el botón "NOMBRAR TL ⭐".
                    </Text>
                  )}
                </View>
              ) : (
                /* Botón Salir del Equipo para miembros regulares */
                <TouchableOpacity
                  style={styles.btnSalirEquipo}
                  onPress={handleSalirEquipo}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="logout-variant" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnSalirEquipo}>DESVINCULARME DE ESTA ESCUADRA</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* Estado Vacío: Lobo Solitario */
            <View style={styles.sinEquipoContainer}>
              <View style={styles.sinEquipoIconoBox}>
                <MaterialCommunityIcons name="shield-off-outline" size={54} color={colors.secondary} />
              </View>
              <Text style={styles.sinEquipoTituloPrincipal}>LOBO SOLITARIO (OPERADOR LIBRE)</Text>
              <Text style={styles.sinEquipoSubtituloPrincipal}>
                Actualmente no perteneces a ninguna escuadra oficial. Puedes alistarte a un equipo existente de tu región, ingresar un código de invitación o fundar tu propio equipo militar.
              </Text>

              <View style={styles.sinEquipoBotones}>
                <TouchableOpacity
                  style={styles.btnFundarDesdeMiEquipo}
                  onPress={() => setModalCrearVisible(true)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="shield-plus" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.txtBtnFundarDesdeMiEquipo}>FUNDAR NUEVO EQUIPO 🛡️</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnIngresarCodigoDesdeMiEquipo}
                  onPress={() => setModalCodigoVisible(true)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="key-variant" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.txtBtnIngresarCodigoDesdeMiEquipo}>INGRESAR CÓDIGO DE INVITACIÓN 🔑</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnExplorarDesdeMiEquipo}
                  onPress={() => setTabActual('EXPLORAR')}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="compass" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={styles.txtBtnExplorarDesdeMiEquipo}>EXPLORAR ESCUADRAS DE CHILE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL DETALLE DE EQUIPO (DESDE EXPLORAR) */}
      <Modal
        visible={modalDetalleVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalDetalleVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDetalleCard}>
            {equipoDetalle && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalDetalleHeader}>
                  {equipoDetalle.logoUrl ? (
                    <Image source={{ uri: equipoDetalle.logoUrl }} style={styles.modalDetalleLogo} />
                  ) : (
                    <View style={styles.modalDetalleLogoPlaceholder}>
                      <MaterialCommunityIcons name="shield-account" size={36} color={colors.primary} />
                    </View>
                  )}

                  <Text style={styles.modalDetalleNombre}>{equipoDetalle.nombre}</Text>

                  {equipoDetalle.lema ? (
                    <Text style={styles.modalDetalleLema}>"{equipoDetalle.lema}"</Text>
                  ) : null}

                  <View style={styles.modalDetalleUbicacionRow}>
                    <MaterialCommunityIcons name="map-marker" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.modalDetalleUbicacionTxt}>
                      {equipoDetalle.ciudad ? `${equipoDetalle.ciudad}, ` : ''}
                      {equipoDetalle.region || 'Chile'}
                    </Text>
                  </View>

                  <View style={{ marginTop: 8 }}>
                    {equipoDetalle.postulacionesAbiertas ? (
                      <View style={styles.badgePostulacionesAbiertas}>
                        <Text style={styles.txtPostulacionesAbiertas}>🟢 POSTULACIONES ABIERTAS</Text>
                      </View>
                    ) : (
                      <View style={styles.badgePostulacionesCerradas}>
                        <Text style={styles.txtPostulacionesCerradas}>🔒 POSTULACIONES CERRADAS</Text>
                      </View>
                    )}
                  </View>
                </View>

                {equipoDetalle.descripcion ? (
                  <View style={styles.modalDetalleBloque}>
                    <Text style={styles.modalDetalleBloqueTitulo}>BRIEFING DE LA ESCUADRA</Text>
                    <Text style={styles.modalDetalleBloqueTexto}>{equipoDetalle.descripcion}</Text>
                  </View>
                ) : null}

                {/* Roster de miembros en el modal */}
                <View style={styles.modalDetalleBloque}>
                  <Text style={styles.modalDetalleBloqueTitulo}>
                    OPERADORES ACTIVOS ({equipoDetalle.miembros?.length || 0})
                  </Text>
                  <View style={styles.modalDetalleRoster}>
                    {equipoDetalle.miembros?.map((m) => (
                      <View key={m.id} style={styles.modalOperadorItem}>
                        <Text style={styles.modalOperadorAlias}>
                          • {m.alias}{' '}
                          <Text style={styles.modalOperadorRol}>[{m.roles || 'ASALTO'}]</Text>
                        </Text>
                        {m.esTL ? (
                          <View style={styles.badgeTlMini}>
                            <MaterialCommunityIcons name="star" size={10} color="#F59E0B" style={{ marginRight: 2 }} />
                            <Text style={styles.txtTlMini}>TL</Text>
                          </View>
                        ) : m.esFundador ? (
                          <View style={styles.badgeFundadorMini}>
                            <Text style={styles.txtFundadorMini}>FUNDADOR</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>

                {/* Aviso si postulaciones están cerradas */}
                {!equipoDetalle.postulacionesAbiertas && miEquipo?.id !== equipoDetalle.id && (
                  <View style={styles.bannerPostulacionesCerradasModal}>
                    <MaterialCommunityIcons name="lock-alert" size={18} color={colors.warning} style={{ marginRight: 6 }} />
                    <Text style={styles.txtBannerPostulacionesCerradas}>
                      Las postulaciones públicas están cerradas por el Team Leader (TL). Si tienes un código de reclutamiento táctico, ingrésalo en la pestaña "Ingresar Código".
                    </Text>
                  </View>
                )}

                {/* Botón de Alistamiento o Estado Actual */}
                <View style={styles.modalDetalleAcciones}>
                  {miEquipo?.id === equipoDetalle.id ? (
                    <View style={styles.badgeYaPerteneces}>
                      <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} style={{ marginRight: 6 }} />
                      <Text style={styles.txtYaPerteneces}>FORMA PARTE DE ESTA ESCUADRA ✓</Text>
                    </View>
                  ) : equipoDetalle.postulacionesAbiertas ? (
                    <TouchableOpacity
                      style={[styles.btnAlistarmeModal, uniendose && styles.botonDeshabilitado]}
                      onPress={() => handleUnirmeEquipo(equipoDetalle)}
                      disabled={uniendose}
                    >
                      {uniendose ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="shield-plus" size={18} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.txtBtnAlistarmeModal}>ALISTARME A ESTA ESCUADRA 🛡️</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.btnAlistarmeDeshabilitado}>
                      <MaterialCommunityIcons name="lock" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                      <Text style={styles.txtAlistarmeDeshabilitado}>POSTULACIONES CERRADAS 🔒</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.btnCerrarModal}
                    onPress={() => setModalDetalleVisible(false)}
                  >
                    <Text style={styles.txtBtnCerrarModal}>CERRAR</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR EQUIPO */}
      <Modal
        visible={modalCrearVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalCrearVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCrearCard}>
            <View style={styles.modalHeaderRow}>
              <MaterialCommunityIcons name="shield-plus" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTituloPrincipal}>FUNDAR NUEVA ESCUADRA</Text>
                <Text style={styles.modalSubtituloPrincipal}>
                  Serás registrado como Fundador y Team Leader (TL) oficial inicial del equipo.
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              <Text style={styles.inputLabel}>NOMBRE DE LA ESCUADRA *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="ej: Black Panthers Airsoft"
                placeholderTextColor={colors.textMuted}
                value={crearNombre}
                onChangeText={setCrearNombre}
              />

              <Text style={styles.inputLabel}>LEMA O SLOGAN TÁCTICO (OPCIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="ej: Honor, Disciplina y Precisión"
                placeholderTextColor={colors.textMuted}
                value={crearLema}
                onChangeText={setCrearLema}
              />

              <Text style={styles.inputLabel}>REGIÓN DE OPERACIONES</Text>
              <TouchableOpacity
                style={styles.selectorRegionInput}
                onPress={() => setModalRegionCrearVisible(true)}
              >
                <Text style={styles.selectorRegionInputTxt}>{crearRegion}</Text>
                <MaterialCommunityIcons name="menu-down" size={20} color={colors.primary} />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>CIUDAD O COMUNA BASE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="ej: Santiago, Viña del Mar, Concepción..."
                placeholderTextColor={colors.textMuted}
                value={crearCiudad}
                onChangeText={setCrearCiudad}
              />

              <Text style={styles.inputLabel}>LOGOTIPO / INSIGNIA DE LA ESCUADRA</Text>
              <View style={styles.logoPickerRow}>
                {crearLogoUrl ? (
                  <Image source={{ uri: crearLogoUrl }} style={styles.logoPreview} />
                ) : (
                  <View style={styles.logoPreviewPlaceholder}>
                    <MaterialCommunityIcons name="shield-outline" size={28} color={colors.textMuted} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.btnElegirLogo}
                  onPress={handleSeleccionarLogoGaleria}
                >
                  <MaterialCommunityIcons name="camera" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnElegirLogo}>
                    {crearLogoUrl ? 'CAMBIAR LOGO' : 'SUBIR DESDE MI TELÉFONO'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>RESEÑA HISTÓRICA / REGLAS (OPCIONAL)</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 75, textAlignVertical: 'top' }]}
                placeholder="Describe la visión de combate, requisitos de ingreso..."
                placeholderTextColor={colors.textMuted}
                value={crearDescripcion}
                onChangeText={setCrearDescripcion}
                multiline
              />
            </ScrollView>

            <View style={styles.modalBotonesRow}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => setModalCrearVisible(false)}
              >
                <Text style={styles.txtBtnCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmarCrear, guardandoEquipo && styles.botonDeshabilitado]}
                onPress={handleCrearEquipo}
                disabled={guardandoEquipo}
              >
                {guardandoEquipo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="shield-check" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnConfirmarCrear}>FUNDAR ESCUADRA</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL INGRESAR CÓDIGO DE INVITACIÓN */}
      <Modal
        visible={modalCodigoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCodigoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCodigoCard}>
            <View style={styles.modalHeaderRow}>
              <MaterialCommunityIcons name="key" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTituloPrincipal}>CÓDIGO DE INVITACIÓN</Text>
                <Text style={styles.modalSubtituloPrincipal}>
                  Ingresa el código táctico de 6 caracteres proporcionado por el Team Leader (TL):
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.inputCodigoGrande}
              placeholder="ej: FDEL01"
              placeholderTextColor={colors.textMuted}
              value={codigoIngresado}
              onChangeText={(t) => setCodigoIngresado(t.toUpperCase())}
              maxLength={10}
              autoCapitalize="characters"
            />

            <View style={styles.modalBotonesRow}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => setModalCodigoVisible(false)}
              >
                <Text style={styles.txtBtnCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirmarCodigo, procesandoCodigo && styles.botonDeshabilitado]}
                onPress={handleUnirsePorCodigo}
                disabled={procesandoCodigo}
              >
                {procesandoCodigo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="login" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnConfirmarCodigo}>UNIRME</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECTOR DE REGIÓN (FILTRO) */}
      <Modal
        visible={modalRegionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRegionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalRegionContent}>
            <Text style={styles.modalRegionTitulo}>SELECCIONA REGIÓN DE CHILE</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              <TouchableOpacity
                style={[styles.itemRegion, regionFiltro === 'TODAS' && styles.itemRegionActivo]}
                onPress={() => {
                  setRegionFiltro('TODAS');
                  setModalRegionVisible(false);
                }}
              >
                <Text style={[styles.txtRegion, regionFiltro === 'TODAS' && styles.txtRegionActivo]}>
                  🇨🇱 Todo Chile (Todas las regiones)
                </Text>
              </TouchableOpacity>

              {REGIONES_CHILE.map((reg) => {
                const activo = regionFiltro === reg;
                return (
                  <TouchableOpacity
                    key={reg}
                    style={[styles.itemRegion, activo && styles.itemRegionActivo]}
                    onPress={() => {
                      setRegionFiltro(reg);
                      setModalRegionVisible(false);
                    }}
                  >
                    <Text style={[styles.txtRegion, activo && styles.txtRegionActivo]}>{reg}</Text>
                    {activo && <Text style={styles.checkRegion}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.btnCerrarModalRegion}
              onPress={() => setModalRegionVisible(false)}
            >
              <Text style={styles.txtCerrarModalRegion}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECTOR DE REGIÓN (CREAR EQUIPO) */}
      <Modal
        visible={modalRegionCrearVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRegionCrearVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalRegionContent}>
            <Text style={styles.modalRegionTitulo}>REGIÓN BASE DE TU ESCUADRA</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {REGIONES_CHILE.map((reg) => {
                const activo = crearRegion === reg;
                return (
                  <TouchableOpacity
                    key={reg}
                    style={[styles.itemRegion, activo && styles.itemRegionActivo]}
                    onPress={() => {
                      setCrearRegion(reg);
                      setModalRegionCrearVisible(false);
                    }}
                  >
                    <Text style={[styles.txtRegion, activo && styles.txtRegionActivo]}>{reg}</Text>
                    {activo && <Text style={styles.checkRegion}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.btnCerrarModalRegion}
              onPress={() => setModalRegionCrearVisible(false)}
            >
              <Text style={styles.txtCerrarModalRegion}>CERRAR</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActivo: {
    backgroundColor: colors.primary,
  },
  segmentTxt: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  segmentTxtActivo: {
    color: '#fff',
  },
  filtrosBar: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectorRegionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  txtRegionSeleccionada: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  inputSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputSearch: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 8,
  },
  accionesBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  btnAccionMiniFundar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  txtBtnAccionMiniFundar: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnAccionMiniCodigo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  txtBtnAccionMiniCodigo: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  equipoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  equipoCardPropio: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(224, 109, 40, 0.05)',
  },
  equipoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipoLogoThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  equipoLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  equipoHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  equipoTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  equipoNombre: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  badgeMiEquipoMini: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  txtMiEquipoMini: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '900',
  },
  equipoLema: {
    color: colors.primary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  equipoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  equipoMetaTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    marginLeft: 3,
  },
  badgePostulacionesRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badgePostulacionesAbiertas: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  txtPostulacionesAbiertas: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgePostulacionesCerradas: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  txtPostulacionesCerradas: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  equipoDescripcionCorta: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
  equipoCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: 10,
    paddingTop: 10,
  },
  equipoConteoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipoConteoTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  btnVerFicha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txtBtnVerFicha: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  centroCargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  txtCargando: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitulo: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  btnFundarPrimerEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  txtBtnFundarPrimerEquipo: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Mi Equipo
  miEquipoContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  fichaMiEquipoCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  miEquipoHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 16,
  },
  miEquipoLogoGrande: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 10,
  },
  miEquipoLogoGrandePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 10,
  },
  miEquipoNombreGrande: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  miEquipoLemaGrande: {
    color: colors.primary,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  miEquipoUbicacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  miEquipoUbicacionTexto: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  badgeComandanteOficial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },
  txtBadgeComandanteOficial: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeFundadorOficial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },
  txtBadgeFundadorOficial: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeOperadorOficial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },
  txtBadgeOperadorOficial: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  panelTlCard: {
    backgroundColor: 'rgba(224, 109, 40, 0.08)',
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  panelTlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  panelTlTitulo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  panelTlSub: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  tlControlPostulacionesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
  },
  txtControlPostulacionesLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  txtControlPostulacionesValor: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  btnTogglePostulaciones: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnCerrarPostulaciones: {
    backgroundColor: colors.danger,
  },
  btnAbrirPostulaciones: {
    backgroundColor: colors.success,
  },
  txtBtnTogglePostulaciones: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  codigoReclutaBox: {
    backgroundColor: 'rgba(224, 109, 40, 0.08)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(224, 109, 40, 0.3)',
  },
  codigoReclutaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  codigoReclutaValor: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    marginVertical: 4,
  },
  codigoReclutaAyuda: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
  },
  btnCompartirCodigo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  txtBtnCompartirCodigo: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  miEquipoSeccion: {
    marginTop: 14,
  },
  seccionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miEquipoSeccionTitulo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subConteoMiembros: {
    color: colors.textMuted,
    fontSize: 11,
  },
  miEquipoDescripcionTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  rosterList: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  operadorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  operadorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  operadorAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operadorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  operadorNombreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  operadorAlias: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  badgeTuMini: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  txtTuMini: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  badgeTlMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  txtTlMini: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
  },
  badgeFundadorMini: {
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  txtFundadorMini: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '800',
  },
  operadorSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  btnDesignarTlMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 8,
  },
  txtDesignarTlMini: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
  },
  contenedorAccionSalida: {
    marginTop: 20,
  },
  btnDesintegrarEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
  },
  txtBtnDesintegrarEquipo: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  ayudaDesintegrarTl: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
    paddingHorizontal: 8,
  },
  btnSalirEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  txtBtnSalirEquipo: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Sin Equipo
  sinEquipoContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sinEquipoIconoBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sinEquipoTituloPrincipal: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  sinEquipoSubtituloPrincipal: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  sinEquipoBotones: {
    width: '100%',
    gap: 10,
  },
  btnFundarDesdeMiEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnFundarDesdeMiEquipo: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnIngresarCodigoDesdeMiEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnIngresarCodigoDesdeMiEquipo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnExplorarDesdeMiEquipo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnExplorarDesdeMiEquipo: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDetalleCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalDetalleHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 14,
  },
  modalDetalleLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 8,
  },
  modalDetalleLogoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalDetalleNombre: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalDetalleLema: {
    color: colors.primary,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  modalDetalleUbicacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  modalDetalleUbicacionTxt: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  modalDetalleBloque: {
    marginTop: 12,
  },
  modalDetalleBloqueTitulo: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalDetalleBloqueTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  modalDetalleRoster: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 8,
  },
  modalOperadorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalOperadorAlias: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOperadorRol: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  bannerPostulacionesCerradasModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  txtBannerPostulacionesCerradas: {
    flex: 1,
    color: colors.warning,
    fontSize: 11,
    lineHeight: 15,
  },
  modalDetalleAcciones: {
    marginTop: 18,
    gap: 8,
  },
  badgeYaPerteneces: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 8,
    paddingVertical: 10,
  },
  txtYaPerteneces: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900',
  },
  btnAlistarmeModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnAlistarmeModal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnAlistarmeDeshabilitado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtAlistarmeDeshabilitado: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  btnCerrarModal: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  txtBtnCerrarModal: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  // Modal Crear
  modalCrearCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTituloPrincipal: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalSubtituloPrincipal: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectorRegionInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectorRegionInputTxt: {
    color: colors.text,
    fontSize: 13,
  },
  logoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  logoPreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  logoPreviewPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  btnElegirLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBorder,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  txtBtnElegirLogo: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  modalBotonesRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  btnCancelarModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnCancelarModal: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  btnConfirmarCrear: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnConfirmarCrear: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Modal Código
  modalCodigoCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputCodigoGrande: {
    backgroundColor: colors.inputBg,
    color: colors.primary,
    borderRadius: 8,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    paddingVertical: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnConfirmarCodigo: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  txtBtnConfirmarCodigo: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Selector Región Modal
  modalRegionContent: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxHeight: 460,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalRegionTitulo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  itemRegion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  itemRegionActivo: {
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderRadius: 6,
  },
  txtRegion: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  txtRegionActivo: {
    color: colors.primary,
    fontWeight: '800',
  },
  checkRegion: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 14,
  },
  btnCerrarModalRegion: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  txtCerrarModalRegion: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
});
