import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface TacticalDateTimePickerProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

export const TacticalDateTimePicker: React.FC<TacticalDateTimePickerProps> = ({
  label,
  value,
  onChange,
  minimumDate,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState<Date>(value);

  const abrirSelector = () => {
    Keyboard.dismiss();
    if (Platform.OS === 'ios' && showPicker) {
      setShowPicker(false);
      return;
    }
    setTempDate(value);
    setMode('date');
    setShowPicker(true);
  };

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        setShowPicker(false);
        return;
      }

      if (selectedDate) {
        if (mode === 'date') {
          // Guardar fecha seleccionada y abrir selector de hora
          const nuevaFecha = new Date(selectedDate);
          nuevaFecha.setHours(tempDate.getHours(), tempDate.getMinutes(), 0, 0);
          setTempDate(nuevaFecha);
          setMode('time');
          setShowPicker(true);
        } else {
          // Hora seleccionada: combinar y guardar
          const fechaFinal = new Date(tempDate);
          fechaFinal.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
          setShowPicker(false);
          onChange(fechaFinal);
        }
      } else {
        setShowPicker(false);
      }
      return;
    }

    // iOS: mantener el spinner abierto hasta que el usuario confirme o cancele
    if (selectedDate) {
      if (mode === 'date') {
        const nuevaFecha = new Date(selectedDate);
        nuevaFecha.setHours(tempDate.getHours(), tempDate.getMinutes(), 0, 0);
        setTempDate(nuevaFecha);
      } else {
        const nuevaFecha = new Date(tempDate);
        nuevaFecha.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
        setTempDate(nuevaFecha);
      }
    }
  };

  const handleCancelarIos = () => {
    setShowPicker(false);
  };

  const handleConfirmarIos = () => {
    const fechaFinal =
      minimumDate && tempDate < minimumDate ? new Date(minimumDate) : tempDate;
    setShowPicker(false);
    onChange(fechaFinal);
  };

  const formatearFechaHora = (d: Date) => {
    const dia = d.toLocaleDateString('es-CL', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const hora = d.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${dia.toUpperCase()} • ${hora} HRS`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.pickerBoton}
        activeOpacity={0.8}
        onPress={abrirSelector}
      >
        <MaterialCommunityIcons
          name="calendar-clock"
          size={20}
          color={colors.primary}
          style={{ marginRight: 10 }}
        />
        <Text style={styles.valorTexto}>{formatearFechaHora(value)}</Text>
        <MaterialCommunityIcons
          name={showPicker && Platform.OS === 'ios' ? 'chevron-up' : 'pencil'}
          size={16}
          color={colors.textMuted}
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode={mode}
          is24Hour={true}
          display="default"
          minimumDate={minimumDate}
          onChange={handlePickerChange}
        />
      )}

      {showPicker && Platform.OS === 'ios' && (
        <View style={styles.iosPickerCard}>
          {/* Selector de Modo: Fecha vs Hora */}
          <View style={styles.iosTabsRow}>
            <TouchableOpacity
              style={[styles.iosTabBtn, mode === 'date' && styles.iosTabBtnActivo]}
              onPress={() => setMode('date')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={15}
                color={mode === 'date' ? '#fff' : colors.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.iosTabTxt, mode === 'date' && styles.iosTabTxtActivo]}>
                FECHA
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iosTabBtn, mode === 'time' && styles.iosTabBtnActivo]}
              onPress={() => setMode('time')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={15}
                color={mode === 'time' ? '#fff' : colors.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.iosTabTxt, mode === 'time' && styles.iosTabTxtActivo]}>
                HORA
              </Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={tempDate}
            mode={mode}
            is24Hour={true}
            display="spinner"
            themeVariant="dark"
            textColor="#FFFFFF"
            accentColor={colors.primary}
            locale="es-CL"
            minimumDate={minimumDate}
            onChange={handlePickerChange}
            style={styles.iosSpinner}
          />

          <View style={styles.iosAccionesRow}>
            <TouchableOpacity
              style={styles.iosBtnCancelar}
              onPress={handleCancelarIos}
              activeOpacity={0.8}
            >
              <Text style={styles.iosTxtCancelar}>CANCELAR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iosBtnConfirmar}
              onPress={handleConfirmarIos}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="check"
                size={15}
                color="#fff"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.iosTxtConfirmar}>CONFIRMAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  pickerBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  valorTexto: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iosPickerCard: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    marginTop: 8,
    padding: 10,
  },
  iosTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  iosTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 8,
  },
  iosTabBtnActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iosTabTxt: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iosTabTxtActivo: {
    color: '#fff',
  },
  iosSpinner: {
    height: 180,
    width: '100%',
  },
  iosAccionesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  iosBtnCancelar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 10,
  },
  iosTxtCancelar: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iosBtnConfirmar: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
  },
  iosTxtConfirmar: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
