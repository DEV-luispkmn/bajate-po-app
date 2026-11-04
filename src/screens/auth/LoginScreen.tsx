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
    if (!identificador.trim() || !password.trim()) {
      Alert.alert('Atención', 'Por favor ingresa tu alias o correo y tu contraseña.');
      return;
    }

    try {
      setCargando(true);
      await login(identificador.trim(), password);
    } catch (error: any) {
      Alert.alert('Fallo en el ingreso', error.message || 'Credenciales inválidas.');
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
            <Text style={styles.badge}>AIRSOFT CHILE</Text>
            <Text style={styles.title}>BÁJATE PO! 🇨🇱</Text>
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

            <TouchableOpacity
              style={[styles.botonPrincipal, cargando && styles.botonDeshabilitado]}
              onPress={handleLogin}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
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
});
