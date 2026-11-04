import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { REGIONES_CHILE } from '../eventos/CrearEventoScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import type { NavigationProp } from '../../navigation/types';
import { useNavigation } from '@react-navigation/native';

const ROLES_DISPONIBLES = [
  { id: 'ASALTO', label: 'Asalto', icon: 'lightning-bolt' as const },
  { id: 'CQB', label: 'CQB', icon: 'door-open' as const },
  { id: 'SNIPER', label: 'Sniper', icon: 'crosshairs' as const },
  { id: 'DMR', label: 'DMR', icon: 'telescope' as const },
  { id: 'APOYO', label: 'Apoyo', icon: 'shield-plus' as const },
  { id: 'MÉDICO', label: 'Médico', icon: 'medical-bag' as const },
];

export const RegistroScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { registro } = useAuth();
  const scrollViewRef = useRef<any>(null);

  // Control de Pasos (1: Credenciales | 2: Ficha Táctica)
  const [paso, setPaso] = useState<1 | 2>(1);

  // Paso 1: Credenciales
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [tecladoAbierto, setTecladoAbierto] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTecladoAbierto(true);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setTecladoAbierto(false);
      },
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Paso 2: Ficha del Operador
  const [region, setRegion] = useState('Región Metropolitana');
  const [ciudad, setCiudad] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>(['ASALTO']);

  const [modalRegionVisible, setModalRegionVisible] = useState(false);
  const [modalUrlVisible, setModalUrlVisible] = useState(false);
  const [urlTemporal, setUrlTemporal] = useState('');
  const [cargando, setCargando] = useState(false);

  // Selección de Foto desde la Galería del Celular
  const handleElegirFotoGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Necesitamos acceso a tu galería para cargar tu foto táctica.',
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
        let base64Uri = asset.uri;
        if (asset.base64) {
          base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        }
        setAvatarUrl(base64Uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo seleccionar la imagen');
    }
  };

  const toggleRol = (rolId: string) => {
    if (rolesSeleccionados.includes(rolId)) {
      if (rolesSeleccionados.length === 1) {
        Alert.alert('Atención', 'Debes conservar al menos 1 rol táctico.');
        return;
      }
      setRolesSeleccionados(rolesSeleccionados.filter((r) => r !== rolId));
    } else {
      setRolesSeleccionados([...rolesSeleccionados, rolId]);
    }
  };

  // Avanzar a Paso 2
  const avanzarAlPaso2 = () => {
    if (!alias.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Atención', 'Por favor completa todos los campos del paso 1.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    const regex = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
    if (!regex.test(password)) {
      Alert.alert(
        'Contraseña inválida',
        'La contraseña debe incluir mayúsculas, minúsculas y un número o símbolo.',
      );
      return;
    }

    setPaso(2);
  };

  // Registro Final
  const handleFinalizarRegistro = async () => {
    try {
      setCargando(true);
      await registro({
        alias: alias.trim(),
        email: email.trim(),
        password,
        region,
        ciudad: ciudad.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        roles: rolesSeleccionados.join(','),
      });
    } catch (error: any) {
      Alert.alert('Error de Registro', error.message || 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  const enfocarPassword = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContainer,
            tecladoAbierto && styles.scrollContainerConTeclado,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.badge}>NUEVO RECLUTA</Text>
          <Text style={styles.title}>REGISTRO DE OPERADOR</Text>
          <Text style={styles.subtitle}>
            {paso === 1
              ? 'Paso 1: Credenciales de acceso e identidad'
              : 'Paso 2: Configuración de ficha, región y roles'}
          </Text>
        </View>

        {/* Indicador de Pasos */}
        <View style={styles.pasosHeader}>
          <View style={[styles.pasoItem, paso === 1 && styles.pasoItemActivo]}>
            <Text style={[styles.pasoNumero, paso === 1 && styles.pasoNumeroActivo]}>1</Text>
            <Text style={[styles.pasoTexto, paso === 1 && styles.pasoTextoActivo]}>
              CREDENCIALES
            </Text>
          </View>

          <View style={styles.pasoSeparador} />

          <View style={[styles.pasoItem, paso === 2 && styles.pasoItemActivo]}>
            <Text style={[styles.pasoNumero, paso === 2 && styles.pasoNumeroActivo]}>2</Text>
            <Text style={[styles.pasoTexto, paso === 2 && styles.pasoTextoActivo]}>
              FICHA TÁCTICA
            </Text>
          </View>
        </View>

        {/* ======================= PASO 1 ======================= */}
        {paso === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.label}>ALIAS / CALLSIGN DE COMBATE</Text>
            <TextInput
              style={styles.input}
              placeholder="ej: DeltaBravo99"
              placeholderTextColor={colors.textMuted}
              value={alias}
              onChangeText={setAlias}
              autoCapitalize="none"
            />

            <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
            <TextInput
              style={styles.input}
              placeholder="operador@airsoft.cl"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>CONTRASEÑA (MÍN. 8 CARACTERES)</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mayúsculas, minúsculas y números"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!mostrarPassword}
                onFocus={enfocarPassword}
              />
              <TouchableOpacity
                style={styles.btnTogglePassword}
                onPress={() => setMostrarPassword((prev) => !prev)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={mostrarPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.botonPrincipal} onPress={avanzarAlPaso2}>
              <Text style={styles.textoBoton}>CONTINUAR A FICHA TÁCTICA (PASO 2) ➔</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonVolver}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.textoVolver}>¿Ya tienes cuenta? Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ======================= PASO 2 ======================= */}
        {paso === 2 && (
          <View style={styles.formCard}>
            {/* Foto de Perfil */}
            <Text style={styles.label}>FOTO DE OPERADOR (AVATAR)</Text>
            <View style={styles.avatarSeccion}>
              <Image
                source={
                  avatarUrl
                    ? { uri: avatarUrl }
                    : {
                        uri: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400',
                      }
                }
                style={styles.avatarPreview}
              />

              <View style={styles.avatarOpciones}>
                <TouchableOpacity
                  style={styles.btnElegirFoto}
                  onPress={handleElegirFotoGaleria}
                >
                  <MaterialCommunityIcons name="camera" size={16} color="#fff" />
                  <Text style={styles.txtElegirFoto}>DESDE MI TELÉFONO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnPegarUrl}
                  onPress={() => {
                    setUrlTemporal(avatarUrl);
                    setModalUrlVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="link-variant" size={16} color={colors.textSecondary} />
                  <Text style={styles.txtPegarUrl}>INGRESAR URL</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Región de Chile */}
            <Text style={[styles.label, { marginTop: 14 }]}>REGIÓN PRINCIPAL DE COMBATE</Text>
            <TouchableOpacity
              style={styles.dropdownSelector}
              onPress={() => setModalRegionVisible(true)}
            >
              <Text style={styles.dropdownTexto}>{region}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Ciudad / Comuna */}
            <Text style={styles.label}>CIUDAD / COMUNA</Text>
            <TextInput
              style={styles.input}
              placeholder="ej: Santiago / Lampa / Viña del Mar"
              placeholderTextColor={colors.textMuted}
              value={ciudad}
              onChangeText={setCiudad}
            />

            {/* Roles Disponibles */}
            <Text style={[styles.label, { marginTop: 8 }]}>
              ROLES Y ESPECIALIDADES QUE DOMINAS:
            </Text>
            <Text style={styles.sublabel}>
              Puedes seleccionar más de un rol táctico para tu perfil:
            </Text>

            <View style={styles.rolesGrid}>
              {ROLES_DISPONIBLES.map((rol) => {
                const activo = rolesSeleccionados.includes(rol.id);
                return (
                  <TouchableOpacity
                    key={rol.id}
                    style={[styles.rolChip, activo && styles.rolChipActivo]}
                    onPress={() => toggleRol(rol.id)}
                  >
                    <MaterialCommunityIcons
                      name={rol.icon}
                      size={18}
                      color={activo ? '#fff' : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.rolLabel, activo && styles.rolLabelActivo]}>
                      {rol.label}
                    </Text>
                    {activo && <Text style={styles.rolCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botones de Acción */}
            <View style={styles.botonesAccionRow}>
              <TouchableOpacity
                style={styles.btnVolverPaso1}
                onPress={() => setPaso(1)}
                disabled={cargando}
              >
                <Text style={styles.txtVolverPaso1}>⬅ PASO 1</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonPrincipal, { flex: 2 }, cargando && styles.botonDeshabilitado]}
                onPress={handleFinalizarRegistro}
                disabled={cargando}
              >
                {cargando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.textoBoton}>COMPLETAR REGISTRO 🎯</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Modal de Selector de Región */}
        <Modal
          visible={modalRegionVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalRegionVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContenido}>
              <Text style={styles.modalTitulo}>SELECCIONA TU REGIÓN</Text>
              <ScrollView style={styles.modalListaRegiones}>
                {REGIONES_CHILE.map((reg) => (
                  <TouchableOpacity
                    key={reg}
                    style={[
                      styles.modalRegionItem,
                      reg === region && styles.modalRegionItemActivo,
                    ]}
                    onPress={() => {
                      setRegion(reg);
                      setModalRegionVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalRegionTexto,
                        reg === region && styles.modalRegionTextoActivo,
                      ]}
                    >
                      {reg}
                    </Text>
                    {reg === region && <Text style={styles.modalRegionCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
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

        {/* Modal para ingresar URL de Avatar */}
        <Modal
          visible={modalUrlVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalUrlVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContenido, { maxHeight: 260 }]}>
              <Text style={styles.modalTitulo}>URL DE IMAGEN</Text>
              <Text style={styles.sublabel}>Pega el enlace web de tu foto de perfil:</Text>
              <TextInput
                style={[styles.input, { marginVertical: 12 }]}
                value={urlTemporal}
                onChangeText={setUrlTemporal}
                placeholder="https://ejemplo.com/mifoto.jpg"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <View style={styles.botonesAccionRow}>
                <TouchableOpacity
                  style={[styles.btnVolverPaso1, { flex: 1 }]}
                  onPress={() => setModalUrlVisible(false)}
                >
                  <Text style={styles.txtVolverPaso1}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botonPrincipal, { flex: 1, marginTop: 0 }]}
                  onPress={() => {
                    setAvatarUrl(urlTemporal.trim());
                    setModalUrlVisible(false);
                  }}
                >
                  <Text style={styles.textoBoton}>GUARDAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  scrollContainerConTeclado: {
    justifyContent: 'flex-start',
    paddingTop: 30,
    paddingBottom: 220,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  badge: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  pasosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.inputBg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '900',
    fontSize: 11,
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
    fontSize: 10,
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
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sublabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  btnTogglePassword: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconoPassword: {
    fontSize: 18,
  },
  avatarSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 14,
  },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarOpciones: {
    flex: 1,
    gap: 8,
  },
  btnElegirFoto: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  txtElegirFoto: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnPegarUrl: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtPegarUrl: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  dropdownTexto: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownFlecha: {
    color: colors.primary,
    fontSize: 12,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
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
    gap: 5,
  },
  rolChipActivo: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(224, 109, 40, 0.18)',
  },
  rolIcon: {
    fontSize: 13,
  },
  rolLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  rolLabelActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  rolCheck: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  botonesAccionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  btnVolverPaso1: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txtVolverPaso1: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  botonPrincipal: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  botonVolver: {
    marginTop: 16,
    alignItems: 'center',
  },
  textoVolver: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
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
    backgroundColor: 'rgba(224, 109, 40, 0.15)',
    borderRadius: 8,
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
    fontSize: 15,
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
    fontSize: 12,
    fontWeight: '800',
  },
});
