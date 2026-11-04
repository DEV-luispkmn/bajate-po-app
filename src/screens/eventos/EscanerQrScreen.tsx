import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { unirseEventoApi, buscarEventoPorCodigoApi } from '../../api/eventos.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import type { NavigationProp } from '../../navigation/types';
import { useNavigation } from '@react-navigation/native';

export const EscanerQrScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Modal para ingreso manual de código táctico (6 dígitos/letras)
  const [modalCodigoVisible, setModalCodigoVisible] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [procesandoCodigo, setProcesandoCodigo] = useState(false);

  if (!permission) {
    return (
      <View style={styles.containerCentro}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.containerCentro}>
        <Text style={styles.iconoPermiso}>📷</Text>
        <Text style={styles.tituloPermiso}>Permiso de Cámara Requerido</Text>
        <Text style={styles.subtituloPermiso}>
          Para unirte al combate en la cancha o escanear el QR del bando, necesitamos acceso a la cámara.
        </Text>
        <TouchableOpacity style={styles.botonPermiso} onPress={requestPermission}>
          <Text style={styles.textoBotonPermiso}>CONCEDER ACCESO</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botonManualAlt}
          onPress={() => setModalCodigoVisible(true)}
        >
          <Text style={styles.textoBotonManualAlt}>INGRESAR CÓDIGO MANUALMENTE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botonVolver} onPress={() => navigation.goBack()}>
          <Text style={styles.textoBotonVolver}>VOLVER</Text>
        </TouchableOpacity>

        {renderModalManual()}
      </View>
    );
  }

  const procesarDatoOInvitacion = async (data: string) => {
    const datoLimpio = data.trim();
    if (!datoLimpio) return;

    try {
      // 1. Si es un QR específico de bando en terreno (ej: bando_a1b2c3d4...)
      if (datoLimpio.startsWith('bando_')) {
        const resultado = await unirseEventoApi({
          qrToken: datoLimpio,
          rol: 'ASALTO',
        });

        Alert.alert(
          '🎯 ¡ALISTAMIENTO CONFIRMADO EN TERRENO!',
          `Te has incorporado exitosamente a la operación #${resultado.eventoId} con rol ${resultado.rol}.`,
          [
            {
              text: 'VER SALA TÁCTICA',
              onPress: () => {
                navigation.replace('EventoDetalle', { eventoId: resultado.eventoId });
              },
            },
          ],
        );
        return;
      }

      // 2. Si es una URL táctica o código mnemotécnico directo (ej: MAS123 o https://bajatepo.cl/operaciones/MAS123)
      let codigoExtraido = datoLimpio;
      if (datoLimpio.includes('/')) {
        const partes = datoLimpio.split('/');
        codigoExtraido = partes[partes.length - 1] || datoLimpio;
      }
      codigoExtraido = codigoExtraido.toUpperCase().trim();

      const res = await buscarEventoPorCodigoApi(codigoExtraido);
      Alert.alert(
        '🎯 OPERACIÓN LOCALIZADA',
        `"${res.evento.titulo}" en ${res.evento.canchaNombre || 'campo de juego'}.\n¿Deseas desplegarte a esta partida?`,
        [
          {
            text: 'CANCELAR',
            style: 'cancel',
            onPress: () => setEscaneado(false),
          },
          {
            text: 'ENTRAR AL COMBATE',
            onPress: () => {
              navigation.replace('EventoDetalle', { eventoId: res.evento.id });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Código o QR no válido',
        error.message || 'No se encontró ninguna partida activa con este código o QR táctico.',
        [
          {
            text: 'REINTENTAR',
            onPress: () => setEscaneado(false),
          },
          {
            text: 'CANCELAR',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
        ],
      );
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (escaneado || procesando) return;
    setEscaneado(true);
    setProcesando(true);
    try {
      await procesarDatoOInvitacion(data);
    } finally {
      setProcesando(false);
    }
  };

  const handleBuscarPorCodigoManual = async () => {
    if (!codigoManual.trim()) {
      Alert.alert('Atención', 'Por favor ingresa los 6 caracteres del código.');
      return;
    }
    setProcesandoCodigo(true);
    try {
      const res = await buscarEventoPorCodigoApi(codigoManual.trim().toUpperCase());
      setModalCodigoVisible(false);
      setCodigoManual('');
      navigation.replace('EventoDetalle', { eventoId: res.evento.id });
    } catch (error: any) {
      Alert.alert(
        'Código no encontrado',
        error.message || 'No existe ninguna operación con este código de invitación táctico.',
      );
    } finally {
      setProcesandoCodigo(false);
    }
  };

  function renderModalManual() {
    return (
      <Modal
        visible={modalCodigoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCodigoVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="form-textbox-password" size={24} color={colors.primary} />
              <Text style={styles.modalTitulo}>INGRESAR CÓDIGO TÁCTICO</Text>
            </View>

            <Text style={styles.modalDescripcion}>
              Ingresa el código alfanumérico de 6 caracteres generado para esta partida (ej: MAS123 o FUEB12).
            </Text>

            <TextInput
              style={styles.inputCodigo}
              placeholder="EJ: MAS123"
              placeholderTextColor={colors.textMuted}
              value={codigoManual}
              onChangeText={(t) => setCodigoManual(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleBuscarPorCodigoManual}
            />

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => {
                  setModalCodigoVisible(false);
                  setCodigoManual('');
                }}
              >
                <Text style={styles.txtCancelarModal}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btnConfirmarModal,
                  (!codigoManual.trim() || procesandoCodigo) && styles.btnDeshabilitado,
                ]}
                onPress={handleBuscarPorCodigoManual}
                disabled={!codigoManual.trim() || procesandoCodigo}
              >
                {procesandoCodigo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.txtConfirmarModal}>LOCALIZAR</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={escaneado ? undefined : handleBarcodeScanned}
      />

      {/* Máscara táctica con visor central */}
      <View style={styles.overlay}>
        <View style={styles.headerVisor}>
          <Text style={styles.tagMilitar}>RADAR TÁCTICO</Text>
          <Text style={styles.instruccion}>Apunta la mira al código QR de la partida o bando</Text>
        </View>

        <View style={styles.cajaMira}>
          <View style={[styles.esquina, styles.esquinaTL]} />
          <View style={[styles.esquina, styles.esquinaTR]} />
          <View style={[styles.esquina, styles.esquinaBL]} />
          <View style={[styles.esquina, styles.esquinaBR]} />

          {procesando && (
            <View style={styles.cargandoEnMira}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.textoProcesando}>Verificando frecuencia táctica...</Text>
            </View>
          )}
        </View>

        <View style={styles.footerVisor}>
          <TouchableOpacity
            style={styles.botonIngresoManual}
            onPress={() => setModalCodigoVisible(true)}
          >
            <MaterialCommunityIcons name="keyboard-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.textoBotonIngresoManual}>INGRESAR CÓDIGO (6 DÍGITOS)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonCancelar}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.textoBotonCancelar}>CANCELAR ESCANEO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderModalManual()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  containerCentro: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconoPermiso: {
    fontSize: 54,
    marginBottom: 16,
  },
  tituloPermiso: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtituloPermiso: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  botonPermiso: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 12,
  },
  textoBotonPermiso: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  botonManualAlt: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  textoBotonManualAlt: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  botonVolver: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  textoBotonVolver: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerVisor: {
    alignItems: 'center',
  },
  tagMilitar: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  instruccion: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cajaMira: {
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  esquina: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.primary,
  },
  esquinaTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  esquinaTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  esquinaBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  esquinaBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  cargandoEnMira: {
    alignItems: 'center',
  },
  textoProcesando: {
    color: colors.primary,
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
  },
  footerVisor: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  botonIngresoManual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    width: '100%',
  },
  textoBotonIngresoManual: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  botonCancelar: {
    backgroundColor: 'rgba(28, 35, 31, 0.9)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  textoBotonCancelar: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalDescripcion: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputCodigo: {
    backgroundColor: colors.inputBg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 14,
    marginBottom: 20,
  },
  modalAcciones: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancelarModal: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtCancelarModal: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  btnConfirmarModal: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDeshabilitado: {
    opacity: 0.5,
  },
  txtConfirmarModal: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

