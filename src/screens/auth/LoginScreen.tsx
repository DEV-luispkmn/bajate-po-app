import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import type { NavigationProp } from '../../navigation/types';
import { useNavigation } from '@react-navigation/native';

export const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login } = useAuth();
  const scrollViewRef = useRef<any>(null);

  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [tecladoAbierto, setTecladoAbierto] = useState(false);
  const [cooldownSegundos, setCooldownSegundos] = useState(0);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const timerErrorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Muestra el mensaje de error bajo el campo de contraseña por 10 segundos y luego lo esconde
  const mostrarError = (mensaje: string) => {
    if (timerErrorRef.current) {
      clearTimeout(timerErrorRef.current);
    }
    setMensajeError(mensaje);
    timerErrorRef.current = setTimeout(() => {
      setMensajeError(null);
      timerErrorRef.current = null;
    }, 10000); // 10 segundos
  };

  useEffect(() => {
    return () => {
      if (timerErrorRef.current) {
        clearTimeout(timerErrorRef.current);
      }
    };
  }, []);

  // Contador de enfriamiento (cooldown) por exceso de intentos de login
  useEffect(() => {
    if (cooldownSegundos <= 0) return;
    const timer = setInterval(() => {
      setCooldownSegundos((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSegundos]);

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

  const handleLogin = async () => {
    if (cooldownSegundos > 0) {
      mostrarError(
        `Acceso bloqueado por seguridad. Espera ${cooldownSegundos} segundo${cooldownSegundos === 1 ? '' : 's'} antes de volver a intentar.`,
      );
      return;
    }

    if (!identificador.trim()) {
      mostrarError('Debes ingresar tu correo o alias.');
      return;
    }

    try {
      setCargando(true);
      await login(identificador.trim(), password);
    } catch (error: any) {
      if (error?.segundosRestantes || error?.status === 429) {
        const seg = Number(error?.segundosRestantes) || 60;
        setCooldownSegundos(seg);
        mostrarError(
          error.message ||
            `Has superado el límite de 3 intentos continuos fallidos. Acceso bloqueado por ${seg} segundos.`,
        );
      } else {
        mostrarError(error.message || 'Credenciales inválidas.');
      }
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
          <View style={styles.header}>
            <Text style={styles.badge}>AIRSOFT CHILE • SISTEMA TÁCTICO</Text>
            <Text style={styles.title}>BÁJATE PO!</Text>
            <Text style={styles.subtitle}>Inicia sesión como operador táctico</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>CORREO O ALIAS / CALLSIGN</Text>
            <TextInput
              style={styles.input}
              placeholder="ej: GhostSniper o ghost@airsoft.cl"
              placeholderTextColor={colors.textMuted}
              value={identificador}
              onChangeText={setIdentificador}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>CONTRASEÑA</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
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

            {mensajeError && (
              <View style={styles.contenedorError}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={18}
                  color="#EF4444"
                  style={styles.iconoError}
                />
                <Text style={styles.textoError}>{mensajeError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.botonPrincipal,
                (cargando || cooldownSegundos > 0) && styles.botonDeshabilitado,
                cooldownSegundos > 0 && styles.botonBloqueado,
              ]}
              onPress={handleLogin}
              disabled={cargando || cooldownSegundos > 0}
              activeOpacity={0.8}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : cooldownSegundos > 0 ? (
                <View style={styles.filaBotonBloqueado}>
                  <MaterialCommunityIcons
                    name="shield-lock-outline"
                    size={18}
                    color="#D1D5DB"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.textoBoton, styles.textoBotonTabular]}>
                    BLOQUEADO ({cooldownSegundos}s)
                  </Text>
                </View>
              ) : (
                <Text style={styles.textoBoton}>ENTRAR AL CAMPO</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkRegistro}
              onPress={() => navigation.navigate('Registro')}
            >
              <Text style={styles.textoSecundario}>
                ¿No tienes cuenta de operador?{' '}
                <Text style={styles.textoDestacado}>Regístrate acá</Text>
              </Text>
            </TouchableOpacity>
          </View>
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
  },
  scrollContainerConTeclado: {
    justifyContent: 'flex-start',
    paddingTop: 30,
    paddingBottom: 220,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  passwordInput: {
    flex: 1,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  btnTogglePassword: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconoPassword: {
    fontSize: 18,
  },
  botonPrincipal: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBoton: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  filaBotonBloqueado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonTabular: {
    fontVariant: ['tabular-nums'],
    color: '#D1D5DB',
  },
  linkRegistro: {
    marginTop: 20,
    alignItems: 'center',
  },
  textoSecundario: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  textoDestacado: {
    color: colors.primary,
    fontWeight: '700',
  },
  botonBloqueado: {
    backgroundColor: '#374151',
  },
  contenedorError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  iconoError: {
    marginRight: 8,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  textoError: {
    flex: 1,
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
});
