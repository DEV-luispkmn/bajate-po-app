import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
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
    setTempDate(value);
    setMode('date');
    setShowPicker(true);
  };

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }

    if (selectedDate) {
      if (Platform.OS === 'android') {
        if (mode === 'date') {
          // Guardar fecha seleccionada y abrir selector de hora
          const nuevaFecha = new Date(selectedDate);
          nuevaFecha.setHours(tempDate.getHours(), tempDate.getMinutes(), 0, 0);
          setTempDate(nuevaFecha);
          setMode('time');
          // En Android se vuelve a abrir con el modo time
          setShowPicker(true);
        } else {
          // Hora seleccionada: combinar y guardar
          const fechaFinal = new Date(tempDate);
          fechaFinal.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
          setShowPicker(false);
          onChange(fechaFinal);
        }
      } else {
        // iOS
        setShowPicker(false);
        onChange(selectedDate);
      }
    } else {
      setShowPicker(false);
    }
  };

  const formatearFechaHora = (d: Date) => {
    const dia = d.toLocaleDateString([], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const hora = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
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
          name="pencil"
          size={16}
          color={colors.textMuted}
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={tempDate}
          mode={mode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          onChange={handlePickerChange}
        />
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
});
