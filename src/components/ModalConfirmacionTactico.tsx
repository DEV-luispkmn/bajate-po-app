import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export type TipoConfirmacionTactico = 'peligro' | 'advertencia' | 'primario' | 'exito';

export interface ModalConfirmacionTacticoProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  tipo?: TipoConfirmacionTactico;
  icono?: keyof typeof MaterialCommunityIcons.glyphMap;
  soloAceptar?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar?: () => void;
}

export const ModalConfirmacionTactico: React.FC<ModalConfirmacionTacticoProps> = ({
  visible,
  titulo,
  mensaje,
  textoConfirmar = 'CONFIRMAR',
  textoCancelar = 'CANCELAR',
  tipo = 'primario',
  icono,
  soloAceptar = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}) => {
  const obtenerConfigTipo = () => {
    switch (tipo) {
      case 'peligro':
        return {
          color: colors.danger,
          iconoDefecto: 'alert-octagon-outline' as const,
          btnBg: colors.danger,
          badgeBg: 'rgba(239, 68, 68, 0.15)',
        };
      case 'advertencia':
        return {
          color: colors.warning,
          iconoDefecto: 'alert-outline' as const,
          btnBg: colors.warning,
          badgeBg: 'rgba(245, 158, 11, 0.15)',
        };
      case 'exito':
        return {
          color: colors.success,
          iconoDefecto: 'check-decagram-outline' as const,
          btnBg: colors.success,
          badgeBg: 'rgba(16, 185, 129, 0.15)',
        };
      case 'primario':
      default:
        return {
          color: colors.primary,
          iconoDefecto: 'crosshairs' as const,
          btnBg: colors.primary,
          badgeBg: 'rgba(224, 109, 40, 0.15)',
        };
    }
  };

  const config = obtenerConfigTipo();
  const nombreIcono = icono || config.iconoDefecto;

  const handleCerrar = () => {
    if (cargando) return;
    if (onCancelar) {
      onCancelar();
    } else {
      onConfirmar();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCerrar}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header con Icono Táctico Destacado */}
          <View style={styles.header}>
            <View style={[styles.iconoBox, { backgroundColor: config.badgeBg, borderColor: config.color }]}>
              <MaterialCommunityIcons name={nombreIcono} size={28} color={config.color} />
            </View>
            <View style={styles.headerTexto}>
              <Text style={styles.tagMilitar}>COMUNICADO DE COMANDO</Text>
              <Text style={styles.titulo}>{titulo}</Text>
            </View>
          </View>

          {/* Cuerpo del Mensaje */}
          <Text style={styles.mensaje}>{mensaje}</Text>

          {/* Acciones */}
          <View style={styles.acciones}>
            {!soloAceptar && onCancelar && (
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={onCancelar}
                disabled={cargando}
                activeOpacity={0.8}
              >
                <Text style={styles.txtCancelar}>{textoCancelar}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.btnConfirmar,
                { backgroundColor: config.btnBg },
                soloAceptar && styles.btnSoloAceptar,
                cargando && styles.btnDeshabilitado,
              ]}
              onPress={onConfirmar}
              disabled={cargando}
              activeOpacity={0.85}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.txtConfirmar}>{textoConfirmar}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 22,
    width: '100%',
    maxWidth: 380,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconoBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTexto: {
    flex: 1,
  },
  tagMilitar: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  titulo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mensaje: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 22,
  },
  acciones: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancelar: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    minHeight: 46,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  txtCancelar: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  btnConfirmar: {
    flex: 1,
    borderRadius: 8,
    minHeight: 46,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSoloAceptar: {
    flex: 1,
    width: '100%',
  },
  btnDeshabilitado: {
    opacity: 0.6,
  },
  txtConfirmar: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
