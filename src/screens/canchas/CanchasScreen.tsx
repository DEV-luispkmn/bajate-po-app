import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  listarCanchasApi,
  crearCanchaApi,
  modificarCanchaApi,
  Cancha,
} from '../../api/canchas.service';
import { useAuth } from '../../context/AuthContext';
import { REGIONES_CHILE } from '../eventos/CrearEventoScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useFocusEffect } from '@react-navigation/native';

export const CanchasScreen = () => {
  const { jugador } = useAuth();

  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Filtros de Regiones
  // 'TODAS' | 'MI_REGION' | 'PERSONALIZADA'
  const [modoFiltro, setModoFiltro] = useState<'TODAS' | 'MI_REGION' | 'PERSONALIZADA'>('TODAS');
  const [regionesFiltro, setRegionesFiltro] = useState<string[]>([]);
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);
  const [regionesTemporales, setRegionesTemporales] = useState<string[]>([]);

  // Modal para Crear / Editar Cancha
  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [modoForm, setModoForm] = useState<'CREAR' | 'EDITAR'>('CREAR');
  const [canchaAEditarId, setCanchaAEditarId] = useState<number | null>(null);

  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [regionForm, setRegionForm] = useState(jugador?.region || 'Región Metropolitana');
  const [ciudadForm, setCiudadForm] = useState('');
  const [latitudForm, setLatitudForm] = useState('');
  const [longitudForm, setLongitudForm] = useState('');
  const [esAbiertaForm, setEsAbiertaForm] = useState(true);
  const [asociarAEscuadra, setAsociarAEscuadra] = useState(false);
  const [modalSelectorRegionForm, setModalSelectorRegionForm] = useState(false);
  const [guardandoForm, setGuardandoForm] = useState(false);

  const miRegion = jugador?.region || 'Región Metropolitana';

  const cargarCanchas = async () => {
    try {
      let data: Cancha[] = [];
      if (modoFiltro === 'TODAS') {
        data = await listarCanchasApi();
      } else if (modoFiltro === 'MI_REGION') {
        data = await listarCanchasApi(miRegion);
      } else if (modoFiltro === 'PERSONALIZADA') {
        data = await listarCanchasApi({ regiones: regionesFiltro });
      }
      setCanchas(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron sincronizar las canchas');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarCanchas();
    }, [modoFiltro, regionesFiltro]),
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarCanchas();
  };

  // Manejo de Filtros
  const seleccionarModoTodas = () => {
    setModoFiltro('TODAS');
    setRegionesFiltro([]);
  };

  const seleccionarModoMiRegion = () => {
    setModoFiltro('MI_REGION');
    setRegionesFiltro([miRegion]);
  };

  const abrirModalFiltros = () => {
    setRegionesTemporales([...regionesFiltro]);
    setModalFiltroVisible(true);
  };

  const toggleRegionTemporal = (reg: string) => {
    if (regionesTemporales.includes(reg)) {
      setRegionesTemporales(regionesTemporales.filter((r) => r !== reg));
    } else {
      setRegionesTemporales([...regionesTemporales, reg]);
    }
  };

  const aplicarFiltroRegiones = () => {
    if (regionesTemporales.length === 0) {
      setModoFiltro('TODAS');
      setRegionesFiltro([]);
    } else {
      setModoFiltro('PERSONALIZADA');
      setRegionesFiltro(regionesTemporales);
    }
    setModalFiltroVisible(false);
  };

  // Manejo de Google Maps
  const handleAbrirGoogleMaps = (cancha: Cancha) => {
    if (cancha.latitud && cancha.longitud) {
      const url = `https://www.google.com/maps/search/?api=1&query=${cancha.latitud},${cancha.longitud}`;
      Linking.openURL(url);
    } else {
      const query = encodeURIComponent(`${cancha.nombre} ${cancha.region || ''} Chile`);
      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
      Linking.openURL(url);
    }
  };

  // Abrir formulario para Crear
  const abrirFormCrear = () => {
    setModoForm('CREAR');
    setCanchaAEditarId(null);
    setNombre('');
    setDescripcion('');
    setRegionForm(jugador?.region || 'Región Metropolitana');
    setCiudadForm('');
    setLatitudForm('');
    setLongitudForm('');
    setEsAbiertaForm(true);
    setAsociarAEscuadra(false);
    setModalFormVisible(true);
  };

  // Abrir formulario para Editar
  const abrirFormEditar = (cancha: Cancha) => {
    setModoForm('EDITAR');
    setCanchaAEditarId(cancha.id);
    setNombre(cancha.nombre);
    setDescripcion(cancha.descripcion || '');
    setRegionForm(cancha.region || 'Región Metropolitana');
    setCiudadForm(cancha.ciudad || '');
    setLatitudForm(cancha.latitud ? cancha.latitud.toString() : '');
    setLongitudForm(cancha.longitud ? cancha.longitud.toString() : '');
    setEsAbiertaForm(cancha.esAbierta !== undefined ? cancha.esAbierta : true);
    setAsociarAEscuadra(Boolean(cancha.adminEquipoId));
    setModalFormVisible(true);
  };

  // Guardar Cancha (Crear o Editar)
  const handleGuardarCancha = async () => {
    if (!nombre.trim()) {
      Alert.alert('Atención', 'El nombre del campo de juego es obligatorio.');
      return;
    }

    try {
      setGuardandoForm(true);

      const latNum = latitudForm.trim() ? parseFloat(latitudForm.trim()) : undefined;
      const lngNum = longitudForm.trim() ? parseFloat(longitudForm.trim()) : undefined;

      let adminEquipoIdPayload: number | null | undefined = undefined;
      if (asociarAEscuadra && jugador?.equipoId) {
        adminEquipoIdPayload = jugador.equipoId;
      } else {
        adminEquipoIdPayload = null;
      }

      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        region: regionForm,
        ciudad: ciudadForm.trim() || undefined,
        latitud: latNum,
        longitud: lngNum,
        esAbierta: esAbiertaForm,
        adminEquipoId: adminEquipoIdPayload,
      };

      if (modoForm === 'CREAR') {
        await crearCanchaApi(payload);
        Alert.alert('🎯 ¡CAMPO REGISTRADO!', `El campo "${nombre.trim()}" fue añadido al radar.`);
      } else if (canchaAEditarId) {
        await modificarCanchaApi(canchaAEditarId, payload);
        Alert.alert('¡ACTUALIZADO!', `La información del campo fue actualizada con éxito.`);
      }

      setModalFormVisible(false);
      cargarCanchas();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar la cancha.');
    } finally {
      setGuardandoForm(false);
    }
  };

  const renderCancha = ({ item }: { item: Cancha }) => {
    const tieneCoordenadas = item.latitud !== undefined && item.longitud !== undefined;
    const esCanchaAbierta = item.esAbierta !== false && !item.adminEquipoId;
    const esDeMiEscuadra = Boolean(item.adminEquipoId && item.adminEquipoId === jugador?.equipoId);

    // Cancha abierta editable por todos de momento, o por el equipo administrador
    const puedeEditar = esCanchaAbierta || esDeMiEscuadra;

    return (
      <View style={styles.cardCancha}>
        {/* Cabecera de la Cancha */}
        <View style={styles.canchaHeader}>
          <MaterialCommunityIcons name="map-marker-radius" size={24} color={colors.primary} style={{ marginRight: 8 }} />
          <View style={styles.canchaInfo}>
            <Text style={styles.canchaNombre}>{item.nombre}</Text>
            <Text style={styles.canchaUbicacion}>
              {item.region || 'Chile'}
              {item.ciudad ? ` • ${item.ciudad}` : ''}
            </Text>
          </View>

          {/* Badge de Administración */}
          <View
            style={[
              styles.badgeAdmin,
              esCanchaAbierta ? styles.badgeAbierta : styles.badgeEscuadra,
            ]}
          >
            <Text
              style={[
                styles.textoBadgeAdmin,
                esCanchaAbierta ? styles.textoAbierta : styles.textoEscuadra,
              ]}
            >
              {esCanchaAbierta
                ? 'ABIERTA'
                : (item.equipoAdminNombre || 'ESCUADRA')}
            </Text>
          </View>
        </View>

        {/* Descripción táctica si existe */}
        {item.descripcion && (
          <View style={styles.descripcionBox}>
            <Text style={styles.descripcionTexto}>{item.descripcion}</Text>
          </View>
        )}

        {/* Coordenadas GPS */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>COORDENADAS:</Text>
          <Text style={styles.metaValor}>
            {tieneCoordenadas
              ? `${Number(item.latitud).toFixed(4)}, ${Number(item.longitud).toFixed(4)}`
              : 'Referencial (búsqueda por nombre)'}
          </Text>
        </View>

        {/* Botones de Acción */}
        <View style={styles.accionesRow}>
          <TouchableOpacity
            style={styles.btnMaps}
            activeOpacity={0.8}
            onPress={() => handleAbrirGoogleMaps(item)}
          >
            <MaterialCommunityIcons name="google-maps" size={15} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.txtMaps}>GOOGLE MAPS</Text>
          </TouchableOpacity>

          {puedeEditar && (
            <TouchableOpacity
              style={styles.btnEditar}
              activeOpacity={0.8}
              onPress={() => abrirFormEditar(item)}
            >
              <MaterialCommunityIcons name="pencil-outline" size={15} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.txtEditar}>EDITAR</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Cabecera Superior con Botón para Crear */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderRow}>
          <View style={styles.tituloWrapper}>
            <Text style={styles.badgeTop}>RADAR GEOGRÁFICO</Text>
            <Text style={styles.tituloTop}>CAMPOS & CANCHAS</Text>
          </View>

          <TouchableOpacity style={styles.btnRegistrarCampo} onPress={abrirFormCrear}>
            <MaterialCommunityIcons name="plus" size={16} color="#fff" style={{ marginRight: 2 }} />
            <Text style={styles.txtRegistrarCampo}>NUEVO CAMPO</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtituloTop}>
          Zonas de juego habilitadas para pichangas, versus y eventos en Chile
        </Text>
      </View>

      {/* Barra de Filtros de Región */}
      <View style={styles.filtrosBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosScroll}>
          {/* Todas las Regiones */}
          <TouchableOpacity
            style={[styles.filtroChip, modoFiltro === 'TODAS' && styles.filtroChipActivo]}
            onPress={seleccionarModoTodas}
          >
            <MaterialCommunityIcons
              name="earth"
              size={14}
              color={modoFiltro === 'TODAS' ? '#fff' : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filtroChipTxt, modoFiltro === 'TODAS' && styles.filtroChipTxtActivo]}>
              TODAS
            </Text>
          </TouchableOpacity>

          {/* Mi Región */}
          <TouchableOpacity
            style={[styles.filtroChip, modoFiltro === 'MI_REGION' && styles.filtroChipActivo]}
            onPress={seleccionarModoMiRegion}
          >
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={14}
              color={modoFiltro === 'MI_REGION' ? '#fff' : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filtroChipTxt, modoFiltro === 'MI_REGION' && styles.filtroChipTxtActivo]}>
              MI REGIÓN ({miRegion.replace('Región ', '')})
            </Text>
          </TouchableOpacity>

          {/* Selector Múltiple de Regiones */}
          <TouchableOpacity
            style={[
              styles.filtroChip,
              modoFiltro === 'PERSONALIZADA' && styles.filtroChipActivo,
            ]}
            onPress={abrirModalFiltros}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={14}
              color={modoFiltro === 'PERSONALIZADA' ? '#fff' : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filtroChipTxt,
                modoFiltro === 'PERSONALIZADA' && styles.filtroChipTxtActivo,
              ]}
            >
              FILTRAR REGIONES {regionesFiltro.length > 0 ? `(${regionesFiltro.length})` : ''}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Estado de los filtros activos */}
      {modoFiltro === 'PERSONALIZADA' && regionesFiltro.length > 0 && (
        <View style={styles.filtroActivoBar}>
          <Text style={styles.filtroActivoTxt} numberOfLines={1}>
            Filtro: {regionesFiltro.join(', ')}
          </Text>
          <TouchableOpacity onPress={seleccionarModoTodas}>
            <Text style={styles.limpiarFiltroTxt}>✕ QUITAR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conteo de Canchas */}
      <View style={styles.conteoBar}>
        <Text style={styles.conteoTxt}>
          {canchas.length} {canchas.length === 1 ? 'CAMPO DETECTADO' : 'CAMPOS DETECTADOS EN EL RADAR'}
        </Text>
      </View>

      {cargando ? (
        <View style={styles.centroCargando}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.textoCargando}>Localizando campos de juego...</Text>
        </View>
      ) : (
        <FlatList
          data={canchas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCancha}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.iconoVacio}>🗺️</Text>
              <Text style={styles.tituloVacio}>Sin campos en esta selección</Text>
              <Text style={styles.subtituloVacio}>
                No se encontraron canchas para el filtro aplicado. Puedes registrar una nueva cancha en esta zona con el botón superior.
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL: FILTRAR POR MÚLTIPLES REGIONES */}
      <Modal
        visible={modalFiltroVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalFiltroVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>FILTRAR POR REGIONES</Text>
            <Text style={styles.modalSubtitulo}>
              Selecciona una o más regiones para rastrear campos disponibles:
            </Text>

            <ScrollView style={styles.modalListaRegiones}>
              {REGIONES_CHILE.map((reg) => {
                const seleccionada = regionesTemporales.includes(reg);
                return (
                  <TouchableOpacity
                    key={reg}
                    style={[
                      styles.modalRegionItem,
                      seleccionada && styles.modalRegionItemActivo,
                    ]}
                    onPress={() => toggleRegionTemporal(reg)}
                  >
                    <Text
                      style={[
                        styles.modalRegionTexto,
                        seleccionada && styles.modalRegionTextoActivo,
                      ]}
                    >
                      {reg}
                    </Text>
                    {seleccionada && <Text style={styles.modalRegionCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFiltrosBotones}>
              <TouchableOpacity
                style={styles.modalBtnSecundario}
                onPress={() => setRegionesTemporales([])}
              >
                <Text style={styles.modalTxtSecundario}>DESMARCAR TODAS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnPrimario}
                onPress={aplicarFiltroRegiones}
              >
                <Text style={styles.modalTxtPrimario}>
                  APLICAR ({regionesTemporales.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CREAR / EDITAR CANCHA */}
      <Modal
        visible={modalFormVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalFormVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContenido, { maxHeight: '88%' }]}>
            <Text style={styles.modalTitulo}>
              {modoForm === 'CREAR' ? 'REGISTRAR CAMPO TÁCTICO' : 'EDITAR CAMPO TÁCTICO'}
            </Text>
            <Text style={styles.modalSubtitulo}>
              {modoForm === 'CREAR'
                ? 'Agrega una nueva cancha para organizar partidas y versus.'
                : 'Modifica las características o geolocalización de la cancha.'}
            </Text>

            <ScrollView style={{ marginBottom: 12 }}>
              {/* Nombre */}
              <Text style={styles.inputLabel}>NOMBRE DEL CAMPO (*):</Text>
              <TextInput
                style={styles.inputModal}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Fuerte Airsoft / CQB Lampa"
                placeholderTextColor={colors.textMuted}
              />

              {/* Región Selector */}
              <Text style={styles.inputLabel}>REGIÓN DE CHILE (*):</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setModalSelectorRegionForm(true)}
              >
                <Text style={styles.dropdownSelectorTxt}>{regionForm}</Text>
                <Text style={styles.dropdownFlecha}>▼</Text>
              </TouchableOpacity>

              {/* Ciudad / Comuna */}
              <Text style={styles.inputLabel}>CIUDAD / COMUNA:</Text>
              <TextInput
                style={styles.inputModal}
                value={ciudadForm}
                onChangeText={setCiudadForm}
                placeholder="Ej: Lampa / Quilpué / Concepción"
                placeholderTextColor={colors.textMuted}
              />

              {/* Coordenadas GPS */}
              <View style={styles.coordenadasRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>LATITUD (GPS):</Text>
                  <TextInput
                    style={styles.inputModal}
                    value={latitudForm}
                    onChangeText={setLatitudForm}
                    placeholder="-33.4560"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>LONGITUD (GPS):</Text>
                  <TextInput
                    style={styles.inputModal}
                    value={longitudForm}
                    onChangeText={setLongitudForm}
                    placeholder="-70.6480"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Tipo de Cancha / Administración */}
              <Text style={[styles.inputLabel, { marginTop: 6 }]}>ADMINISTRACIÓN DEL CAMPO:</Text>
              <View style={styles.tipoCanchaOpciones}>
                {/* Opción Cancha Abierta */}
                <TouchableOpacity
                  style={[
                    styles.tipoCanchaCard,
                    esAbiertaForm && !asociarAEscuadra && styles.tipoCanchaCardActiva,
                  ]}
                  onPress={() => {
                    setEsAbiertaForm(true);
                    setAsociarAEscuadra(false);
                  }}
                >
                  <Text style={styles.tipoCanchaIcono}>🌐</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tipoCanchaTitulo}>CANCHA ABIERTA / COMUNITARIA</Text>
                    <Text style={styles.tipoCanchaDesc}>
                      Editable por toda la comunidad de operadores para actualizar datos.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Opción Cancha de Escuadra */}
                <TouchableOpacity
                  style={[
                    styles.tipoCanchaCard,
                    asociarAEscuadra && styles.tipoCanchaCardActiva,
                  ]}
                  onPress={() => {
                    if (!jugador?.equipoId) {
                      Alert.alert(
                        'Sin Escuadra',
                        'Para registrar un campo oficial de escuadra debes pertenecer o liderar un equipo. Se guardará como cancha abierta.',
                      );
                      setEsAbiertaForm(true);
                      setAsociarAEscuadra(false);
                      return;
                    }
                    setAsociarAEscuadra(true);
                    setEsAbiertaForm(false);
                  }}
                >
                  <Text style={styles.tipoCanchaIcono}>🛡️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tipoCanchaTitulo}>CAMPO OFICIAL DE MI ESCUADRA</Text>
                    <Text style={styles.tipoCanchaDesc}>
                      {jugador?.equipoId
                        ? 'Administrada exclusivamente por los miembros de tu equipo.'
                        : 'Requiere pertenecer a un equipo registrado.'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Descripción Táctica */}
              <Text style={[styles.inputLabel, { marginTop: 8 }]}>DESCRIPCIÓN & DETALLES DEL TERRENO:</Text>
              <TextInput
                style={[styles.inputModal, { minHeight: 70, textAlignVertical: 'top' }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Terreno bosque, zona CQB con trincheras, arriendo de réplicas, quincho, límite FPS..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            {/* Botones del Formulario */}
            <View style={styles.modalFiltrosBotones}>
              <TouchableOpacity
                style={styles.modalBtnSecundario}
                onPress={() => setModalFormVisible(false)}
                disabled={guardandoForm}
              >
                <Text style={styles.modalTxtSecundario}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnPrimario}
                onPress={handleGuardarCancha}
                disabled={guardandoForm}
              >
                {guardandoForm ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalTxtPrimario}>
                    {modoForm === 'CREAR' ? 'GUARDAR CAMPO 🎯' : 'ACTUALIZAR CAMPO'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SELECTOR DE REGIÓN PARA EL FORMULARIO */}
      <Modal
        visible={modalSelectorRegionForm}
        transparent
        animationType="slide"
        onRequestClose={() => setModalSelectorRegionForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>SELECCIONA LA REGIÓN</Text>
            <ScrollView style={styles.modalListaRegiones}>
              {REGIONES_CHILE.map((reg) => (
                <TouchableOpacity
                  key={reg}
                  style={[
                    styles.modalRegionItem,
                    reg === regionForm && styles.modalRegionItemActivo,
                  ]}
                  onPress={() => {
                    setRegionForm(reg);
                    setModalSelectorRegionForm(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalRegionTexto,
                      reg === regionForm && styles.modalRegionTextoActivo,
                    ]}
                  >
                    {reg}
                  </Text>
                  {reg === regionForm && <Text style={styles.modalRegionCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalBtnSecundario}
              onPress={() => setModalSelectorRegionForm(false)}
            >
              <Text style={styles.modalTxtSecundario}>CERRAR</Text>
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
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tituloWrapper: {
    flex: 1,
  },
  badgeTop: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 2,
  },
  tituloTop: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnRegistrarCampo: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txtRegistrarCampo: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtituloTop: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  filtrosBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  filtrosScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filtroChip: {
    backgroundColor: colors.inputBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtroChipActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
  },
  filtroChipTxt: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filtroChipTxtActivo: {
    color: colors.primary,
  },
  filtroActivoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filtroActivoTxt: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  limpiarFiltroTxt: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '900',
  },
  conteoBar: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  conteoTxt: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  lista: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  cardCancha: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  canchaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconoCancha: {
    fontSize: 26,
    marginRight: 10,
    marginTop: 2,
  },
  canchaInfo: {
    flex: 1,
  },
  canchaNombre: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  canchaUbicacion: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  badgeAdmin: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeAbierta: {
    backgroundColor: 'rgba(49, 130, 206, 0.15)',
    borderColor: colors.blueTeam,
  },
  badgeEscuadra: {
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
    borderColor: colors.success,
  },
  textoBadgeAdmin: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textoAbierta: {
    color: colors.blueTeam,
  },
  textoEscuadra: {
    color: colors.success,
  },
  descripcionBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  descripcionTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginRight: 6,
  },
  metaValor: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  accionesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnMaps: {
    flex: 2,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtMaps: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnEditar: {
    flex: 1,
    backgroundColor: 'rgba(214, 158, 46, 0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  txtEditar: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '800',
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
    marginTop: 50,
    paddingHorizontal: 30,
  },
  iconoVacio: {
    fontSize: 44,
    marginBottom: 10,
  },
  tituloVacio: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtituloVacio: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContenido: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
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
  modalListaRegiones: {
    maxHeight: 280,
    marginBottom: 14,
  },
  modalRegionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalRegionItemActivo: {
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
    borderRadius: 8,
  },
  modalRegionTexto: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalRegionTextoActivo: {
    color: colors.primary,
    fontWeight: '800',
  },
  modalRegionCheck: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  modalFiltrosBotones: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtnSecundario: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTxtSecundario: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  modalBtnPrimario: {
    flex: 1.5,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalTxtPrimario: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  inputLabel: {
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
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10,
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  dropdownSelectorTxt: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownFlecha: {
    color: colors.primary,
    fontSize: 13,
  },
  coordenadasRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipoCanchaOpciones: {
    gap: 8,
    marginBottom: 10,
  },
  tipoCanchaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  tipoCanchaCardActiva: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
  },
  tipoCanchaIcono: {
    fontSize: 22,
  },
  tipoCanchaTitulo: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  tipoCanchaDesc: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
});
