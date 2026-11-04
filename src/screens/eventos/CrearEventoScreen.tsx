import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
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

  // Control de Pasos (1: Tipo, Cancha y Región | 2: Fechas, Briefing y Roles)
  const [paso, setPaso] = useState<1 | 2>(1);

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

  // Equipos registrados para VERSUS
  const [equipos, setEquipos] = useState<EquipoResumen[]>([]);
  const [equipoAId, setEquipoAId] = useState<number | null>(null);
  const [equipoBId, setEquipoBId] = useState<number | null>(null);

  // Facciones temáticas para EVENTO MASIVO (Milsim / Combat Mission)
  const [bando1Nombre, setBando1Nombre] = useState('Fuerzas Coalición (OTAN)');
  const [bando1Color, setBando1Color] = useState('#1976D2');
  const [bando2Nombre, setBando2Nombre] = useState('Insurgencia / Milicia');
  const [bando2Color, setBando2Color] = useState('#D32F2F');

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
            setEquipoAId(data[0].id);
            setEquipoBId(data[1].id);
          } else if (data.length === 1) {
            setEquipoAId(data[0].id);
          }
        } catch {
          // Silencioso
        }
      }
      cargarEquipos();
    }
  }, [tipo]);

  // Manejo de roles del creador
  const toggleRol = (rolId: string) => {
    if (tipo === 'EVENTO_MASIVO') {
      // En Masivos solo se permite 1 rol (especialización táctica militar)
      setRolesSeleccionados([rolId]);
    } else {
      // En Pichanga o Versus se pueden elegir múltiples (ej: Asalto + CQB)
      if (rolesSeleccionados.includes(rolId)) {
        if (rolesSeleccionados.length === 1) {
          Alert.alert('Atención', 'Debes mantener al menos 1 rol asignado');
          return;
        }
        setRolesSeleccionados(rolesSeleccionados.filter((r) => r !== rolId));
      } else {
        setRolesSeleccionados([...rolesSeleccionados, rolId]);
      }
    }
  };

  // Validación y cambio al Paso 2
  const avanzarAlPaso2 = () => {
    if (!titulo.trim()) {
      Alert.alert('Atención', 'Por favor ingresa un nombre para la operación.');
      return;
    }
    if (!canchaSeleccionada) {
      Alert.alert(
        'Cancha requerida',
        `No hay una cancha seleccionada. Debes elegir una cancha registrada en ${regionSeleccionada}.`,
      );
      return;
    }
    if (tipo === 'VERSUS') {
      if (!equipoAId || !equipoBId) {
        Alert.alert('Atención', 'Debes seleccionar el Equipo A y el Equipo B para el Versus.');
        return;
      }
      if (equipoAId === equipoBId) {
        Alert.alert('Atención', 'El Equipo A y el Equipo B no pueden ser el mismo.');
        return;
      }
    }
    if (tipo === 'EVENTO_MASIVO') {
      if (!bando1Nombre.trim() || !bando2Nombre.trim()) {
        Alert.alert('Atención', 'Debes indicar el nombre de ambas facciones temáticas.');
        return;
      }
    }
    setPaso(2);
  };

  // Creación final del evento
  const handlePublicarOperacion = async () => {
    if (!canchaSeleccionada) return;

    try {
      setGuardando(true);

      const rolOrganizadorStr = rolesSeleccionados.join(',');

      let bandosPayload: { nombre: string; colorHex?: string }[] | undefined = undefined;
      if (tipo === 'EVENTO_MASIVO') {
        bandosPayload = [
          { nombre: bando1Nombre.trim(), colorHex: bando1Color },
          { nombre: bando2Nombre.trim(), colorHex: bando2Color },
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
        bandoOrganizador = undefined; // No se auto-asigna a un bando de inmediato en pichangas/masivos
      }

      const nuevoEvento = await crearEventoApi({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        tipo,
        privacidad,
        canchaId: canchaSeleccionada,
        region: regionSeleccionada,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        equipoAId: tipo === 'VERSUS' ? equipoAId || undefined : undefined,
        equipoBId: tipo === 'VERSUS' ? equipoBId || undefined : undefined,
        rolOrganizador: rolOrganizadorStr,
        bandoOrganizadorIndex: bandoOrganizador,
        bandos: bandosPayload,
      });

      Alert.alert(
        '🎯 ¡OPERACIÓN PUBLICADA!',
        `El evento "${nuevoEvento.titulo}" ha sido transmitido al radar.\nCódigo táctico: ${nuevoEvento.codigoInvitacion}`,
        [
          {
            text: 'VER DETALLES',
            onPress: () => {
              navigation.replace('EventoDetalle', { eventoId: nuevoEvento.id });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error al publicar', error.message || 'No se pudo crear el evento.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Indicador de Pasos Superior */}
      <View style={styles.pasosHeader}>
        <View style={[styles.pasoItem, paso === 1 && styles.pasoItemActivo]}>
          <Text style={[styles.pasoNumero, paso === 1 && styles.pasoNumeroActivo]}>1</Text>
          <Text style={[styles.pasoTexto, paso === 1 && styles.pasoTextoActivo]}>
            TIPO & CANCHA
          </Text>
        </View>

        <View style={styles.pasoSeparador} />

        <View style={[styles.pasoItem, paso === 2 && styles.pasoItemActivo]}>
          <Text style={[styles.pasoNumero, paso === 2 && styles.pasoNumeroActivo]}>2</Text>
          <Text style={[styles.pasoTexto, paso === 2 && styles.pasoTextoActivo]}>
            FECHAS & ROLES
          </Text>
        </View>
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

          {/* Selector de Región y Canchas Creadas */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>3. REGIÓN & CANCHA DE JUEGO</Text>
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
                <Text style={styles.sinCanchasIcono}>⚠️</Text>
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
                          🛡️ {e.nombre}
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
                          ⚔️ {e.nombre}
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
                </View>
              </View>
            </View>
          )}

          {/* Botón Siguiente */}
          <TouchableOpacity style={styles.btnSiguiente} onPress={avanzarAlPaso2}>
            <Text style={styles.textoBtnSiguiente}>
              PASO 2: HORARIOS, BRIEFING & ROLES ➔
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
            />
          </View>

          {/* Selección de Rol del Organizador */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>3. TU ROL COMO ORGANIZADOR</Text>
            <Text style={styles.labelSub}>
              {tipo === 'EVENTO_MASIVO'
                ? 'En eventos masivos selecciona 1 rol táctico específico:'
                : 'En Pichanga / Versus puedes seleccionar múltiples roles (ej: Asalto + CQB):'}
            </Text>

            <View style={styles.rolesGrid}>
              {ROLES_DISPONIBLES.map((rol) => {
                const seleccionado = rolesSeleccionados.includes(rol.id);
                return (
                  <TouchableOpacity
                    key={rol.id}
                    style={[styles.rolChip, seleccionado && styles.rolChipActivo]}
                    onPress={() => toggleRol(rol.id)}
                  >
                    <MaterialCommunityIcons
                      name={rol.icon}
                      size={18}
                      color={seleccionado ? '#fff' : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.rolTexto,
                        seleccionado && styles.rolTextoActivo,
                      ]}
                    >
                      {rol.label}
                    </Text>
                    {seleccionado && <Text style={styles.rolCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.rolResumenBox}>
              <Text style={styles.rolResumenTexto}>
                Rol configurado: <Text style={styles.rolResumenBold}>{rolesSeleccionados.join(' + ')}</Text>
              </Text>
            </View>
          </View>

          {/* Bando Inicial del Organizador (solo relevante en VERSUS) */}
          {tipo === 'VERSUS' && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>4. TU BANDO INICIAL</Text>
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
                  >
                    🛡️ Bando 1 (Equipo A)
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
                  >
                    ⚔️ Bando 2 (Equipo B)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Privacidad */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>
              {tipo === 'VERSUS' ? '5. VISIBILIDAD DE LA OPERACIÓN' : '4. VISIBILIDAD DE LA OPERACIÓN'}
            </Text>
            <View style={styles.privacidadRow}>
              <TouchableOpacity
                style={[
                  styles.privacidadBtn,
                  privacidad === 'ABIERTO' && styles.privacidadBtnActivo,
                ]}
                onPress={() => setPrivacidad('ABIERTO')}
              >
                <Text style={styles.privacidadIcono}>🌐</Text>
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
                <Text style={styles.privacidadIcono}>🔒</Text>
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

          {/* Botones de Navegación del Paso 2 */}
          <View style={styles.botonesAccionPaso2}>
            <TouchableOpacity
              style={styles.btnVolverPaso1}
              onPress={() => setPaso(1)}
              disabled={guardando}
            >
              <Text style={styles.textoBtnVolver}>⬅ VOLVER A PASO 1</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPublicar, guardando && styles.btnDeshabilitado]}
              onPress={handlePublicarOperacion}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.textoBtnPublicar}>PUBLICAR OPERACIÓN 🎯</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

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
                    {seleccionada && <Text style={styles.modalRegionCheck}>✓</Text>}
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
});
