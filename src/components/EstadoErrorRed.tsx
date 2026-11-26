import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface EstadoErrorRedProps {
  mensaje: string;
  onReintentar: () => void;
  compacto?: boolean;
}

export const EstadoErrorRed = ({
  mensaje,
  onReintentar,
  compacto = false,
}: EstadoErrorRedProps) => {
  if (compacto) {
    return (
      <View style={styles.bannerCompacto} accessibilityRole="alert">
        <MaterialCommunityIcons
          name="wifi-off"
          size={18}
          color={colors.danger}
          style={{ marginRight: 8 }}
        />
        <Text style={styles.txtCompacto} numberOfLines={2}>
          {mensaje}
        </Text>
        <TouchableOpacity
          style={styles.btnReintentarCompacto}
          onPress={onReintentar}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Reintentar carga"
        >
          <Text style={styles.txtBtnCompacto}>REINTENTAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.contenedor} accessibilityRole="alert">
      <MaterialCommunityIcons
        name="wifi-off"
        size={48}
        color={colors.danger}
        style={{ marginBottom: 12 }}
      />
      <Text style={styles.titulo}>SIN CONEXIÓN AL RADAR</Text>
      <Text style={styles.mensaje}>{mensaje}</Text>
      <TouchableOpacity
        style={styles.btnReintentar}
        onPress={onReintentar}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Reintentar carga"
      >
        <MaterialCommunityIcons
          name="refresh"
          size={18}
          color={colors.onPrimary}
          style={{ marginRight: 6 }}
        />
        <Text style={styles.txtBtnReintentar}>REINTENTAR</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  titulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  mensaje: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  btnReintentar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  txtBtnReintentar: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  bannerCompacto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  txtCompacto: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginRight: 8,
  },
  btnReintentarCompacto: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  txtBtnCompacto: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '900',
  },
});
