import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { unirseEventoApi, buscarEventoPorCodigoApi } from '../../api/eventos.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { ModalCodigoTactico } from '../../components/ModalCodigoTactico';
import {
  ModalConfirmacionTactico,
  TipoConfirmacionTactico,
} from '../../components/ModalConfirmacionTactico';
import type { NavigationProp } from '../../navigation/types';
import { useNavigation } from '@react-navigation/native';

interface InfoDialogoQr {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: TipoConfirmacionTactico;
  icono?: keyof typeof MaterialCommunityIcons.glyphMap;
  textoConfirmar: string;
  textoCancelar?: string;
  soloAceptar?: boolean;
  onConfirmar: () => void;
  onCancelar?: () => void;
}

export const EscanerQrScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Modal para ingreso manual de código táctico (6 dígitos/letras)
  const [modalCodigoVisible, setModalCodigoVisible] = useState(false);
  // Modal táctico para resolución de QR escaneado o error
  const [dialogoQr, setDialogoQr] = useState<InfoDialogoQr | null>(null);

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
        <MaterialCommunityIcons
          name="camera-off-outline"
          size={54}
          color={colors.warning}
          style={styles.iconoPermiso}
        />
        <Text style={styles.tituloPermiso}>Permiso de Cámara Requerido</Text>
        <Text style={styles.subtituloPermiso}>
          Para unirte al combate en la cancha o escanear el QR del bando, necesitamos acceso a la cámara.
        </Text>
        <TouchableOpacity
          style={styles.botonPermiso}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Conceder acceso a la cámara"
        >
          <Text style={styles.textoBotonPermiso}>CONCEDER ACCESO</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botonManualAlt}
          onPress={() => setModalCodigoVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Ingresar código manualmente"
        >
          <Text style={styles.textoBotonManualAlt}>INGRESAR CÓDIGO MANUALMENTE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botonVolver}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Volver atrás"
        >
          <Text style={styles.textoBotonVolver}>VOLVER</Text>
        </TouchableOpacity>

        <ModalCodigoTactico
          visible={modalCodigoVisible}
          onClose={() => setModalCodigoVisible(false)}
          onSuccess={(eventoId) => {
            setModalCodigoVisible(false);
            navigation.replace('EventoDetalle', { eventoId });
          }}
        />
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

        setDialogoQr({
          visible: true,
          titulo: 'ALISTAMIENTO CONFIRMADO EN TERRENO',
          mensaje: `Te has incorporado exitosamente a la operación #${resultado.eventoId} con rol ${resultado.rol}.`,
          tipo: 'exito',
          icono: 'shield-check',
          textoConfirmar: 'VER SALA TÁCTICA',
          soloAceptar: true,
          onConfirmar: () => {
            setDialogoQr(null);
            navigation.replace('EventoDetalle', { eventoId: resultado.eventoId });
          },
        });
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
      setDialogoQr({
        visible: true,
        titulo: 'OPERACIÓN LOCALIZADA',
        mensaje: `"${res.evento.titulo}" en ${res.evento.canchaNombre || 'campo de juego'}.\n\n¿Deseas desplegarte a esta partida?`,
        tipo: 'primario',
        icono: 'crosshairs-gps',
        textoConfirmar: 'ENTRAR AL COMBATE',
        textoCancelar: 'CANCELAR',
        soloAceptar: false,
        onConfirmar: () => {
          setDialogoQr(null);
          navigation.replace('EventoDetalle', { eventoId: res.evento.id });
        },
        onCancelar: () => {
          setDialogoQr(null);
          setEscaneado(false);
        },
      });
    } catch (error: any) {
      setDialogoQr({
        visible: true,
        titulo: 'CÓDIGO O QR NO VÁLIDO',
        mensaje: error.message || 'No se encontró ninguna partida activa con este código o QR táctico.',
        tipo: 'peligro',
        icono: 'alert-circle-outline',
        textoConfirmar: 'REINTENTAR',
        textoCancelar: 'VOLVER',
        soloAceptar: false,
        onConfirmar: () => {
          setDialogoQr(null);
          setEscaneado(false);
        },
        onCancelar: () => {
          setDialogoQr(null);
          navigation.goBack();
        },
      });
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
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top + 16, 24),
            paddingBottom: Math.max(insets.bottom + 20, 28),
          },
        ]}
      >
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
            accessibilityRole="button"
            accessibilityLabel="Ingresar código de partida de 6 dígitos"
          >
            <MaterialCommunityIcons name="keyboard-outline" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.textoBotonIngresoManual}>INGRESAR CÓDIGO (6 DÍGITOS)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonCancelar}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Cancelar escaneo"
          >
            <Text style={styles.textoBotonCancelar}>CANCELAR ESCANEO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ModalCodigoTactico
        visible={modalCodigoVisible}
        onClose={() => setModalCodigoVisible(false)}
        onSuccess={(eventoId) => {
          setModalCodigoVisible(false);
          navigation.replace('EventoDetalle', { eventoId });
        }}
      />

      {dialogoQr && (
        <ModalConfirmacionTactico
          visible={dialogoQr.visible}
          titulo={dialogoQr.titulo}
          mensaje={dialogoQr.mensaje}
          tipo={dialogoQr.tipo}
          icono={dialogoQr.icono}
          textoConfirmar={dialogoQr.textoConfirmar}
          textoCancelar={dialogoQr.textoCancelar}
          soloAceptar={dialogoQr.soloAceptar}
          onConfirmar={dialogoQr.onConfirmar}
          onCancelar={dialogoQr.onCancelar}
        />
      )}
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
    color: colors.onPrimary,
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
    color: colors.text,
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
    color: colors.onPrimary,
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
});

