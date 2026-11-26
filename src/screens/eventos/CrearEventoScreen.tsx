import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Linking,
  Switch,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  crearEventoApi,
  listarEquiposApi,
  EquipoResumen,
} from '../../api/eventos.service';
import { listarCanchasApi, Cancha } from '../../api/canchas.service';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TacticalDateTimePicker } from '../../components/TacticalDateTimePicker';
import { ModalConfirmacionTactico } from '../../components/ModalConfirmacionTactico';
import { colors } from '../../theme/colors';
import type { NavigationProp } from '../../navigation/types';

export const REGIONES_CHILE = [
  'Región Metropolitana',
  'Región de Valparaíso',
  'Región del Biobío',
  'Región de la Araucanía',
  'Región de Coquimbo',
  'Región de Antofagasta',
  'Región de Los Lagos',
  "Región de O'Higgins",
  'Región del Maule',
  'Región de Los Ríos',
  'Región de Tarapacá',
  'Región de Arica y Parinacota',
  'Región de Atacama',
  'Región de Aysén',
  'Región de Magallanes',
  'Región de Ñuble',
];

export const ROLES_DISPONIBLES = [
  { id: 'ASALTO', label: 'Asalto', icon: 'lightning-bolt' as const },
  { id: 'CQB', label: 'CQB', icon: 'door-open' as const },
  { id: 'SNIPER', label: 'Sniper', icon: 'crosshairs' as const },
  { id: 'DMR', label: 'DMR', icon: 'telescope' as const },
  { id: 'APOYO', label: 'Apoyo', icon: 'shield-plus' as const },
  { id: 'MÉDICO', label: 'Médico', icon: 'medical-bag' as const },
];

export const CrearEventoScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { jugador } = useAuth();

  // Control de Pasos (1: Tipo & Ubicación | 2: Fechas & Roles/Facciones | 3: TACSOP & COMMS solo para Masivo)
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  // Feedback inline táctico para validaciones
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarError = (msg: string) => {
    setErrorValidacion(msg);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = setTimeout(() => {
      setErrorValidacion(null);
    }, 10000);
  };

  // Paso 1 - Estado
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<'PICHANGA' | 'VERSUS' | 'TORNEO' | 'EVENTO_MASIVO'>('PICHANGA');
  const [regionSeleccionada, setRegionSeleccionada] = useState(
    jugador?.region || 'Región Metropolitana',
  );
  const [modalRegionVisible, setModalRegionVisible] = useState(false);

  // Canchas filtradas por la región seleccionada
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState<number | null>(null);
  const [cargandoCanchas, setCargandoCanchas] = useState(false);

  // Ubicación flexible para EVENTO MASIVO (Terreno Libre / GPS)
  const [tipoUbicacionMasivo, setTipoUbicacionMasivo] = useState<'CANCHA' | 'TERRENO_LIBRE'>('CANCHA');
  const [direccionTexto, setDireccionTexto] = useState('');
  const [latitudInput, setLatitudInput] = useState('');
  const [longitudInput, setLongitudInput] = useState('');
  const [mapaTacticoUrl, setMapaTacticoUrl] = useState('');

  // Equipos registrados para VERSUS
  const [equipos, setEquipos] = useState<EquipoResumen[]>([]);
  const [equipoAId, setEquipoAId] = useState<number | null>(null);
  const [equipoBId, setEquipoBId] = useState<number | null>(null);

  // Facciones temáticas para EVENTO MASIVO (Milsim / Combat Mission)
  const [bando1Nombre, setBando1Nombre] = useState('Fuerzas Coalición (OTAN)');
  const [bando1Color, setBando1Color] = useState('#1976D2');
  const [bando1CupoMax, setBando1CupoMax] = useState('25');
  const [bando2Nombre, setBando2Nombre] = useState('Insurgencia / Milicia');
  const [bando2Color, setBando2Color] = useState('#D32F2F');
  const [bando2CupoMax, setBando2CupoMax] = useState('25');

  // Conversión exacta energía cinética con BB 0.20g: E = 0.5 * 0.0002 * (fps * 0.3048)^2
  const fpsToJoules = (fps: number): number => {
    if (!fps || fps <= 0) return 0;
    const j = 0.5 * 0.0002 * Math.pow(fps * 0.3048, 2);
    return parseFloat(j.toFixed(2));
  };

  const joulesToFps = (joules: number): number => {
    if (!joules || joules <= 0) return 0;
    const fps = Math.sqrt(joules / (0.5 * 0.0002 * Math.pow(0.3048, 2)));
    return Math.round(fps);
  };

  // COMMS Baofeng UV-5R para EVENTO MASIVO
  const [frecuenciaEmergencia, setFrecuenciaEmergencia] = useState('462.5625 MHz');
  const [frecuenciaStaff, setFrecuenciaStaff] = useState('462.5875 MHz');
  const [subtonoStaff, setSubtonoStaff] = useState('67.0 CTCSS');
  const [frecuenciaBando1, setFrecuenciaBando1] = useState('462.6125 MHz');
  const [frecuenciaBando2, setFrecuenciaBando2] = useState('467.5625 MHz');

  // TACSOP Digital para EVENTO MASIVO
  const [presetTacsop, setPresetTacsop] = useState<'COMBAT_MISSION' | 'MILSIM' | 'CUSTOM'>('COMBAT_MISSION');
  const [vidasMax, setVidasMax] = useState<number>(2);
  const [requiereTorniquete, setRequiereTorniquete] = useState<boolean>(true);
  const [torniquetesPorJugador, setTorniquetesPorJugador] = useState<number>(1);
  const [tiempoDesangradoMin, setTiempoDesangradoMin] = useState<number>(3);
  const [soloMedicoRevive, setSoloMedicoRevive] = useState<boolean>(false);
  const [requierePanueloRojo, setRequierePanueloRojo] = useState<boolean>(true);
  const [luzRojaNocturna, setLuzRojaNocturna] = useState<'OBLIGATORIA' | 'RECOMENDADA' | 'NO_REQUERIDA'>('RECOMENDADA');
  const [tipoCargadores, setTipoCargadores] = useState<'MID_CAP' | 'REAL_CAP' | 'LIBRE'>('LIBRE');
  const [limiteMunicionBbs, setLimiteMunicionBbs] = useState<string>('');
  const [pirotecniaPermitida, setPirotecniaPermitida] = useState<boolean>(false);
  const [humoFrioPermitido, setHumoFrioPermitido] = useState<boolean>(true);

  // Límites de Crono por Categoría
  const [limitesCrono, setLimitesCrono] = useState([
    { categoria: 'PISTOLA', maxJoules: 1.0, maxFps: 328, medMetros: 0, tipoDisparo: 'SEMI' },
    { categoria: 'ASALTO', maxJoules: 1.49, maxFps: 400, medMetros: 5, tipoDisparo: 'SEMI_AUTO' },
    { categoria: 'SOPORTE', maxJoules: 1.6, maxFps: 415, medMetros: 15, tipoDisparo: 'AUTO_RAFAGA' },
    { categoria: 'DMR', maxJoules: 1.88, maxFps: 450, medMetros: 20, tipoDisparo: 'SEMI' },
    { categoria: 'SNIPER', maxJoules: 2.81, maxFps: 550, medMetros: 30, tipoDisparo: 'CERROJO' },
  ]);

  // Paso 2 - Estado (Fechas, Briefing y Rol del Creador)
  const fechaDefaultInicio = new Date();
  fechaDefaultInicio.setDate(fechaDefaultInicio.getDate() + 1);
  fechaDefaultInicio.setHours(10, 0, 0, 0);

  const fechaDefaultFin = new Date(fechaDefaultInicio);
  fechaDefaultFin.setHours(16, 0, 0, 0);

  const [fechaInicio, setFechaInicio] = useState<Date>(fechaDefaultInicio);
  const [fechaFin, setFechaFin] = useState<Date>(fechaDefaultFin);
  const [descripcion, setDescripcion] = useState('');
  const [privacidad, setPrivacidad] = useState<'ABIERTO' | 'CERRADO'>('ABIERTO');

  // Roles del creador: array para permitir selección múltiple en Pichanga/VS
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>(['ASALTO']);
  const [bandoCreadorIndex, setBandoCreadorIndex] = useState<number>(0);

  const [guardando, setGuardando] = useState(false);
  const [eventoPublicado, setEventoPublicado] = useState<{ id: number; titulo: string; codigoInvitacion?: string } | null>(null);

  // Aplicar Preset de TACSOP
  const aplicarPreset = (p: 'COMBAT_MISSION' | 'MILSIM' | 'CUSTOM') => {
    setPresetTacsop(p);
    if (p === 'COMBAT_MISSION') {
      setVidasMax(2);
      setRequiereTorniquete(true);
      setTorniquetesPorJugador(1);
      setTiempoDesangradoMin(3);
      setSoloMedicoRevive(false);
      setRequierePanueloRojo(true);
      setLuzRojaNocturna('RECOMENDADA');
      setTipoCargadores('LIBRE');
      setLimiteMunicionBbs('');
      setPirotecniaPermitida(false);
      setHumoFrioPermitido(true);
      setLimitesCrono([
        { categoria: 'PISTOLA', maxJoules: 1.0, maxFps: 328, medMetros: 0, tipoDisparo: 'SEMI' },
        { categoria: 'ASALTO', maxJoules: 1.49, maxFps: 400, medMetros: 5, tipoDisparo: 'SEMI_AUTO' },
        { categoria: 'SOPORTE', maxJoules: 1.6, maxFps: 415, medMetros: 15, tipoDisparo: 'AUTO_RAFAGA' },
        { categoria: 'DMR', maxJoules: 1.88, maxFps: 450, medMetros: 20, tipoDisparo: 'SEMI' },
        { categoria: 'SNIPER', maxJoules: 2.81, maxFps: 550, medMetros: 30, tipoDisparo: 'CERROJO' },
      ]);
    } else if (p === 'MILSIM') {
      setVidasMax(2);
      setRequiereTorniquete(true);
      setTorniquetesPorJugador(2);
      setTiempoDesangradoMin(5);
      setSoloMedicoRevive(true);
      setRequierePanueloRojo(true);
      setLuzRojaNocturna('OBLIGATORIA');
      setTipoCargadores('MID_CAP');
      setLimiteMunicionBbs('600');
      setPirotecniaPermitida(false);
      setHumoFrioPermitido(true);
      setLimitesCrono([
        { categoria: 'PISTOLA', maxJoules: 1.0, maxFps: 328, medMetros: 0, tipoDisparo: 'SEMI' },
        { categoria: 'ASALTO', maxJoules: 1.14, maxFps: 350, medMetros: 10, tipoDisparo: 'SEMI' },
        { categoria: 'SOPORTE', maxJoules: 1.5, maxFps: 400, medMetros: 15, tipoDisparo: 'AUTO_RAFAGA' },
        { categoria: 'DMR', maxJoules: 1.88, maxFps: 450, medMetros: 20, tipoDisparo: 'SEMI' },
        { categoria: 'SNIPER', maxJoules: 2.81, maxFps: 550, medMetros: 30, tipoDisparo: 'CERROJO' },
      ]);
    }
  };

  // Cargar canchas cuando cambia la región
  useEffect(() => {
    async function cargarCanchasPorRegion() {
      setCargandoCanchas(true);
      try {
        const data = await listarCanchasApi(regionSeleccionada);
        setCanchas(data);
        if (data.length > 0) {
          setCanchaSeleccionada(data[0].id);
        } else {
          setCanchaSeleccionada(null);
        }
      } catch {
        setCanchas([]);
        setCanchaSeleccionada(null);
      } finally {
        setCargandoCanchas(false);
      }
    }
    cargarCanchasPorRegion();
  }, [regionSeleccionada]);

  // Cargar equipos si se selecciona VERSUS
  useEffect(() => {
    if (tipo === 'VERSUS') {
      async function cargarEquipos() {
        try {
          const data = await listarEquiposApi();
          setEquipos(data);
          if (data.length >= 2) {
            if (jugador?.equipoId && data.some((e) => e.id === jugador.equipoId)) {
              setEquipoAId(jugador.equipoId);
              const rival = data.find((e) => e.id !== jugador.equipoId);
              setEquipoBId(rival ? rival.id : data[1].id);
              setBandoCreadorIndex(0);
            } else {
              setEquipoAId(data[0].id);
              setEquipoBId(data[1].id);
            }
          } else if (data.length === 1) {
            setEquipoAId(data[0].id);
          }
        } catch {
          // Silencioso
        }
      }
      cargarEquipos();
    }
  }, [tipo, jugador?.equipoId]);

  // Manejo de roles del creador
  const toggleRol = (rolId: string) => {
    if (tipo === 'EVENTO_MASIVO') {
      // En Masivos solo se permite 1 rol (especialización táctica militar)
      setRolesSeleccionados([rolId]);
    } else {
      // En Pichanga o Versus se pueden elegir múltiples (ej: Asalto + CQB)
      if (rolesSeleccionados.includes(rolId)) {
        if (rolesSeleccionados.length === 1) {
          mostrarError('Debes mantener al menos 1 rol asignado en tu escuadrón');
          return;
        }
        setRolesSeleccionados(rolesSeleccionados.filter((r) => r !== rolId));
      } else {
        setRolesSeleccionados([...rolesSeleccionados, rolId]);
      }
    }
  };

  const equipoAObj = equipos.find((e) => e.id === equipoAId);
  const equipoBObj = equipos.find((e) => e.id === equipoBId);
  const nombreEquipoA = equipoAObj?.nombre || 'Equipo Local (A)';
  const nombreEquipoB = equipoBObj?.nombre || 'Equipo Visitante (B)';

  // Validación y cambio al Paso 2
  const avanzarAlPaso2 = () => {
    if (!titulo.trim()) {
      mostrarError('Por favor ingresa un nombre o designación para la operación.');
      return;
    }
    if (tipo === 'EVENTO_MASIVO' && tipoUbicacionMasivo === 'TERRENO_LIBRE') {
      if (!direccionTexto.trim()) {
        mostrarError('Debes ingresar el nombre o sector del terreno libre.');
        return;
      }
    } else if (!canchaSeleccionada) {
      mostrarError(`Debes seleccionar una cancha registrada en ${regionSeleccionada}.`);
      return;
    }
    if (tipo === 'VERSUS') {
      if (!equipoAId || !equipoBId) {
        mostrarError('Debes seleccionar el Equipo A y el Equipo B para el Versus.');
        return;
      }
      if (equipoAId === equipoBId) {
        mostrarError('El Equipo A y el Equipo B no pueden ser el mismo escuadrón.');
        return;
      }
    }
    setErrorValidacion(null);
    setPaso(2);
  };

  const avanzarAlPaso3 = () => {
    if (tipo === 'EVENTO_MASIVO') {
      if (!bando1Nombre.trim() || !bando2Nombre.trim()) {
        mostrarError('Debes indicar el nombre de ambas facciones temáticas.');
        return;
      }
    }
    setErrorValidacion(null);
    setPaso(3);
  };

  // Creación final del evento
  const handlePublicarOperacion = async () => {
    if (tipo !== 'EVENTO_MASIVO' && !canchaSeleccionada) {
      mostrarError('Selecciona una cancha registrada antes de transmitir la orden.');
      return;
    }
    if (tipo === 'EVENTO_MASIVO' && tipoUbicacionMasivo === 'CANCHA' && !canchaSeleccionada) {
      mostrarError('Por favor selecciona una cancha registrada o cambia a Terreno Libre.');
      return;
    }

    const ahora = new Date();
    if (fechaInicio.getTime() < ahora.getTime() - 60000) {
      mostrarError('No se puede programar una partida para una fecha u hora anterior a la actual.');
      return;
    }

    if (fechaFin.getTime() <= fechaInicio.getTime()) {
      mostrarError('La fecha y hora de término debe ser posterior a la fecha y hora de inicio.');
      return;
    }

    try {
      setGuardando(true);

      let bandosPayload: any[] | undefined = undefined;
      if (tipo === 'EVENTO_MASIVO') {
        bandosPayload = [
          {
            nombre: bando1Nombre.trim(),
            colorHex: bando1Color,
            frecuenciaRadio: frecuenciaBando1,
            cupoMax: bando1CupoMax ? parseInt(bando1CupoMax, 10) : undefined,
          },
          {
            nombre: bando2Nombre.trim(),
            colorHex: bando2Color,
            frecuenciaRadio: frecuenciaBando2,
            cupoMax: bando2CupoMax ? parseInt(bando2CupoMax, 10) : undefined,
          },
        ];
      } else if (tipo === 'VERSUS' && equipoAId && equipoBId) {
        const eqA = equipos.find((e) => e.id === equipoAId);
        const eqB = equipos.find((e) => e.id === equipoBId);
        bandosPayload = [
          { nombre: eqA?.nombre || 'Equipo Alfa', colorHex: '#2E7D32' },
          { nombre: eqB?.nombre || 'Equipo Bravo', colorHex: '#C62828' },
        ];
      }

      let bandoOrganizador: number | undefined = bandoCreadorIndex;
      if (tipo === 'PICHANGA' || tipo === 'EVENTO_MASIVO') {
        bandoOrganizador = undefined;
      }

      const tacsopPayload = tipo === 'EVENTO_MASIVO' ? {
        presetTipo: presetTacsop,
        vidasMax,
        requiereTorniquete,
        torniquetesPorJugador,
        tiempoDesangradoMin,
        soloMedicoRevive,
        requierePanueloRojo,
        luzRojaNocturna,
        tipoCargadores,
        limiteMunicionBbs: limiteMunicionBbs ? Number(limiteMunicionBbs) : null,
        pirotecniaPermitida,
        humoFrioPermitido,
        limitesCrono,
        frecuenciaEmergencia,
        frecuenciaStaff,
        subtonoStaff,
      } : undefined;

      const fasesPayload = tipo === 'EVENTO_MASIVO' ? [
        { nombre: 'Fase 0: Previo a la Partida (Planificación)', esFaseCrono: false, activa: true, orden: 1 },
        { nombre: 'Fase 1: Llegada y Cronaje', esFaseCrono: true, activa: false, orden: 2 },
        { nombre: 'Fase 2: Inserción y Hostilidades', esFaseCrono: false, activa: false, orden: 3 },
        { nombre: 'Fase 3: Conclusión y Debriefing', esFaseCrono: false, activa: false, orden: 4 },
      ] : undefined;

      const nuevoEvento = await crearEventoApi({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        tipo,
        privacidad: tipo === 'VERSUS' ? 'CERRADO' : privacidad,
        canchaId: tipo === 'EVENTO_MASIVO' && tipoUbicacionMasivo === 'TERRENO_LIBRE' ? null : canchaSeleccionada,
        latitud: latitudInput ? parseFloat(latitudInput) : undefined,
        longitud: longitudInput ? parseFloat(longitudInput) : undefined,
        direccionTexto: direccionTexto.trim() || undefined,
        mapaTacticoUrl: mapaTacticoUrl.trim() || undefined,
        region: regionSeleccionada,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        equipoAId: tipo === 'VERSUS' ? equipoAId || undefined : undefined,
        equipoBId: tipo === 'VERSUS' ? equipoBId || undefined : undefined,
        rolOrganizador: undefined, // El organizador no pre-elige rol al crear
        bandoOrganizadorIndex: bandoOrganizador,
        bandos: bandosPayload,
        tacsop: tacsopPayload,
        fases: fasesPayload,
      });

      setEventoPublicado({
        id: nuevoEvento.id,
        titulo: nuevoEvento.titulo,
        codigoInvitacion: nuevoEvento.codigoInvitacion,
      });
    } catch (error: any) {
      mostrarError(error.message || 'No se pudo publicar la operación en la red táctica.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Pressable onPress={Keyboard.dismiss} accessible={false}>
      {/* Indicador de Pasos Superior */}
      <View style={styles.pasosHeader}>
        <View style={[styles.pasoItem, paso === 1 && styles.pasoItemActivo]}>
          <Text style={[styles.pasoNumero, paso === 1 && styles.pasoNumeroActivo]}>1</Text>
          <Text style={[styles.pasoTexto, paso === 1 && styles.pasoTextoActivo]}>
            {tipo === 'EVENTO_MASIVO' ? 'TIPO & TERRENO' : 'TIPO & CANCHA'}
          </Text>
        </View>

        <View style={styles.pasoSeparador} />

        <View style={[styles.pasoItem, paso === 2 && styles.pasoItemActivo]}>
          <Text style={[styles.pasoNumero, paso === 2 && styles.pasoNumeroActivo]}>2</Text>
          <Text style={[styles.pasoTexto, paso === 2 && styles.pasoTextoActivo]}>
            {tipo === 'EVENTO_MASIVO' ? 'BRIEFING & FACCIONES' : 'FECHAS & ROLES'}
          </Text>
        </View>

        {tipo === 'EVENTO_MASIVO' && (
          <>
            <View style={styles.pasoSeparador} />
            <View style={[styles.pasoItem, paso === 3 && styles.pasoItemActivo]}>
              <Text style={[styles.pasoNumero, paso === 3 && styles.pasoNumeroActivo]}>3</Text>
              <Text style={[styles.pasoTexto, paso === 3 && styles.pasoTextoActivo]}>
                TACSOP & COMMS
              </Text>
            </View>
          </>
        )}
      </View>

      {/* ======================= PASO 1 ======================= */}
      {paso === 1 && (
        <View>
          {/* Tipo de Evento */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>1. MODALIDAD DEL EVENTO</Text>
            <View style={styles.tiposGrid}>
              {/* Pichanga */}
              <TouchableOpacity
                style={[styles.tipoCard, tipo === 'PICHANGA' && styles.tipoCardActivo]}
                onPress={() => setTipo('PICHANGA')}
              >
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={26}
                  color={tipo === 'PICHANGA' ? colors.primary : colors.textMuted}
                  style={{ marginBottom: 4 }}
                />
                <Text style={[styles.tipoTitulo, tipo === 'PICHANGA' && styles.tipoTituloActivo]}>
                  PICHANGA
                </Text>
                <Text style={styles.tipoDesc}>
                  Equipos dinámicos y revueltos por ronda.
                </Text>
              </TouchableOpacity>

              {/* Versus */}
              <TouchableOpacity
                style={[styles.tipoCard, tipo === 'VERSUS' && styles.tipoCardActivo]}
                onPress={() => setTipo('VERSUS')}
              >
                <MaterialCommunityIcons
                  name="sword-cross"
                  size={26}
                  color={tipo === 'VERSUS' ? colors.primary : colors.textMuted}
                  style={{ marginBottom: 4 }}
                />
                <Text style={[styles.tipoTitulo, tipo === 'VERSUS' && styles.tipoTituloActivo]}>
                  VERSUS
                </Text>
                <Text style={styles.tipoDesc}>
                  Duelo directo entre dos escuadras oficiales.
                </Text>
              </TouchableOpacity>

              {/* Evento Masivo */}
              <TouchableOpacity
                style={[styles.tipoCard, tipo === 'EVENTO_MASIVO' && styles.tipoCardActivo]}
                onPress={() => setTipo('EVENTO_MASIVO')}
              >
                <MaterialCommunityIcons
                  name="shield-star"
                  size={26}
                  color={tipo === 'EVENTO_MASIVO' ? colors.primary : colors.textMuted}
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={[
                    styles.tipoTitulo,
                    tipo === 'EVENTO_MASIVO' && styles.tipoTituloActivo,
                  ]}
                >
                  MASIVO / MILSIM
                </Text>
                <Text style={styles.tipoDesc}>
                  Misiones temáticas, guión y facciones personalizadas.
                </Text>
              </TouchableOpacity>

              {/* Torneo (Stand By) */}
              <View style={[styles.tipoCard, styles.tipoCardStandBy]}>
                <View style={styles.standByBadge}>
                  <Text style={styles.standByTexto}>STAND BY</Text>
                </View>
                <MaterialCommunityIcons name="trophy-outline" size={26} color={colors.textMuted} style={{ marginBottom: 4 }} />
                <Text style={styles.tipoTituloStandBy}>TORNEO</Text>
                <Text style={styles.tipoDesc}>
                  Llaves eliminatorias y fases de grupos (Próximamente).
                </Text>
              </View>
            </View>
          </View>

          {/* Nombre de la Operación */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>2. NOMBRE DE LA OPERACIÓN</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Pichanga Nocturna / Operación Cóndor"
              placeholderTextColor={colors.textMuted}
              value={titulo}
              onChangeText={setTitulo}
              maxLength={100}
            />
          </View>

          {/* Selector de Región y Canchas Creadas / Terreno Libre */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>
              {tipo === 'EVENTO_MASIVO' ? '3. UBICACIÓN DE LA OPERACIÓN' : '3. REGIÓN & CANCHA DE JUEGO'}
            </Text>

            {tipo === 'EVENTO_MASIVO' && (
              <View style={styles.tipoUbicacionSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.btnTipoUbicacion,
                    tipoUbicacionMasivo === 'CANCHA' && styles.btnTipoUbicacionActivo,
                  ]}
                  onPress={() => setTipoUbicacionMasivo('CANCHA')}
                >
                  <MaterialCommunityIcons
                    name="stadium"
                    size={16}
                    color={tipoUbicacionMasivo === 'CANCHA' ? '#fff' : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.txtTipoUbicacion,
                      tipoUbicacionMasivo === 'CANCHA' && styles.txtTipoUbicacionActivo,
                    ]}
                  >
                    CANCHA REGISTRADA
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btnTipoUbicacion,
                    tipoUbicacionMasivo === 'TERRENO_LIBRE' && styles.btnTipoUbicacionActivo,
                  ]}
                  onPress={() => setTipoUbicacionMasivo('TERRENO_LIBRE')}
                >
                  <MaterialCommunityIcons
                    name="map-marker-radius"
                    size={16}
                    color={tipoUbicacionMasivo === 'TERRENO_LIBRE' ? '#fff' : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.txtTipoUbicacion,
                      tipoUbicacionMasivo === 'TERRENO_LIBRE' && styles.txtTipoUbicacionActivo,
                    ]}
                  >
                    TERRENO LIBRE / GPS
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {tipo === 'EVENTO_MASIVO' && tipoUbicacionMasivo === 'TERRENO_LIBRE' ? (
              <View style={styles.terrenoLibreBox}>
                <Text style={styles.labelSub}>SECTOR O NOMBRE DEL TERRENO (*):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Cantera El Rincón, Cerro Manquehue, Fundo San Jorge"
                  placeholderTextColor={colors.textMuted}
                  value={direccionTexto}
                  onChangeText={setDireccionTexto}
                />

                <Text style={[styles.labelSub, { marginTop: 10 }]}>
                  COORDENADAS GPS (LATITUD, LONGITUD PARA WAZE / GOOGLE MAPS):
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Latitud (ej: -33.4372)"
                    placeholderTextColor={colors.textMuted}
                    value={latitudInput}
                    onChangeText={setLatitudInput}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Longitud (ej: -70.6506)"
                    placeholderTextColor={colors.textMuted}
                    value={longitudInput}
                    onChangeText={setLongitudInput}
                    keyboardType="numeric"
                  />
                </View>

                {latitudInput && longitudInput ? (
                  <TouchableOpacity
                    style={styles.btnTestMapMini}
                    onPress={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${latitudInput},${longitudInput}`;
                      Linking.openURL(url).catch(() => mostrarError('No se pudo abrir Google Maps en tu dispositivo'));
                    }}
                  >
                    <MaterialCommunityIcons name="google-maps" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.txtBtnTestMapMini}>VERIFICAR COORDENADAS EN GOOGLE MAPS ↗</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <>
                <Text style={styles.labelSub}>
                  Solo puedes seleccionar campos registrados previamente en tu región:
                </Text>

                {/* Botón Selector de Región */}
                <TouchableOpacity
                  style={styles.selectorDropdown}
                  onPress={() => setModalRegionVisible(true)}
                >
                  <View style={styles.dropdownInfo}>
                    <Text style={styles.dropdownLabel}>REGIÓN DE CHILE:</Text>
                    <Text style={styles.dropdownValor}>{regionSeleccionada}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-down" size={22} color={colors.primary} />
                </TouchableOpacity>

                {/* Listado de Canchas de esa Región */}
                <Text style={[styles.labelSub, { marginTop: 14 }]}>
                  CAMPOS DISPONIBLES EN {regionSeleccionada.toUpperCase()}:
                </Text>

                {cargandoCanchas ? (
                  <View style={styles.cargandoBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.textoCargando}>Buscando campos en la región...</Text>
                  </View>
                ) : canchas.length === 0 ? (
                  <View style={styles.sinCanchasBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={32} color={colors.warning} style={{ marginBottom: 6 }} />
                    <Text style={styles.sinCanchasTitulo}>Sin campos registrados en esta región</Text>
                    <Text style={styles.sinCanchasDesc}>
                      Actualmente no existen canchas activas en {regionSeleccionada}. Selecciona otra
                      región o contacta a un administrador de campo.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.canchasLista}>
                    {canchas.map((c) => {
                      const seleccionada = canchaSeleccionada === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.canchaCard, seleccionada && styles.canchaCardActiva]}
                          onPress={() => setCanchaSeleccionada(c.id)}
                        >
                          <View style={styles.canchaInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MaterialCommunityIcons
                                name="map-marker"
                                size={18}
                                color={seleccionada ? colors.primary : colors.textMuted}
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                style={[
                                  styles.canchaNombre,
                                  seleccionada && styles.canchaNombreActivo,
                                ]}
                              >
                                {c.nombre}
                              </Text>
                            </View>
                            {c.ciudad && (
                              <Text style={styles.canchaCiudad}>Ciudad: {c.ciudad}</Text>
                            )}
                          </View>
                          <View
                            style={[
                              styles.radioCheck,
                              seleccionada && styles.radioCheckActivo,
                            ]}
                          >
                            {seleccionada && <View style={styles.radioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Configuración de Versus (si aplica) */}
          {tipo === 'VERSUS' && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>4. SELECCIÓN DE ESCUADRAS (VERSUS)</Text>
              {equipos.length < 2 ? (
                <View style={styles.avisoBox}>
                  <Text style={styles.avisoIcono}>ℹ️</Text>
                  <Text style={styles.avisoTexto}>
                    Se requieren al menos 2 equipos registrados en la base de datos para
                    programar un Versus oficial.
                  </Text>
                </View>
              ) : (
                <View style={styles.versusSelectors}>
                  <View style={styles.versusBlock}>
                    <Text style={styles.versusLabel}>BANDO ALFA (EQUIPO 1):</Text>
                    {equipos.map((e) => (
                      <TouchableOpacity
                        key={`A-${e.id}`}
                        style={[
                          styles.equipoOption,
                          equipoAId === e.id && styles.equipoOptionActivoA,
                        ]}
                        onPress={() => setEquipoAId(e.id)}
                      >
                        <Text
                          style={[
                            styles.equipoNombre,
                            equipoAId === e.id && styles.equipoNombreActivo,
                          ]}
                        >
                          {e.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.versusVsBadge}>
                    <Text style={styles.versusVsTexto}>VS</Text>
                  </View>

                  <View style={styles.versusBlock}>
                    <Text style={styles.versusLabel}>BANDO BRAVO (EQUIPO 2):</Text>
                    {equipos.map((e) => (
                      <TouchableOpacity
                        key={`B-${e.id}`}
                        style={[
                          styles.equipoOption,
                          equipoBId === e.id && styles.equipoOptionActivoB,
                        ]}
                        onPress={() => setEquipoBId(e.id)}
                      >
                        <Text
                          style={[
                            styles.equipoNombre,
                            equipoBId === e.id && styles.equipoNombreActivo,
                          ]}
                        >
                          {e.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Configuración de Facciones Temáticas para Evento Masivo */}
          {tipo === 'EVENTO_MASIVO' && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>4. FACCIONES TEMÁTICAS DEL MILSIM</Text>
              <Text style={styles.labelSub}>
                Personaliza los nombres y distintivos de combate para cada bando:
              </Text>

              <View style={styles.faccionRow}>
                <View style={[styles.faccionColorDot, { backgroundColor: bando1Color }]} />
                <View style={styles.faccionInputWrapper}>
                  <Text style={styles.faccionLabel}>FACCIÓN 1 (COLOR AZUL/VERDE):</Text>
                  <TextInput
                    style={styles.input}
                    value={bando1Nombre}
                    onChangeText={setBando1Nombre}
                    placeholder="Ej: Fuerzas Especiales OTAN"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                    <Text style={styles.labelSubCampo}>CUPO MÁXIMO OPERADORES:</Text>
                    <TextInput
                      style={styles.inputCupoFac}
                      value={bando1CupoMax}
                      onChangeText={setBando1CupoMax}
                      placeholder="25"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.faccionRow, { marginTop: 12 }]}>
                <View style={[styles.faccionColorDot, { backgroundColor: bando2Color }]} />
                <View style={styles.faccionInputWrapper}>
                  <Text style={styles.faccionLabel}>FACCIÓN 2 (COLOR ROJO/AMARILLO):</Text>
                  <TextInput
                    style={styles.input}
                    value={bando2Nombre}
                    onChangeText={setBando2Nombre}
                    placeholder="Ej: Milicia Insurgente del Este"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                    <Text style={styles.labelSubCampo}>CUPO MÁXIMO OPERADORES:</Text>
                    <TextInput
                      style={styles.inputCupoFac}
                      value={bando2CupoMax}
                      onChangeText={setBando2CupoMax}
                      placeholder="25"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Banner de Error Inline Táctico */}
          {errorValidacion && paso === 1 && (
            <View style={styles.bannerErrorInline}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.txtBannerErrorInline}>{errorValidacion}</Text>
            </View>
          )}

          {/* Botón Siguiente */}
          <TouchableOpacity style={styles.btnSiguiente} onPress={avanzarAlPaso2}>
            <Text style={styles.textoBtnSiguiente}>
              {tipo === 'EVENTO_MASIVO'
                ? 'PASO 2: BRIEFING & FACCIONES ➔'
                : 'PASO 2: HORARIOS & BRIEFING ➔'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ======================= PASO 2 ======================= */}
      {paso === 2 && (
        <View>
          {/* Horarios de Inicio y Término */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>1. CRONOGRAMA DE OPERACIÓN</Text>
            <Text style={styles.labelSub}>
              Define el inicio y fin del evento (pueden ser horas o varios días para Milsim):
            </Text>

            <View style={{ marginTop: 8 }}>
              <TacticalDateTimePicker
                label="FECHA Y HORA DE INICIO (*):"
                value={fechaInicio}
                minimumDate={new Date()}
                onChange={(d) => {
                  setFechaInicio(d);
                  if (d >= fechaFin) {
                    const nuevoFin = new Date(d);
                    nuevoFin.setHours(d.getHours() + 4);
                    setFechaFin(nuevoFin);
                  }
                }}
              />

              <TacticalDateTimePicker
                label="FECHA Y HORA DE TÉRMINO (*):"
                value={fechaFin}
                minimumDate={fechaInicio}
                onChange={setFechaFin}
              />
            </View>
          </View>

          {/* Briefing de la Misión / Descripción */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>2. BRIEFING & REGLAS DE COMBATE</Text>
            <Text style={styles.labelSub}>
              {tipo === 'EVENTO_MASIVO'
                ? 'Argumento de la misión, frecuencias de radio, límites FPS y guión temático:'
                : 'Detalles para los jugadores, cronograma de rondas o requisitos:'}
            </Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Escribe aquí el briefing de la misión, cronograma, reglas de impacto, etc..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>

          {/* Bando / Equipo Inicial del Organizador (solo relevante en VERSUS) */}
          {tipo === 'VERSUS' && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>3. TU EQUIPO</Text>
              <Text style={styles.labelSub}>
                Selecciona la escuadra a la que pertenecerás y liderarás en este combate:
              </Text>
              <View style={styles.bandoOrganizadorRow}>
                <TouchableOpacity
                  style={[
                    styles.bandoOrganizadorBtn,
                    bandoCreadorIndex === 0 && styles.bandoOrganizadorBtnActivo,
                  ]}
                  onPress={() => setBandoCreadorIndex(0)}
                >
                  <Text
                    style={[
                      styles.bandoOrganizadorTxt,
                      bandoCreadorIndex === 0 && styles.bandoOrganizadorTxtActivo,
                    ]}
                    numberOfLines={1}
                  >
                    {nombreEquipoA}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.bandoOrganizadorBtn,
                    bandoCreadorIndex === 1 && styles.bandoOrganizadorBtnActivo,
                  ]}
                  onPress={() => setBandoCreadorIndex(1)}
                >
                  <Text
                    style={[
                      styles.bandoOrganizadorTxt,
                      bandoCreadorIndex === 1 && styles.bandoOrganizadorTxtActivo,
                    ]}
                    numberOfLines={1}
                  >
                    {nombreEquipoB}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Privacidad / Visibilidad */}
          {tipo === 'VERSUS' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>3. VISIBILIDAD DE LA OPERACIÓN</Text>
              <View style={styles.versusPrivacidadCard}>
                <MaterialCommunityIcons
                  name="shield-lock-outline"
                  size={26}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.versusPrivacidadTitulo}>EXCLUSIVO PARA LAS ESCUADRAS RIVALES</Text>
                  <Text style={styles.versusPrivacidadDesc}>
                    Esta partida es privada: solo los miembros de <Text style={{ fontWeight: 'bold', color: colors.text }}>{nombreEquipoA}</Text> y <Text style={{ fontWeight: 'bold', color: colors.text }}>{nombreEquipoB}</Text> podrán verla en su radar. Los jugadores parche o refuerzos invitados podrán sumarse ingresando el código táctico de invitación.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>3. VISIBILIDAD DE LA OPERACIÓN</Text>
              <View style={styles.privacidadRow}>
                <TouchableOpacity
                  style={[
                    styles.privacidadBtn,
                    privacidad === 'ABIERTO' && styles.privacidadBtnActivo,
                  ]}
                  onPress={() => setPrivacidad('ABIERTO')}
                >
                  <MaterialCommunityIcons name="earth" size={16} color={privacidad === 'ABIERTO' ? colors.primary : colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.privacidadTexto,
                      privacidad === 'ABIERTO' && styles.privacidadTextoActivo,
                    ]}
                  >
                    ABIERTO (Público en radar)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.privacidadBtn,
                    privacidad === 'CERRADO' && styles.privacidadBtnActivo,
                  ]}
                  onPress={() => setPrivacidad('CERRADO')}
                >
                  <MaterialCommunityIcons name="lock" size={16} color={privacidad === 'CERRADO' ? colors.warning : colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.privacidadTexto,
                      privacidad === 'CERRADO' && styles.privacidadTextoActivo,
                    ]}
                  >
                    CERRADO (Solo con código)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Banner de Error Inline Táctico */}
          {errorValidacion && paso === 2 && (
            <View style={styles.bannerErrorInline}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.txtBannerErrorInline}>{errorValidacion}</Text>
            </View>
          )}

          {/* Botones de Navegación del Paso 2 */}
          <View style={styles.botonesAccionPaso2}>
            <TouchableOpacity
              style={styles.btnVolverPaso1}
              onPress={() => {
                setErrorValidacion(null);
                setPaso(1);
              }}
              disabled={guardando}
            >
              <MaterialCommunityIcons name="arrow-left" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.textoBtnVolver}>VOLVER A PASO 1</Text>
            </TouchableOpacity>

            {tipo === 'EVENTO_MASIVO' ? (
              <TouchableOpacity
                style={styles.btnAvanzarPaso2}
                onPress={avanzarAlPaso3}
              >
                <Text style={styles.textoBtnAvanzar}>PASO 3: TACSOP & RADIOS ➔</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnPublicar, guardando && styles.btnDeshabilitado]}
                onPress={handlePublicarOperacion}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="broadcast" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.textoBtnPublicar}>PUBLICAR OPERACIÓN</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* PASO 3: BRIEFING TÁCTICO & TACSOP DIGITAL (EVENTO_MASIVO) */}
      {/* ========================================================= */}
      {paso === 3 && tipo === 'EVENTO_MASIVO' && (
        <View style={styles.pasoContainer}>
          {/* Encabezado Táctico */}
          <View style={styles.tacsopHeaderBanner}>
            <MaterialCommunityIcons name="shield-sword" size={26} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.tacsopHeaderTitulo}>TACSOP & REGLAMENTO OPERATIVO</Text>
              <Text style={styles.tacsopHeaderSub}>
                Define las reglas de combate, crono de réplicas y plan de radios Baofeng UV-5R.
              </Text>
            </View>
          </View>

          {/* 1. Selector de Preset */}
          <Text style={styles.seccionTituloPaso3}>1. PRESET DE REGLAMENTO</Text>
          <View style={styles.presetCardsRow}>
            <TouchableOpacity
              style={[
                styles.presetCard,
                presetTacsop === 'COMBAT_MISSION' && styles.presetCardActivo,
              ]}
              onPress={() => aplicarPreset('COMBAT_MISSION')}
            >
              <MaterialCommunityIcons
                name="target"
                size={22}
                color={presetTacsop === 'COMBAT_MISSION' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.presetNombre,
                  presetTacsop === 'COMBAT_MISSION' && styles.presetNombreActivo,
                ]}
              >
                COMBAT MISSION
              </Text>
              <Text style={styles.presetDesc}>
                Dinámico y fluido. Cargadores libres, 1 torniquete, ráfagas cortas y crono estándar.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetCard,
                presetTacsop === 'MILSIM' && styles.presetCardActivo,
              ]}
              onPress={() => aplicarPreset('MILSIM')}
            >
              <MaterialCommunityIcons
                name="skull-scan"
                size={22}
                color={presetTacsop === 'MILSIM' ? '#E53E3E' : colors.textMuted}
              />
              <Text
                style={[
                  styles.presetNombre,
                  presetTacsop === 'MILSIM' && styles.presetNombreActivoMilsim,
                ]}
              >
                MILSIM ESTÁNDAR
              </Text>
              <Text style={styles.presetDesc}>
                Realismo puro. Mid-Caps obligatorios, límite de BBs, 2 torniquetes y solo médico revive.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetCard,
                presetTacsop === 'CUSTOM' && styles.presetCardActivo,
              ]}
              onPress={() => setPresetTacsop('CUSTOM')}
            >
              <MaterialCommunityIcons
                name="tune"
                size={22}
                color={presetTacsop === 'CUSTOM' ? colors.warning : colors.textMuted}
              />
              <Text
                style={[
                  styles.presetNombre,
                  presetTacsop === 'CUSTOM' && styles.presetNombreActivoCustom,
                ]}
              >
                PERSONALIZADO
              </Text>
              <Text style={styles.presetDesc}>
                Ajusta manualmente cada vida, MED, Joule y canal de radio a tu gusto.
              </Text>
            </TouchableOpacity>
          </View>

          {/* 2. Reglas Médicas y Bajas */}
          <Text style={styles.seccionTituloPaso3}>2. SISTEMA MÉDICO, VIDAS Y SEÑALIZACIÓN</Text>
          <View style={styles.tacsopCardBloque}>
            {/* Vidas Máximas */}
            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Vidas por Operador</Text>
                <Text style={styles.tacsopRowSub}>Impactos antes de volver a la Base/Respawn</Text>
              </View>
              <View style={styles.chipsRowSmall}>
                {[1, 2, 3, 5].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.chipNumMini,
                      vidasMax === v && styles.chipNumMiniActivo,
                    ]}
                    onPress={() => setVidasMax(v)}
                  >
                    <Text
                      style={[
                        styles.txtChipNumMini,
                        vidasMax === v && styles.txtChipNumMiniActivo,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Requiere Torniquete */}
            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Uso de Torniquete / Venda Táctica</Text>
                <Text style={styles.tacsopRowSub}>Se debe colocar físicamente en brazo/pierna</Text>
              </View>
              <Switch
                value={requiereTorniquete}
                onValueChange={setRequiereTorniquete}
                trackColor={{ false: '#333', true: colors.primary }}
              />
            </View>

            {requiereTorniquete && (
              <View style={styles.tacsopRowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tacsopRowTitulo}>Torniquetes por Operador</Text>
                  <Text style={styles.tacsopRowSub}>Cantidad de vendas/torniquetes en chaleco</Text>
                </View>
                <View style={styles.chipsRowSmall}>
                  {[1, 2, 3].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.chipNumMini,
                        torniquetesPorJugador === t && styles.chipNumMiniActivo,
                      ]}
                      onPress={() => setTorniquetesPorJugador(t)}
                    >
                      <Text
                        style={[
                          styles.txtChipNumMini,
                          torniquetesPorJugador === t && styles.txtChipNumMiniActivo,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Tiempo de Desangrado (Bleed-out) */}
            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Tiempo de Desangrado (Bleed-out)</Text>
                <Text style={styles.tacsopRowSub}>Minutos que debe pedir médico antes de morir</Text>
              </View>
              <View style={styles.chipsRowSmall}>
                {[2, 3, 5, 10].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.chipNumMini,
                      tiempoDesangradoMin === m && styles.chipNumMiniActivo,
                    ]}
                    onPress={() => setTiempoDesangradoMin(m)}
                  >
                    <Text
                      style={[
                        styles.txtChipNumMini,
                        tiempoDesangradoMin === m && styles.txtChipNumMiniActivo,
                      ]}
                    >
                      {m}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quién puede Revivir */}
            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Quién puede Curar / Revivir</Text>
                <Text style={styles.tacsopRowSub}>
                  {soloMedicoRevive ? 'Solo operador con Rol de Médico' : 'Cualquier compañero (Buddy Aid)'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.btnToggleRevive,
                  soloMedicoRevive ? styles.btnToggleReviveMedico : styles.btnToggleReviveBuddy,
                ]}
                onPress={() => setSoloMedicoRevive(!soloMedicoRevive)}
              >
                <Text style={styles.txtBtnToggleRevive}>
                  {soloMedicoRevive ? 'SOLO MÉDICO' : 'CUALQUIERA'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Pañuelo Rojo Obligatorio */}
            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Pañuelo Rojo / Naranja de Muerto</Text>
                <Text style={styles.tacsopRowSub}>Obligatorio portarlo y exhibirlo al ser dado de baja</Text>
              </View>
              <Switch
                value={requierePanueloRojo}
                onValueChange={setRequierePanueloRojo}
                trackColor={{ false: '#333', true: '#E53E3E' }}
              />
            </View>

            {/* Luz Roja Nocturna */}
            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Luz Roja de Muerto (Nocturna)</Text>
                <Text style={styles.tacsopRowSub}>Para bajas en baja luz o misiones nocturnas</Text>
              </View>
              <View style={styles.chipsRowSmall}>
                {(['OBLIGATORIA', 'RECOMENDADA', 'NO_REQUERIDA'] as const).map((luz) => (
                  <TouchableOpacity
                    key={luz}
                    style={[
                      styles.chipTextMini,
                      luzRojaNocturna === luz && styles.chipTextMiniActivo,
                    ]}
                    onPress={() => setLuzRojaNocturna(luz)}
                  >
                    <Text
                      style={[
                        styles.txtChipTextMini,
                        luzRojaNocturna === luz && styles.txtChipTextMiniActivo,
                      ]}
                    >
                      {luz === 'OBLIGATORIA' ? 'OBLIG.' : luz === 'RECOMENDADA' ? 'RECOM.' : 'NO'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* 3. Cargadores, Munición y Pirotecnia */}
          <Text style={styles.seccionTituloPaso3}>3. CARGADORES, MUNICIÓN Y PIROTECNIA</Text>
          <View style={styles.tacsopCardBloque}>
            {/* Tipo de Cargadores */}
            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Tipo de Cargadores Permitidos</Text>
                <Text style={styles.tacsopRowSub}>Mid-Cap (sin ruleta), Real-Cap (30 BBs) o Libre</Text>
              </View>
              <View style={styles.chipsRowSmall}>
                {(['LIBRE', 'MID_CAP', 'REAL_CAP'] as const).map((carg) => (
                  <TouchableOpacity
                    key={carg}
                    style={[
                      styles.chipTextMini,
                      tipoCargadores === carg && styles.chipTextMiniActivo,
                    ]}
                    onPress={() => setTipoCargadores(carg)}
                  >
                    <Text
                      style={[
                        styles.txtChipTextMini,
                        tipoCargadores === carg && styles.txtChipTextMiniActivo,
                      ]}
                    >
                      {carg === 'LIBRE' ? 'LIBRE' : carg === 'MID_CAP' ? 'MID-CAP' : 'REAL-CAP'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Límite de BBs */}
            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Límite de Munición (BBs)</Text>
                <Text style={styles.tacsopRowSub}>BBs máximas por operador al desplegar (Opcional)</Text>
              </View>
              <TextInput
                style={styles.inputMiniTacsop}
                placeholder="Sin límite"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={limiteMunicionBbs}
                onChangeText={setLimiteMunicionBbs}
              />
            </View>

            {/* Humo Frío y Pirotecnia */}
            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Granadas de Humo Frío (Enola Gaye)</Text>
                <Text style={styles.tacsopRowSub}>Solo pirotecnia fría apta para exteriores</Text>
              </View>
              <Switch
                value={humoFrioPermitido}
                onValueChange={setHumoFrioPermitido}
                trackColor={{ false: '#333', true: colors.primary }}
              />
            </View>

            <View style={styles.tacsopRowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tacsopRowTitulo}>Pirotecnia Sonora / Flashbang</Text>
                <Text style={styles.tacsopRowSub}>Granadas de fogueo, sónicas o petardos</Text>
              </View>
              <Switch
                value={pirotecniaPermitida}
                onValueChange={setPirotecniaPermitida}
                trackColor={{ false: '#333', true: colors.danger }}
              />
            </View>
          </View>

          {/* 4. Tabla de Cronometraje y Límites de Réplicas */}
          <Text style={styles.seccionTituloPaso3}>4. LÍMITES DE CRONO (FPS, JOULES & MED)</Text>
          <View style={styles.tacsopCardBloque}>
            <View style={styles.cronoHeaderRow}>
              <Text style={[styles.txtCronoCol, { flex: 1.3 }]}>ROL / CAT</Text>
              <Text style={[styles.txtCronoCol, { flex: 1.1, textAlign: 'center' }]}>FPS (0.20g)</Text>
              <Text style={[styles.txtCronoCol, { flex: 1.0, textAlign: 'center' }]}>JOULES</Text>
              <Text style={[styles.txtCronoCol, { flex: 0.9, textAlign: 'center' }]}>MED (m)</Text>
              <Text style={[styles.txtCronoCol, { flex: 1.3, textAlign: 'right' }]}>DISPARO</Text>
            </View>

            {limitesCrono.map((lim, index) => (
              <View key={lim.categoria} style={styles.cronoItemRow}>
                <View style={{ flex: 1.3 }}>
                  <Text style={styles.txtCronoCatNombre}>{lim.categoria}</Text>
                </View>

                {/* Input Editable de FPS (@ 0.20g) con autoconversión a Joules */}
                <View style={{ flex: 1.1, alignItems: 'center' }}>
                  <TextInput
                    style={styles.inputCronoVal}
                    keyboardType="numeric"
                    value={lim.maxFps ? lim.maxFps.toString() : ''}
                    placeholder="FPS"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(txt) => {
                      const fpsNum = parseInt(txt, 10) || 0;
                      const joulesCalc = fpsToJoules(fpsNum);
                      const nuevos = [...limitesCrono];
                      nuevos[index] = {
                        ...nuevos[index],
                        maxFps: fpsNum,
                        maxJoules: joulesCalc,
                      };
                      setLimitesCrono(nuevos);
                    }}
                  />
                </View>

                {/* Input Editable de Joules con autoconversión a FPS */}
                <View style={{ flex: 1.0, alignItems: 'center' }}>
                  <TextInput
                    style={styles.inputCronoVal}
                    keyboardType="decimal-pad"
                    value={lim.maxJoules ? lim.maxJoules.toString() : ''}
                    placeholder="J"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(txt) => {
                      const jNum = parseFloat(txt) || 0;
                      const fpsCalc = joulesToFps(jNum);
                      const nuevos = [...limitesCrono];
                      nuevos[index] = {
                        ...nuevos[index],
                        maxJoules: jNum,
                        maxFps: fpsCalc,
                      };
                      setLimitesCrono(nuevos);
                    }}
                  />
                </View>

                {/* Input Editable de Distancia Mínima de Empeño (MED) */}
                <View style={{ flex: 0.9, alignItems: 'center' }}>
                  <TextInput
                    style={styles.inputCronoVal}
                    keyboardType="numeric"
                    value={lim.medMetros.toString()}
                    onChangeText={(txt) => {
                      const nuevos = [...limitesCrono];
                      nuevos[index] = { ...nuevos[index], medMetros: parseInt(txt, 10) || 0 };
                      setLimitesCrono(nuevos);
                    }}
                  />
                </View>

                {/* Selector de Disparo: Interactivo para ASALTO (SEMI -> SEMI/AUTO -> RAFAGA), fijo para los demás */}
                <View style={{ flex: 1.3, alignItems: 'flex-end' }}>
                  {lim.categoria === 'ASALTO' ? (
                    <TouchableOpacity
                      style={styles.btnSelectorDisparoAsalto}
                      onPress={() => {
                        const modos = ['SEMI', 'SEMI_AUTO', 'RAFAGA'];
                        const idx = modos.indexOf(lim.tipoDisparo);
                        const siguiente = modos[(idx + 1) % modos.length];
                        const nuevos = [...limitesCrono];
                        nuevos[index] = { ...nuevos[index], tipoDisparo: siguiente };
                        setLimitesCrono(nuevos);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.txtBtnSelectorDisparoAsalto}>
                        {lim.tipoDisparo === 'SEMI'
                          ? 'SEMI'
                          : lim.tipoDisparo === 'SEMI_AUTO'
                          ? 'SEMI/AUTO'
                          : 'RÁFAGA'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.badgeModoDisparo}>
                      {lim.tipoDisparo === 'AUTO_RAFAGA' ? 'RÁFAGA' : lim.tipoDisparo}
                    </Text>
                  )}
                </View>
              </View>
            ))}

            <Text style={styles.txtAvisoConvertidorCrono}>
              Convertidor activo: los FPS se calculan con balín de 0.20g. Al cambiar FPS se recalculan los Joules y viceversa.
            </Text>
          </View>

          {/* 5. Plan de COMMS (Radios Baofeng UV-5R) */}
          <Text style={styles.seccionTituloPaso3}>5. PLAN DE RADIOS BAOFENG UV-5R</Text>
          <View style={styles.tacsopCardBloque}>
            <View style={styles.radioHeaderInfo}>
              <MaterialCommunityIcons name="radio-handheld" size={20} color={colors.primary} />
              <Text style={styles.txtRadioHeaderInfo}>
                Frecuencias exactas en MHz y subtonos CTCSS para programar en teclado UV-5R.
              </Text>
            </View>

            <View style={styles.inputRowRadio}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelRadioField}>EMERGENCIA / BLIND MAN:</Text>
                <TextInput
                  style={styles.inputRadioFrec}
                  placeholder="Ej: 462.5625 MHz"
                  placeholderTextColor={colors.textMuted}
                  value={frecuenciaEmergencia}
                  onChangeText={setFrecuenciaEmergencia}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1.3 }}>
                <Text style={styles.labelRadioField}>CANAL STAFF / ORG:</Text>
                <TextInput
                  style={styles.inputRadioFrec}
                  placeholder="462.5875 MHz"
                  placeholderTextColor={colors.textMuted}
                  value={frecuenciaStaff}
                  onChangeText={setFrecuenciaStaff}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelRadioField}>SUBTONO (CTCSS):</Text>
                <TextInput
                  style={styles.inputRadioFrec}
                  placeholder="67.0 Hz"
                  placeholderTextColor={colors.textMuted}
                  value={subtonoStaff}
                  onChangeText={setSubtonoStaff}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelRadioField}>FREC. {bando1Nombre || 'FACCIÓN 1'}:</Text>
                <TextInput
                  style={styles.inputRadioFrec}
                  placeholder="462.6125 MHz"
                  placeholderTextColor={colors.textMuted}
                  value={frecuenciaBando1}
                  onChangeText={setFrecuenciaBando1}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelRadioField}>FREC. {bando2Nombre || 'FACCIÓN 2'}:</Text>
                <TextInput
                  style={styles.inputRadioFrec}
                  placeholder="462.6375 MHz"
                  placeholderTextColor={colors.textMuted}
                  value={frecuenciaBando2}
                  onChangeText={setFrecuenciaBando2}
                />
              </View>
            </View>
          </View>

          {/* 6. Mapa Táctico Satelital */}
          <Text style={styles.seccionTituloPaso3}>6. MAPA TÁCTICO DEL TERRENO (OPCIONAL)</Text>
          <View style={styles.tacsopCardBloque}>
            <Text style={styles.labelRadioField}>URL DE IMAGEN O PLANO SATELITAL:</Text>
            <TextInput
              style={styles.inputRadioFrec}
              placeholder="https://.../mapa_tactico.png"
              placeholderTextColor={colors.textMuted}
              value={mapaTacticoUrl}
              onChangeText={setMapaTacticoUrl}
            />
            <Text style={styles.tacsopRowSub}>
              Puedes pegar un enlace directo a la imagen aérea o plano de cuadrantes de la zona.
            </Text>
          </View>

          {/* Banner de Error Inline Táctico */}
          {errorValidacion && paso === 3 && (
            <View style={styles.bannerErrorInline}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.txtBannerErrorInline}>{errorValidacion}</Text>
            </View>
          )}

          {/* Botones de Navegación del Paso 3 */}
          <View style={styles.botonesAccionPaso2}>
            <TouchableOpacity
              style={styles.btnVolverPaso1}
              onPress={() => {
                setErrorValidacion(null);
                setPaso(2);
              }}
              disabled={guardando}
            >
              <MaterialCommunityIcons name="arrow-left" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.textoBtnVolver}>VOLVER A PASO 2</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPublicar, guardando && styles.btnDeshabilitado]}
              onPress={handlePublicarOperacion}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="broadcast" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.textoBtnPublicar}>PUBLICAR OPERACIÓN MASIVA</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
        </Pressable>

      {/* Modal para selección de Región */}
      <Modal
        visible={modalRegionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalRegionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>SELECCIONA TU REGIÓN</Text>
            <Text style={styles.modalSubtitulo}>
              Solo se listarán las canchas registradas en esta región:
            </Text>

            <ScrollView style={styles.modalListaRegiones}>
              {REGIONES_CHILE.map((reg) => {
                const seleccionada = reg === regionSeleccionada;
                return (
                  <TouchableOpacity
                    key={reg}
                    style={[
                      styles.modalRegionItem,
                      seleccionada && styles.modalRegionItemActivo,
                    ]}
                    onPress={() => {
                      setRegionSeleccionada(reg);
                      setModalRegionVisible(false);
                    }}
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

            <TouchableOpacity
              style={styles.modalBtnCerrar}
              onPress={() => setModalRegionVisible(false)}
            >
              <Text style={styles.modalTxtCerrar}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Táctico de Éxito al Publicar Operación */}
      <ModalConfirmacionTactico
        visible={eventoPublicado !== null}
        titulo="OPERACIÓN PUBLICADA"
        mensaje={`El evento "${eventoPublicado?.titulo || ''}" ha sido transmitido con éxito al radar táctico.\n\nCódigo de acceso oficial: ${eventoPublicado?.codigoInvitacion || ''}`}
        textoConfirmar="VER DETALLES"
        tipo="exito"
        icono="radar"
        soloAceptar
        onConfirmar={() => {
          const id = eventoPublicado?.id;
          setEventoPublicado(null);
          if (id) {
            navigation.replace('EventoDetalle', { eventoId: id });
          }
        }}
      />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 45,
    paddingBottom: 40,
  },
  pasosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pasoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.45,
  },
  pasoItemActivo: {
    opacity: 1,
  },
  pasoNumero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '900',
    fontSize: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pasoNumeroActivo: {
    backgroundColor: colors.primary,
    color: '#fff',
    borderColor: colors.primary,
  },
  pasoTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pasoTextoActivo: {
    color: colors.text,
  },
  pasoSeparador: {
    width: 30,
    height: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  cardTitulo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  labelSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  tiposGrid: {
    gap: 10,
  },
  tipoCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  tipoCardActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.1)',
  },
  tipoCardStandBy: {
    opacity: 0.4,
    position: 'relative',
  },
  standByBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  standByTexto: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
  },
  tipoIcono: {
    fontSize: 20,
    marginBottom: 4,
  },
  tipoTitulo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  tipoTituloActivo: {
    color: colors.primary,
  },
  tipoTituloStandBy: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  tipoDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  selectorDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownInfo: {
    flex: 1,
  },
  dropdownLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownValor: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  dropdownFlecha: {
    color: colors.primary,
    fontSize: 14,
  },
  cargandoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  textoCargando: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  sinCanchasBox: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  sinCanchasIcono: {
    fontSize: 26,
    marginBottom: 6,
  },
  sinCanchasTitulo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  sinCanchasDesc: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  canchasLista: {
    gap: 8,
  },
  canchaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  canchaCardActiva: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.08)',
  },
  canchaInfo: {
    flex: 1,
  },
  canchaNombre: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  canchaNombreActivo: {
    color: colors.primary,
  },
  canchaCiudad: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  radioCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCheckActivo: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  avisoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 158, 46, 0.15)',
    borderWidth: 1,
    borderColor: '#D69E2E',
    borderRadius: 8,
    padding: 12,
  },
  avisoIcono: {
    fontSize: 18,
    marginRight: 10,
  },
  avisoTexto: {
    color: '#D69E2E',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  versusSelectors: {
    gap: 12,
  },
  versusBlock: {
    gap: 6,
  },
  versusLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  versusVsBadge: {
    alignSelf: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginVertical: 4,
  },
  versusVsTexto: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  equipoOption: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  equipoOptionActivoA: {
    borderColor: '#2E7D32',
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
  },
  equipoOptionActivoB: {
    borderColor: '#C62828',
    backgroundColor: 'rgba(198, 40, 40, 0.15)',
  },
  equipoNombre: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  equipoNombreActivo: {
    color: colors.text,
    fontWeight: '800',
  },
  faccionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faccionColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
  },
  faccionInputWrapper: {
    flex: 1,
  },
  faccionLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  btnSiguiente: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  textoBtnSiguiente: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fechasContainer: {
    gap: 12,
  },
  fechaInputBox: {
    gap: 4,
  },
  fechaInputLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolChip: {
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
  rolChipActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
  },
  rolIcono: {
    fontSize: 14,
  },
  rolTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  rolTextoActivo: {
    color: colors.primary,
    fontWeight: '800',
  },
  rolCheck: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  rolResumenBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  rolResumenTexto: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  rolResumenBold: {
    color: colors.primary,
    fontWeight: '800',
  },
  bandoOrganizadorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bandoOrganizadorBtn: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  bandoOrganizadorBtnActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
  },
  bandoOrganizadorTxt: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  bandoOrganizadorTxtActivo: {
    color: colors.primary,
    fontWeight: '800',
  },
  privacidadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  privacidadBtn: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  privacidadBtnActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
  },
  privacidadIcono: {
    fontSize: 18,
    marginBottom: 4,
  },
  privacidadTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  privacidadTextoActivo: {
    color: colors.text,
    fontWeight: '800',
  },
  botonesAccionPaso2: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  pasoContainer: {
    paddingBottom: 20,
  },
  btnAvanzarPaso2: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoBtnAvanzar: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnVolverPaso1: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoBtnVolver: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  btnPublicar: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDeshabilitado: {
    opacity: 0.6,
  },
  textoBtnPublicar: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
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
    maxHeight: '75%',
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
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
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
  modalBtnCerrar: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTxtCerrar: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  versusPrivacidadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 109, 40, 0.12)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  versusPrivacidadTitulo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  versusPrivacidadDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  tipoUbicacionSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  btnTipoUbicacion: {
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
  btnTipoUbicacionActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.15)',
  },
  txtTipoUbicacion: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  txtTipoUbicacionActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  terrenoLibreBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  btnTestMapMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 8,
    marginTop: 8,
    gap: 6,
  },
  txtBtnTestMapMini: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  tacsopHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 161, 105, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 14,
    marginBottom: 16,
  },
  tacsopHeaderTitulo: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tacsopHeaderSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  seccionTituloPaso3: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  presetCardsRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 10,
  },
  presetCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  presetCardActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.08)',
  },
  presetNombre: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  presetNombreActivo: {
    color: colors.primary,
  },
  presetNombreActivoMilsim: {
    color: '#E53E3E',
  },
  presetNombreActivoCustom: {
    color: colors.warning,
  },
  presetDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  tacsopCardBloque: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  tacsopRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tacsopRowTitulo: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  tacsopRowSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  chipsRowSmall: {
    flexDirection: 'row',
    gap: 6,
  },
  chipNumMini: {
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipNumMiniActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
  },
  txtChipNumMini: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  txtChipNumMiniActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  chipTextMini: {
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipTextMiniActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
  },
  txtChipTextMini: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  txtChipTextMiniActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  btnToggleRevive: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnToggleReviveMedico: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  btnToggleReviveBuddy: {
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  txtBtnToggleRevive: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  inputMiniTacsop: {
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 90,
    textAlign: 'center',
  },
  cronoHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: 6,
  },
  txtCronoCol: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  cronoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  txtCronoCatNombre: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  txtCronoCatSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  inputCronoVal: {
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    paddingVertical: 4,
    paddingHorizontal: 6,
    textAlign: 'center',
    width: 50,
  },
  badgeModoDisparo: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  radioHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 9,
    gap: 8,
    marginBottom: 10,
  },
  txtRadioHeaderInfo: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
  },
  inputRowRadio: {
    marginBottom: 8,
  },
  labelRadioField: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  inputRadioFrec: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  labelSubCampo: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '800',
  },
  inputCupoFac: {
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: 60,
    textAlign: 'center',
  },
  btnSelectorDisparoAsalto: {
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  txtBtnSelectorDisparoAsalto: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  txtAvisoConvertidorCrono: {
    color: colors.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 14,
  },
  bannerErrorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  txtBannerErrorInline: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
});
