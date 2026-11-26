import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DetalleEventoResponse } from '../../../api/eventos.service';
import { ModalidadPartida } from '../../../api/configuracion.service';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { modalSheetStyles } from './modalSheetStyles';

export const ROLES_TACTICOS = ['ASALTO', 'CQB', 'SNIPER', 'DMR', 'APOYO', 'MÉDICO'];

interface ModalSeleccionRolProps {
  visible: boolean;
  onClose: () => void;
  esMasivo: boolean;
  rolesSeleccionados: string[];
  onToggleRol: (rol: string) => void;
  uniendose: boolean;
  onConfirmar: () => void;
}

export const ModalSeleccionRol: React.FC<ModalSeleccionRolProps> = ({
  visible,
  onClose,
  esMasivo,
  rolesSeleccionados,
  onToggleRol,
  uniendose,
  onConfirmar,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={modalSheetStyles.modalOverlay}
    >
      <View style={modalSheetStyles.modalContent}>
        <Text style={modalSheetStyles.modalTitulo}>SELECCIONA TU ROL TÁCTICO</Text>
        <Text style={modalSheetStyles.modalSubtitulo}>
          {esMasivo
            ? 'Selecciona 1 rol específico para este despliegue masivo:'
            : 'Elige tu rol o especialidad en el combate:'}
        </Text>

        <View style={styles.rolesModalGrid}>
          {ROLES_TACTICOS.map((rol) => {
            const activo = rolesSeleccionados.includes(rol);
            return (
              <TouchableOpacity
                key={rol}
                style={[styles.rolModalChip, activo && styles.rolModalChipActivo]}
                onPress={() => onToggleRol(rol)}
                activeOpacity={0.8}
              >
                <Text style={[styles.rolModalTexto, activo && styles.rolModalTextoActivo]}>
                  {rol}
                </Text>
                {activo && (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={colors.text}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={modalSheetStyles.modalBotones}>
          <TouchableOpacity style={modalSheetStyles.modalBotonCancelar} onPress={onClose}>
            <Text style={modalSheetStyles.modalTextoCancelar}>CANCELAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              modalSheetStyles.modalBotonConfirmar,
              uniendose && modalSheetStyles.botonDeshabilitado,
            ]}
            disabled={uniendose}
            onPress={onConfirmar}
          >
            {uniendose ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={modalSheetStyles.modalTextoConfirmar}>CONFIRMAR ALISTAMIENTO</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

interface ModalQrAccesoProps {
  visible: boolean;
  onClose: () => void;
  evento: DetalleEventoResponse['evento'];
  tabQrAtrasados: 'PARTIDA' | 'BANDO';
  setTabQrAtrasados: (tab: 'PARTIDA' | 'BANDO') => void;
  bandoQrSeleccionadoId: number | null;
  setBandoQrSeleccionadoId: (id: number | null) => void;
  onCompartirOperacion: () => void;
}

export const ModalQrAcceso: React.FC<ModalQrAccesoProps> = ({
  visible,
  onClose,
  evento,
  tabQrAtrasados,
  setTabQrAtrasados,
  bandoQrSeleccionadoId,
  setBandoQrSeleccionadoId,
  onCompartirOperacion,
}) => {
  const bandoActivo =
    tabQrAtrasados === 'BANDO'
      ? evento.bandos?.find((b) => b.id === (bandoQrSeleccionadoId || evento.bandos![0]?.id))
      : null;

  const qrPayload =
    tabQrAtrasados === 'BANDO' && bandoActivo?.qrToken
      ? `bajatepo://bando/${bandoActivo.qrToken}`
      : `bajatepo://evento/${evento.codigoInvitacion || evento.id}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    qrPayload,
  )}&color=000000&bgcolor=ffffff`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalSheetStyles.modalOverlay}>
        <View style={styles.modalContentQr}>
          <View style={modalSheetStyles.modalHeaderQr}>
            <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={modalSheetStyles.modalTitulo}>QR DE ACCESO TÁCTICO</Text>
              <Text style={modalSheetStyles.modalSubtitulo}>
                Muestra este código a los operadores en la cancha para ingreso rápido:
              </Text>
            </View>
          </View>

          <View style={styles.qrTabsContainer}>
            <TouchableOpacity
              style={[styles.qrTabBtn, tabQrAtrasados === 'PARTIDA' && styles.qrTabBtnActivo]}
              onPress={() => setTabQrAtrasados('PARTIDA')}
            >
              <Text style={[styles.qrTabTxt, tabQrAtrasados === 'PARTIDA' && styles.qrTabTxtActivo]}>
                EVENTO GENERAL
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.qrTabBtn, tabQrAtrasados === 'BANDO' && styles.qrTabBtnActivo]}
              onPress={() => {
                setTabQrAtrasados('BANDO');
                if (!bandoQrSeleccionadoId && evento.bandos && evento.bandos.length > 0) {
                  setBandoQrSeleccionadoId(evento.bandos[0].id);
                }
              }}
            >
              <Text style={[styles.qrTabTxt, tabQrAtrasados === 'BANDO' && styles.qrTabTxtActivo]}>
                POR BANDO DIRECTO
              </Text>
            </TouchableOpacity>
          </View>

          {tabQrAtrasados === 'BANDO' && evento.bandos && (
            <View style={styles.bandoSelectorQrRow}>
              {evento.bandos.map((b) => {
                const seleccionado = (bandoQrSeleccionadoId || evento.bandos![0].id) === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.chipBandoQr,
                      seleccionado && { borderColor: b.colorHex || colors.primary },
                    ]}
                    onPress={() => setBandoQrSeleccionadoId(b.id)}
                  >
                    <View
                      style={[styles.dotBando, { backgroundColor: b.colorHex || colors.primary }]}
                    />
                    <Text
                      style={[
                        styles.txtChipBando,
                        seleccionado && { color: colors.text, fontWeight: '800' },
                      ]}
                    >
                      {b.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.qrContainerBox}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
            <View style={styles.qrCodigoFooter}>
              <Text style={styles.qrCodigoSub}>CÓDIGO MNEMOTÉCNICO:</Text>
              <Text style={styles.qrCodigoText}>{evento.codigoInvitacion || 'N/A'}</Text>
              <Text style={styles.qrInstruccion}>
                {tabQrAtrasados === 'BANDO'
                  ? `Al escanear ingresarán directo a "${bandoActivo?.nombre || 'Bando'}".`
                  : 'Al escanear accederán directamente al evento.'}
              </Text>
            </View>
          </View>

          <View style={modalSheetStyles.modalBotones}>
            <TouchableOpacity style={modalSheetStyles.modalBotonCancelar} onPress={onClose}>
              <Text style={modalSheetStyles.modalTextoCancelar}>CERRAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCompartirModal} onPress={onCompartirOperacion}>
              <MaterialCommunityIcons
                name="share-variant"
                size={15}
                color={colors.onPrimary}
                style={{ marginRight: 4 }}
              />
              <Text style={modalSheetStyles.modalTextoConfirmar}>COMPARTIR LINK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface ModalIniciarPartidaProps {
  visible: boolean;
  onClose: () => void;
  partidasCount: number;
  modalidades: ModalidadPartida[];
  modalidadSeleccionada: ModalidadPartida | null;
  setModalidadSeleccionada: (m: ModalidadPartida) => void;
  nombreNuevaPartida: string;
  setNombreNuevaPartida: (val: string) => void;
  creandoPartida: boolean;
  onIniciarPartida: () => void;
}

export const ModalIniciarPartida: React.FC<ModalIniciarPartidaProps> = ({
  visible,
  onClose,
  partidasCount,
  modalidades,
  modalidadSeleccionada,
  setModalidadSeleccionada,
  nombreNuevaPartida,
  setNombreNuevaPartida,
  creandoPartida,
  onIniciarPartida,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={modalSheetStyles.modalOverlay}
    >
      <View style={modalSheetStyles.modalContent}>
        <View style={modalSheetStyles.modalHeaderQr}>
          <MaterialCommunityIcons name="flag-checkered" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={modalSheetStyles.modalTitulo}>INICIAR PARTIDA / MODALIDAD</Text>
            <Text style={modalSheetStyles.modalSubtitulo}>
              Elige la modalidad táctica configurada:
            </Text>
          </View>
        </View>

        <Text style={modalSheetStyles.inputModalLabel}>NOMBRE DE LA PARTIDA (OPCIONAL):</Text>
        <TextInput
          style={modalSheetStyles.inputModal}
          placeholder={`ej: Partida ${partidasCount + 1} (${modalidadSeleccionada?.nombre || 'TDM'})`}
          placeholderTextColor={colors.textMuted}
          value={nombreNuevaPartida}
          onChangeText={setNombreNuevaPartida}
        />

        <Text style={modalSheetStyles.inputModalLabel}>MODALIDAD DE JUEGO:</Text>
        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
          {modalidades.map((m) => {
            const activo = (modalidadSeleccionada?.id || modalidades[0]?.id) === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.itemModalidadCard, activo && styles.itemModalidadCardActivo]}
                onPress={() => setModalidadSeleccionada(m)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txtModalidadNombre, activo && styles.txtModalidadNombreActivo]}>
                    {m.nombre}
                  </Text>
                  {m.descripcion ? <Text style={styles.txtModalidadDesc}>{m.descripcion}</Text> : null}
                </View>
                {activo && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={modalSheetStyles.modalBotones}>
          <TouchableOpacity style={modalSheetStyles.modalBotonCancelar} onPress={onClose}>
            <Text style={modalSheetStyles.modalTextoCancelar}>CANCELAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              modalSheetStyles.modalBotonConfirmar,
              creandoPartida && modalSheetStyles.botonDeshabilitado,
            ]}
            disabled={creandoPartida}
            onPress={onIniciarPartida}
          >
            {creandoPartida ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={modalSheetStyles.modalTextoConfirmar}>DAR INICIO AL COMBATE</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const styles = StyleSheet.create({
  rolesModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  rolModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rolModalChipActivo: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  rolModalTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  rolModalTextoActivo: {
    color: colors.primary,
  },
  modalContentQr: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  qrTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
    width: '100%',
  },
  qrTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 6,
  },
  qrTabBtnActivo: {
    backgroundColor: colors.primary,
  },
  qrTabTxt: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  qrTabTxtActivo: {
    color: colors.onPrimary,
  },
  bandoSelectorQrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    width: '100%',
  },
  chipBandoQr: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  dotBando: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txtChipBando: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  qrContainerBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrCodigoFooter: {
    alignItems: 'center',
    marginTop: 8,
  },
  qrCodigoSub: {
    color: '#666',
    fontSize: 11,
    fontWeight: '800',
  },
  qrCodigoText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    marginVertical: 2,
  },
  qrInstruccion: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
  },
  btnCompartirModal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
  },
  itemModalidadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  itemModalidadCardActivo: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  txtModalidadNombre: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  txtModalidadNombreActivo: {
    color: colors.primary,
  },
  txtModalidadDesc: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
});
