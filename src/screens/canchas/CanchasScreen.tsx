import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  listarCanchasApi,
  crearCanchaApi,
  modificarCanchaApi,
  Cancha,
} from '../../api/canchas.service';
import { crearTicketApi } from '../../api/configuracion.service';
import { useAuth } from '../../context/AuthContext';
import { REGIONES_CHILE } from '../eventos/CrearEventoScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ModalConfirmacionTactico } from '../../components/ModalConfirmacionTactico';
import { EstadoErrorRed } from '../../components/EstadoErrorRed';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalFichaCancha } from './components/ModalFichaCancha';

export const CanchasScreen = () => {
  const insets = useSafeAreaInsets();
  const { jugador } = useAuth();

  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Modal para Ver Ficha Detallada de la Cancha
  const [canchaDetalleModal, setCanchaDetalleModal] = useState<Cancha | null>(null);

  // Modal para Sugerir Cambios a la Cancha (Operadores regulares)
  const [modalSugerirVisible, setModalSugerirVisible] = useState(false);
  const [canchaParaSugerir, setCanchaParaSugerir] = useState<Cancha | null>(null);
  const [textoPropuesta, setTextoPropuesta] = useState('');
  const [fotosSugerencia, setFotosSugerencia] = useState<{ url: string; descripcion: string }[]>([]);
  const [enviandoSugerencia, setEnviandoSugerencia] = useState(false);

  // Filtros de Regiones
  // 'MI_REGION' | 'TODAS' | 'PERSONALIZADA'
  const miRegion = jugador?.region || 'Región Metropolitana';
  const [modoFiltro, setModoFiltro] = useState<'MI_REGION' | 'TODAS' | 'PERSONALIZADA'>('MI_REGION');
  const [regionesFiltro, setRegionesFiltro] = useState<string[]>([miRegion]);
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);
  const [regionesTemporales, setRegionesTemporales] = useState<string[]>([]);

  // Filtro de Modalidad: 'TODAS' | 'ABIERTAS' | 'EQUIPO'
  const [filtroTipoCancha, setFiltroTipoCancha] = useState<'TODAS' | 'ABIERTAS' | 'EQUIPO'>('TODAS');

  // Modal para Crear / Editar Cancha
  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [modoForm, setModoForm] = useState<'CREAR' | 'EDITAR'>('CREAR');
  const [canchaAEditarId, setCanchaAEditarId] = useState<number | null>(null);

  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [regionForm, setRegionForm] = useState(miRegion);
  const [ciudadForm, setCiudadForm] = useState('');
  const [latitudForm, setLatitudForm] = useState('');
  const [longitudForm, setLongitudForm] = useState('');
  const [esAbiertaForm, setEsAbiertaForm] = useState(true);
  const [asociarAEscuadra, setAsociarAEscuadra] = useState(false);
  const [fotosForm, setFotosForm] = useState<{ url: string; descripcion: string }[]>([]);
  const [modalSelectorRegionForm, setModalSelectorRegionForm] = useState(false);
  const [guardandoForm, setGuardandoForm] = useState(false);
  const [errorFormModal, setErrorFormModal] = useState<string | null>(null);
  const [errorSugerenciaModal, setErrorSugerenciaModal] = useState<string | null>(null);
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

  const cargarCanchas = async () => {
    try {
      setErrorCarga(null);
      let data: Cancha[] = [];
      if (modoFiltro === 'MI_REGION') {
        data = await listarCanchasApi(miRegion, jugador?.id);
      } else if (modoFiltro === 'TODAS') {
        data = await listarCanchasApi(undefined, jugador?.id);
      } else if (modoFiltro === 'PERSONALIZADA') {
        data = await listarCanchasApi({ regiones: regionesFiltro }, jugador?.id);
      }
      setCanchas(data);
    } catch (error: any) {
      setErrorCarga(
        error?.message ||
          'No se pudieron sincronizar los campos de juego. Revisa tu señal e intenta nuevamente.'
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarCanchas();
    }, [modoFiltro, regionesFiltro, jugador?.id]),
  );

  const onRefresh = () => {
    setRefrescando(true);
    cargarCanchas();
  };

  // Filtro activo: descartar canchas en revisión y aplicar filtro de tipo (Abiertas vs De Equipo)
  const canchasFiltradas = useMemo(() => {
    return canchas.filter((c) => {
      // 1. Las canchas en revisión técnica NO deben listarse en el radar de campos activos
      if (c.estado === 'EN_REVISION') return false;

      // 2. Filtro de modalidad: Abierta vs De Equipo
      const esAbierta = c.esAbierta !== false && !c.adminEquipoId;
      if (filtroTipoCancha === 'ABIERTAS' && !esAbierta) return false;
      if (filtroTipoCancha === 'EQUIPO' && esAbierta) return false;

      return true;
    });
  }, [canchas, filtroTipoCancha]);

  // Conteos para los botones de filtro
  const { conteoTodas, conteoAbiertas, conteoEquipo } = useMemo(() => {
    const activas = canchas.filter((c) => c.estado !== 'EN_REVISION');
    const abiertas = activas.filter((c) => c.esAbierta !== false && !c.adminEquipoId).length;
    const equipo = activas.filter((c) => Boolean(c.adminEquipoId) || c.esAbierta === false).length;
    return { conteoTodas: activas.length, conteoAbiertas: abiertas, conteoEquipo: equipo };
  }, [canchas]);

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

  // Manejo de Fotos del Formulario
  const handleAgregarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setAvisoTactico({
          visible: true,
          titulo: 'PERMISO REQUERIDO',
          mensaje: 'Se necesita acceso a tu galería para añadir evidencias fotográficas del campo.',
          tipo: 'advertencia',
          icono: 'image-off',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.45,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64Img = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setFotosForm((prev) => [
          ...prev,
          { url: base64Img, descripcion: '' },
        ]);
      }
    } catch (error: any) {
      setAvisoTactico({
        visible: true,
        titulo: 'ERROR DE IMAGEN',
        mensaje: error.message || 'No se pudo cargar la imagen del campo.',
        tipo: 'peligro',
        icono: 'alert-circle-outline',
      });
    }
  };

  const handleActualizarDescFoto = (index: number, desc: string) => {
    setFotosForm((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], descripcion: desc };
      return copia;
    });
  };

  const handleEliminarFoto = (index: number) => {
    setFotosForm((prev) => prev.filter((_, i) => i !== index));
  };

  // Manejo de Sugerencias de Cambios (Para Operadores regulares)
  const abrirModalSugerir = (cancha: Cancha) => {
    setCanchaParaSugerir(cancha);
    setTextoPropuesta('');
    setFotosSugerencia([]);
    setErrorSugerenciaModal(null);
    setModalSugerirVisible(true);
  };

  const handleAgregarFotoSugerencia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setAvisoTactico({
          visible: true,
          titulo: 'PERMISO REQUERIDO',
          mensaje: 'Se necesita acceso a tu galería para añadir evidencias fotográficas.',
          tipo: 'advertencia',
          icono: 'image-off',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.45,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64Img = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setFotosSugerencia((prev) => [
          ...prev,
          { url: base64Img, descripcion: '' },
        ]);
      }
    } catch (error: any) {
      setAvisoTactico({
        visible: true,
        titulo: 'ERROR DE IMAGEN',
        mensaje: error.message || 'No se pudo cargar la imagen.',
        tipo: 'peligro',
        icono: 'alert-circle-outline',
      });
    }
  };

  const handleEliminarFotoSugerencia = (index: number) => {
    setFotosSugerencia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleActualizarDescFotoSugerencia = (index: number, desc: string) => {
    setFotosSugerencia((prev) =>
      prev.map((item, i) => (i === index ? { ...item, descripcion: desc } : item)),
    );
  };

  const handleEnviarSugerencia = async () => {
    Keyboard.dismiss();
    if (!canchaParaSugerir) return;
    if (!textoPropuesta.trim()) {
      setErrorSugerenciaModal('Por favor describe las sugerencias o correcciones para la cancha.');
      return;
    }
    setErrorSugerenciaModal(null);

    const nombreCancha = canchaParaSugerir.nombre;

    try {
      setEnviandoSugerencia(true);
      let cuerpoMensaje = `Sugerencia de actualización para la cancha "${canchaParaSugerir.nombre}" (ID: ${canchaParaSugerir.id})\n\nPropuesta del Operador:\n${textoPropuesta.trim()}`;

      if (fotosSugerencia.length > 0) {
        cuerpoMensaje +=
          `\n\nFotos y Evidencias adjuntas (${fotosSugerencia.length}):\n` +
          fotosSugerencia
            .map(
              (f, i) =>
                `Foto ${i + 1}: ${f.descripcion ? f.descripcion : 'Sin descripción'}\nURL/Data: ${f.url}`,
            )
            .join('\n');
      }

      await crearTicketApi({
        tipo: 'CANCHA',
        titulo: `Sugerencia para campo: ${canchaParaSugerir.nombre}`,
        mensaje: cuerpoMensaje,
      });

      setModalSugerirVisible(false);
      setCanchaParaSugerir(null);
      setTextoPropuesta('');
      setFotosSugerencia([]);
      setErrorSugerenciaModal(null);

      setAvisoTactico({
        visible: true,
        titulo: 'SUGERENCIA TRANSMITIDA',
        mensaje: `Tu propuesta de cambios para "${nombreCancha}" ha sido enviada a la Comandancia. El equipo de administración revisará tus aportes y fotos para actualizar la ficha oficial.`,
        tipo: 'exito',
        icono: 'email-check-outline',
      });
    } catch (error: any) {
      setErrorSugerenciaModal(error.message || 'No se pudo conectar con la comandancia.');
    } finally {
      setEnviandoSugerencia(false);
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
    setFotosForm([]);
    setErrorFormModal(null);
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
    setFotosForm(
      (cancha.fotos || []).map((f) => ({
        url: f.url,
        descripcion: f.descripcion || '',
      })),
    );
    setErrorFormModal(null);
    setModalFormVisible(true);
  };

  // Guardar Cancha (Crear o Editar)
  const handleGuardarCancha = async () => {
    Keyboard.dismiss();
    if (!nombre.trim()) {
      setErrorFormModal('El nombre del campo de juego es obligatorio.');
      return;
    }
    setErrorFormModal(null);

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
        fotos: fotosForm.filter((f) => f.url.trim().length > 0),
      };

      if (modoForm === 'CREAR') {
        await crearCanchaApi(payload);
        setModalFormVisible(false);
        setErrorFormModal(null);
        cargarCanchas();
        setAvisoTactico({
          visible: true,
          titulo: 'CAMPO ENVIADO A REVISIÓN',
          mensaje: `El campo "${nombre.trim()}" ha sido ingresado en periodo de revisión técnica.\n\nPuedes revisar el estado y seguimiento de validación desde Sugerencias & Tickets en Ajustes.`,
          tipo: 'exito',
          icono: 'clipboard-check-outline',
        });
      } else if (canchaAEditarId) {
        await modificarCanchaApi(canchaAEditarId, payload);
        setModalFormVisible(false);
        setErrorFormModal(null);
        cargarCanchas();
        setAvisoTactico({
          visible: true,
          titulo: 'INFORMACIÓN ACTUALIZADA',
          mensaje: `La información del campo fue actualizada con éxito en la base de datos.`,
          tipo: 'exito',
          icono: 'check-decagram',
        });
      }
    } catch (error: any) {
      setErrorFormModal(error.message || 'No se pudo guardar la información del campo.');
    } finally {
      setGuardandoForm(false);
    }
  };

  const renderCancha = ({ item }: { item: Cancha }) => {
    const tieneCoordenadas = item.latitud !== undefined && item.longitud !== undefined;
    const esCanchaAbierta = item.esAbierta !== false && !item.adminEquipoId;
    const esAdmin = Boolean(jugador?.esAdmin);

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

          {/* Badges de Estado y Administración */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {item.estado === 'EN_REVISION' && (
              <View style={styles.badgeEnRevision}>
                <MaterialCommunityIcons name="clock-outline" size={10} color={colors.warning} style={{ marginRight: 3 }} />
                <Text style={styles.textoBadgeEnRevision}>EN REVISIÓN</Text>
              </View>
            )}

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
                  : (item.equipoAdminNombre || 'EQUIPO')}
              </Text>
            </View>
          </View>
        </View>

        {/* Descripción táctica si existe */}
        {item.descripcion && (
          <View style={styles.descripcionBox}>
            <Text style={styles.descripcionTexto} numberOfLines={2}>
              {item.descripcion}
            </Text>
          </View>
        )}

        {/* Coordenadas GPS y fotos adjuntas */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>COORDENADAS:</Text>
          <Text style={styles.metaValor}>
            {tieneCoordenadas
              ? `${Number(item.latitud).toFixed(4)}, ${Number(item.longitud).toFixed(4)}`
              : 'Referencial (búsqueda por nombre)'}
          </Text>
          {item.fotos && item.fotos.length > 0 && (
            <View style={styles.conFotosBadge}>
              <MaterialCommunityIcons name="camera-outline" size={12} color={colors.primary} style={{ marginRight: 3 }} />
              <Text style={styles.conFotosTxt}>{item.fotos.length} FOTO{item.fotos.length > 1 ? 'S' : ''}</Text>
            </View>
          )}
        </View>

        {/* Botón de Acción Principal */}
        <View style={styles.accionesRow}>
          <TouchableOpacity
            style={styles.btnVerCancha}
            activeOpacity={0.8}
            onPress={() => setCanchaDetalleModal(item)}
          >
            <MaterialCommunityIcons name="eye-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.txtVerCancha}>VER CANCHA & FICHA TÁCTICA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Cabecera Superior con Botón para Crear */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top + 12, 48) }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.tituloWrapper}>
            <Text style={styles.badgeTop}>RADAR GEOGRÁFICO</Text>
            <Text style={styles.tituloTop}>CAMPOS & CANCHAS</Text>
          </View>

          <TouchableOpacity
            style={styles.btnRegistrarCampo}
            onPress={abrirFormCrear}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Registrar nuevo campo"
          >
            <MaterialCommunityIcons name="plus" size={16} color={colors.onPrimary} style={{ marginRight: 2 }} />
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
          {/* 1. Mi Región (Prioritaria) */}
          <TouchableOpacity
            style={[styles.filtroChip, modoFiltro === 'MI_REGION' && styles.filtroChipActivo]}
            onPress={seleccionarModoMiRegion}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por mi región ${miRegion}`}
          >
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={14}
              color={modoFiltro === 'MI_REGION' ? colors.text : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filtroChipTxt, modoFiltro === 'MI_REGION' && styles.filtroChipTxtActivo]}>
              MI REGIÓN ({miRegion.replace('Región ', '')})
            </Text>
          </TouchableOpacity>

          {/* 2. Todas las Regiones */}
          <TouchableOpacity
            style={[styles.filtroChip, modoFiltro === 'TODAS' && styles.filtroChipActivo]}
            onPress={seleccionarModoTodas}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Mostrar campos de todas las regiones"
          >
            <MaterialCommunityIcons
              name="earth"
              size={14}
              color={modoFiltro === 'TODAS' ? colors.text : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filtroChipTxt, modoFiltro === 'TODAS' && styles.filtroChipTxtActivo]}>
              TODAS
            </Text>
          </TouchableOpacity>

          {/* 3. Selector Múltiple / Filtro de Regiones */}
          <TouchableOpacity
            style={[
              styles.filtroChip,
              modoFiltro === 'PERSONALIZADA' && styles.filtroChipActivo,
            ]}
            onPress={abrirModalFiltros}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Filtrar regiones personalizadas"
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={14}
              color={modoFiltro === 'PERSONALIZADA' ? colors.text : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filtroChipTxt,
                modoFiltro === 'PERSONALIZADA' && styles.filtroChipTxtActivo,
              ]}
            >
              FILTRAR REGIONES {regionesFiltro.length > 0 && modoFiltro === 'PERSONALIZADA' ? `(${regionesFiltro.length})` : ''}
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
          <TouchableOpacity
            onPress={seleccionarModoTodas}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.limpiarFiltroTxt}>QUITAR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filtro de Modalidad de Cancha: TODAS | ABIERTAS | DE EQUIPO */}
      <View style={styles.tipoCanchaFiltroBar}>
        <TouchableOpacity
          style={[
            styles.tipoCanchaBtn,
            filtroTipoCancha === 'TODAS' && styles.tipoCanchaBtnActivo,
          ]}
          onPress={() => setFiltroTipoCancha('TODAS')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="layers-outline"
            size={13}
            color={filtroTipoCancha === 'TODAS' ? colors.primary : colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.tipoCanchaTxt,
              filtroTipoCancha === 'TODAS' && styles.tipoCanchaTxtActivo,
            ]}
          >
            TODAS ({conteoTodas})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tipoCanchaBtn,
            filtroTipoCancha === 'ABIERTAS' && styles.tipoCanchaBtnActivo,
          ]}
          onPress={() => setFiltroTipoCancha('ABIERTAS')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="earth"
            size={13}
            color={filtroTipoCancha === 'ABIERTAS' ? '#64B5F6' : colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.tipoCanchaTxt,
              filtroTipoCancha === 'ABIERTAS' && styles.tipoCanchaTxtActivo,
            ]}
          >
            ABIERTAS ({conteoAbiertas})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tipoCanchaBtn,
            filtroTipoCancha === 'EQUIPO' && styles.tipoCanchaBtnActivo,
          ]}
          onPress={() => setFiltroTipoCancha('EQUIPO')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="shield-outline"
            size={13}
            color={filtroTipoCancha === 'EQUIPO' ? '#81C784' : colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.tipoCanchaTxt,
              filtroTipoCancha === 'EQUIPO' && styles.tipoCanchaTxtActivo,
            ]}
          >
            DE EQUIPO ({conteoEquipo})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteo de Canchas */}
      <View style={styles.conteoBar}>
        <Text style={styles.conteoTxt}>
          {canchasFiltradas.length} {canchasFiltradas.length === 1 ? 'CAMPO DETECTADO' : 'CAMPOS DETECTADOS EN EL RADAR'}
        </Text>
      </View>

      {cargando ? (
        <View style={styles.centroCargando}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.textoCargando}>Localizando campos de juego...</Text>
        </View>
      ) : (
        <>
          {errorCarga && canchasFiltradas.length > 0 && (
            <EstadoErrorRed mensaje={errorCarga} onReintentar={onRefresh} compacto />
          )}
          <FlatList
            data={canchasFiltradas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCancha}
            contentContainerStyle={styles.lista}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              errorCarga ? (
                <EstadoErrorRed mensaje={errorCarga} onReintentar={onRefresh} />
              ) : (
                <View style={styles.vacio}>
                  <MaterialCommunityIcons
                    name="map-search-outline"
                    size={48}
                    color={colors.textSecondary}
                    style={{ marginBottom: 12 }}
                  />
                  <Text style={styles.tituloVacio}>Sin campos en esta selección</Text>
                  <Text style={styles.subtituloVacio}>
                    {modoFiltro === 'MI_REGION'
                      ? `No se encontraron canchas activas registradas en ${miRegion}. Puedes cambiar al filtro "TODAS" para ver campos en otras zonas o registrar uno nuevo.`
                      : 'No se encontraron canchas activas para los filtros seleccionados (Región / Modalidad). Puedes registrar una nueva cancha con el botón superior.'}
                  </Text>
                  {modoFiltro === 'MI_REGION' && (
                    <TouchableOpacity
                      style={[styles.modalBtnPrimario, { marginTop: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                      onPress={seleccionarModoTodas}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="earth" size={16} color={colors.onPrimary} style={{ marginRight: 8 }} />
                      <Text style={styles.modalTxtPrimario}>EXPLORAR TODAS LAS REGIONES</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            }
          />
        </>
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
                    {seleccionada && (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={colors.primary}
                      />
                    )}
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
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalFormVisible(false);
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
          <View style={[styles.modalContenido, { maxHeight: '88%' }]}>
            <Pressable onPress={Keyboard.dismiss} accessible={false}>
              <Text style={styles.modalTitulo}>
                {modoForm === 'CREAR' ? 'REGISTRAR CAMPO TÁCTICO' : 'EDITAR CAMPO TÁCTICO'}
              </Text>
              <Text style={styles.modalSubtitulo}>
                {modoForm === 'CREAR'
                  ? 'Agrega una nueva cancha para organizar partidas y versus.'
                  : 'Modifica las características o geolocalización de la cancha.'}
              </Text>

              {modoForm === 'CREAR' && (
                <View style={styles.bannerRevisionInfo}>
                  <MaterialCommunityIcons name="clock-alert-outline" size={18} color={colors.warning} style={{ marginRight: 8 }} />
                  <Text style={styles.txtBannerRevisionInfo}>
                    <Text style={{ fontWeight: 'bold' }}>Periodo de Revisión:</Text> Los campos nuevos pasan por verificación técnica de la comandancia. Quedará registrada en tu apartado de Sugerencias para que sigas su estado.
                  </Text>
                </View>
              )}
            </Pressable>

            <ScrollView
              style={{ marginBottom: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={Keyboard.dismiss} accessible={false}>
                {/* Nombre */}
                <Text style={styles.inputLabel}>NOMBRE DEL CAMPO (*):</Text>
                <TextInput
                  style={styles.inputModal}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ej: Fuerte Airsoft / CQB Lampa"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                />

                {/* Región Selector */}
                <Text style={styles.inputLabel}>REGIÓN DE CHILE (*):</Text>
                <TouchableOpacity
                  style={styles.dropdownSelector}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalSelectorRegionForm(true);
                  }}
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
                  returnKeyType="done"
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
                      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
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
                      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
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
                      Keyboard.dismiss();
                      setEsAbiertaForm(true);
                      setAsociarAEscuadra(false);
                    }}
                  >
                    <MaterialCommunityIcons name="earth" size={24} color={colors.primary} style={{ marginRight: 10 }} />
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
                      Keyboard.dismiss();
                      if (!jugador?.equipoId) {
                        setAvisoTactico({
                          visible: true,
                          titulo: 'SIN ESCUADRÓN ACTIVO',
                          mensaje: 'Para registrar un campo oficial de equipo debes pertenecer o liderar un escuadrón. Se mantendrá como cancha comunitaria.',
                          tipo: 'advertencia',
                          icono: 'shield-alert-outline',
                        });
                        setEsAbiertaForm(true);
                        setAsociarAEscuadra(false);
                        return;
                      }
                      setAsociarAEscuadra(true);
                      setEsAbiertaForm(false);
                    }}
                  >
                    <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tipoCanchaTitulo}>CAMPO OFICIAL DE MI EQUIPO</Text>
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
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={Keyboard.dismiss}
                />

                {/* Apartado de Fotos y Evidencias */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>FOTOS Y EVIDENCIAS DEL CAMPO:</Text>
                <Text style={styles.inputAyuda}>
                  Sube fotos de las zonas de juego, accesos o seguridad con una breve descripción para validar el campo con mayor rapidez:
                </Text>

                {fotosForm.map((foto, index) => (
                  <View key={index} style={styles.fotoItemCard}>
                    <Image source={{ uri: foto.url }} style={styles.fotoMiniatura} />
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <TextInput
                        style={styles.inputFotoDesc}
                        value={foto.descripcion}
                        onChangeText={(txt) => handleActualizarDescFoto(index, txt)}
                        placeholder="Descripción (ej: Respawn Alfa / Bosque)"
                        placeholderTextColor={colors.textMuted}
                        returnKeyType="done"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.btnEliminarFoto}
                      onPress={() => handleEliminarFoto(index)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar foto adjunta"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.btnAgregarFoto} onPress={handleAgregarFoto}>
                  <MaterialCommunityIcons name="camera-plus" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnAgregarFoto}>+ AÑADIR FOTO Y DESCRIPCIÓN</Text>
                </TouchableOpacity>
              </Pressable>
            </ScrollView>

            {errorFormModal ? (
              <View style={styles.bannerErrorModal}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.txtErrorModal}>{errorFormModal}</Text>
              </View>
            ) : null}

            {/* Botones del Formulario */}
            <View style={styles.modalFiltrosBotones}>
              <TouchableOpacity
                style={styles.modalBtnSecundario}
                onPress={() => {
                  Keyboard.dismiss();
                  setErrorFormModal(null);
                  setModalFormVisible(false);
                }}
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
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.modalTxtPrimario}>
                    {modoForm === 'CREAR' ? 'GUARDAR CAMPO' : 'ACTUALIZAR CAMPO'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
                  {reg === regionForm && (
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
              style={styles.modalBtnSecundario}
              onPress={() => setModalSelectorRegionForm(false)}
            >
              <Text style={styles.modalTxtSecundario}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: VER CANCHA (FICHA DETALLADA MODULARIZADA) */}
      <ModalFichaCancha
        visible={canchaDetalleModal !== null}
        cancha={canchaDetalleModal}
        esAdmin={Boolean(jugador?.esAdmin)}
        onCerrar={() => setCanchaDetalleModal(null)}
        onAbrirGoogleMaps={handleAbrirGoogleMaps}
        onAbrirFormEditar={abrirFormEditar}
        onAbrirModalSugerir={abrirModalSugerir}
      />

      {/* MODAL: SUGERIR CAMBIOS A UNA CANCHA (JUGADORES REGULARES) */}
      <Modal
        visible={modalSugerirVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalSugerirVisible(false);
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
          <View style={[styles.modalContenido, { maxHeight: '88%' }]}>
            <Pressable onPress={Keyboard.dismiss} accessible={false}>
              <Text style={styles.modalTitulo}>SUGERIR CAMBIOS DE CAMPO</Text>
              <Text style={styles.modalSubtitulo}>
                {canchaParaSugerir ? `Campo: ${canchaParaSugerir.nombre}` : 'Propuesta de actualización'}
              </Text>

              <View style={styles.bannerRevisionInfo}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.txtBannerRevisionInfo}>
                  <Text style={{ fontWeight: 'bold' }}>Canal de Comandancia:</Text> Tus correcciones, indicaciones de accesos o nuevas fotografías serán revisadas por los administradores para actualizar la ficha oficial.
                </Text>
              </View>
            </Pressable>

            <ScrollView
              style={{ marginBottom: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={Keyboard.dismiss} accessible={false}>
                <Text style={styles.inputLabel}>DETALLE DE CAMBIOS SUGERIDOS (*):</Text>
                <TextInput
                  style={[styles.inputModal, { minHeight: 90, textAlignVertical: 'top' }]}
                  value={textoPropuesta}
                  onChangeText={setTextoPropuesta}
                  placeholder="Indica qué datos corregir (coordenadas, horarios, precios, reglas del campo, accesos, etc.)..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>FOTOS Y EVIDENCIAS NUEVAS:</Text>
                <Text style={styles.inputAyuda}>
                  Puedes adjuntar fotografías actualizadas del campo con una breve descripción:
                </Text>

                {fotosSugerencia.map((foto, index) => (
                  <View key={index} style={styles.fotoItemCard}>
                    <Image source={{ uri: foto.url }} style={styles.fotoMiniatura} />
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <TextInput
                        style={styles.inputFotoDesc}
                        value={foto.descripcion}
                        onChangeText={(txt) => handleActualizarDescFotoSugerencia(index, txt)}
                        placeholder="Descripción (ej: Nuevo acceso norte / Zona safe)"
                        placeholderTextColor={colors.textMuted}
                        returnKeyType="done"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.btnEliminarFoto}
                      onPress={() => handleEliminarFotoSugerencia(index)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar foto adjunta"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.btnAgregarFoto} onPress={handleAgregarFotoSugerencia}>
                  <MaterialCommunityIcons name="camera-plus" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnAgregarFoto}>+ ADJUNTAR FOTO ACTUALIZADA</Text>
                </TouchableOpacity>
              </Pressable>
            </ScrollView>

            {errorSugerenciaModal ? (
              <View style={styles.bannerErrorModal}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.txtErrorModal}>{errorSugerenciaModal}</Text>
              </View>
            ) : null}

            <View style={styles.modalFiltrosBotones}>
              <TouchableOpacity
                style={styles.modalBtnSecundario}
                onPress={() => {
                  Keyboard.dismiss();
                  setErrorSugerenciaModal(null);
                  setModalSugerirVisible(false);
                }}
                disabled={enviandoSugerencia}
              >
                <Text style={styles.modalTxtSecundario}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnPrimario}
                onPress={handleEnviarSugerencia}
                disabled={enviandoSugerencia}
              >
                {enviandoSugerencia ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.modalTxtPrimario}>ENVIAR A COMANDANCIA</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Táctico de Avisos y Notificaciones */}
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
    paddingTop: 16,
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
    fontFamily: fonts.displayBold,
    letterSpacing: 0.5,
  },
  btnRegistrarCampo: {
    backgroundColor: colors.primary,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txtRegistrarCampo: {
    color: colors.onPrimary,
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
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtroChipActivo: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
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
    backgroundColor: colors.primarySoft,
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
  tipoCanchaFiltroBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  tipoCanchaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
  },
  tipoCanchaBtnActivo: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tipoCanchaTxt: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tipoCanchaTxtActivo: {
    color: colors.text,
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
    fontFamily: fonts.displayBold,
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
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  textoBadgeAdmin: {
    fontSize: 11,
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
    fontVariant: ['tabular-nums'],
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
    backgroundColor: colors.warningSoft,
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
  btnSugerir: {
    flex: 1,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.4)',
  },
  txtSugerir: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detalleBotonesRow: {
    marginTop: 10,
    marginBottom: 6,
  },
  btnDetalleEditar: {
    backgroundColor: colors.warning,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtBtnDetalleEditar: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnDetalleSugerir: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  txtBtnDetalleSugerir: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    backgroundColor: colors.overlay,
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
    backgroundColor: colors.primarySoft,
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
    color: colors.onPrimary,
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
    backgroundColor: colors.primarySoft,
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
  badgeEnRevision: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoBadgeEnRevision: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  conFotosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conFotosTxt: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  btnVerCancha: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  txtVerCancha: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerRevisionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 158, 46, 0.12)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 12,
  },
  txtBannerRevisionInfo: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  inputAyuda: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 15,
  },
  fotoItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fotoMiniatura: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  inputFotoDesc: {
    color: colors.text,
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  btnEliminarFoto: {
    padding: 6,
  },
  btnAgregarFoto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    marginBottom: 12,
  },
  txtBtnAgregarFoto: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  detalleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  detalleEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  detalleTitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  btnCerrarModal: {
    padding: 6,
    backgroundColor: colors.inputBg,
    borderRadius: 20,
  },
  detalleBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detalleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  detalleSeccionBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  detalleSeccionTitulo: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  detalleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detalleItemTxt: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  detalleDescTxt: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  detalleFotoCard: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  detalleFotoImg: {
    width: '100%',
    height: 170,
    backgroundColor: '#111',
  },
  detalleFotoDescBox: {
    padding: 8,
    backgroundColor: colors.card,
  },
  detalleFotoDescTxt: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  sinFotosBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  sinFotosTxt: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  btnAbrirMapsGrande: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  txtBtnAbrirMapsGrande: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bannerErrorModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  txtErrorModal: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
});
