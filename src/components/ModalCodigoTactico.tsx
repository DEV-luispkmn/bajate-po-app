import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { buscarEventoPorCodigoApi } from '../api/eventos.service';

export interface ModalCodigoTacticoProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (eventoId: number) => void;
  tituloConfirmar?: string;
}

export const ModalCodigoTactico: React.FC<ModalCodigoTacticoProps> = ({
  visible,
  onClose,
  onSuccess,
  tituloConfirmar = 'LOCALIZAR',
}) => {
  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset de estados cuando el modal se abre o cierra
  useEffect(() => {
    if (visible) {
      setCodigo('');
      setError(null);
      setBuscando(false);
    }
  }, [visible]);

  const handleCerrar = () => {
    if (buscando) return;
    setCodigo('');
    setError(null);
    onClose();
  };

  const handleConfirmar = async () => {
    const codLimpio = codigo.trim().toUpperCase();
    if (!codLimpio) {
      setError('Por favor ingresa los 6 caracteres del código.');
      return;
    }

    setError(null);
    setBuscando(true);
    try {
      const res = await buscarEventoPorCodigoApi(codLimpio);
      setCodigo('');
      setError(null);
      onSuccess(res.evento.id);
    } catch (err: any) {
      setError(
        err.message || 'No existe ninguna operación con este código de invitación táctico.',
      );
    } finally {
      setBuscando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCerrar}
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
            value={codigo}
            onChangeText={(t) => {
              if (error) setError(null);
              setCodigo(t.toUpperCase().replace(/[^A-Z0-9]/g, ''));
            }}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleConfirmar}
            editable={!buscando}
          />

          {error ? (
            <View style={styles.bannerErrorModal}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.txtErrorModal}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.modalAcciones}>
            <TouchableOpacity
              style={styles.btnCancelarModal}
              onPress={handleCerrar}
              disabled={buscando}
            >
              <Text style={styles.txtCancelarModal}>CANCELAR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnConfirmarModal,
                (!codigo.trim() || buscando) && styles.btnDeshabilitado,
              ]}
              onPress={handleConfirmar}
              disabled={!codigo.trim() || buscando}
            >
              {buscando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.txtConfirmarModal}>{tituloConfirmar}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    color: '#fff',
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
    fontVariant: ['tabular-nums'],
    paddingVertical: 14,
    marginBottom: 16,
  },
  bannerErrorModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  txtErrorModal: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
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
