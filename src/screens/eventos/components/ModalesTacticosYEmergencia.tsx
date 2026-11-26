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
  Keyboard,
  Pressable,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Bando } from '../../../api/eventos.service';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { modalSheetStyles } from './modalSheetStyles';

interface ModalMapaTacticoProps {
  visible: boolean;
  onClose: () => void;
  mapaTacticoUrl?: string | null;
}

export const ModalMapaTactico: React.FC<ModalMapaTacticoProps> = ({
  visible,
  onClose,
  mapaTacticoUrl,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={modalSheetStyles.modalOverlay}>
      <View style={[modalSheetStyles.modalContent, { height: '80%', alignItems: 'center' }]}>
        <View style={modalSheetStyles.modalHeaderQr}>
          <MaterialCommunityIcons name="map-legend" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={modalSheetStyles.modalTitulo}>MAPA TÁCTICO DEL TERRENO</Text>
            <Text style={modalSheetStyles.modalSubtitulo}>
              Cuadrícula satelital y puntos de control
            </Text>
          </View>
        </View>

        {mapaTacticoUrl ? (
          <Image
            source={{ uri: mapaTacticoUrl }}
            style={styles.imgMapaTacticoModal}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.sinMapaBox}>
            <Text style={styles.txtSinMapa}>No se ha cargado una imagen táctica del mapa.</Text>
          </View>
        )}

        <TouchableOpacity style={modalSheetStyles.btnCerrarModalTacsop} onPress={onClose}>
          <Text style={modalSheetStyles.txtBtnCerrarModalTacsop}>CERRAR MAPA</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

interface ModalAlertaBlindManProps {
  visible: boolean;
  onClose: () => void;
  frecuenciaEmergencia?: string | null;
}

export const ModalAlertaBlindMan: React.FC<ModalAlertaBlindManProps> = ({
  visible,
  onClose,
  frecuenciaEmergencia,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={modalSheetStyles.modalOverlay}>
      <View style={styles.modalBlindManCard}>
        <MaterialCommunityIcons name="alert-octagon" size={48} color={colors.danger} />
        <Text style={styles.tituloBlindMan}>¡ALTO AL FUEGO INMEDIATO!</Text>
        <Text style={styles.subtituloBlindMan}>PROCEDIMIENTO DE EMERGENCIA TÁCTICA</Text>

        <Text style={styles.txtBlindManDesc}>
          En caso de accidente real, presencia de civiles sin protección ocular o emergencia médica en la cancha:
        </Text>

        <View style={styles.blindManInstruccionesBox}>
          <Text style={styles.txtBlindManPaso}>
            1. Grita en voz alta: &quot;¡BLIND MAN! ¡ALTO AL FUEGO!&quot;
          </Text>
          <Text style={styles.txtBlindManPaso}>
            2. Pon tu réplica en SEGURO apuntando al suelo.
          </Text>
          <Text style={styles.txtBlindManPaso}>
            3. Sintoniza el canal de radio de emergencia:
          </Text>
          <Text style={styles.frecuenciaBlindManDestacada}>
            {frecuenciaEmergencia || '462.5625 MHz'}
          </Text>
        </View>

        <TouchableOpacity style={styles.btnCerrarBlindMan} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.txtBtnCerrarBlindMan}>ENTERADO • PROTOCOLO COMPRENDIDO</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

interface ModalAsignarMisionProps {
  visible: boolean;
  onClose: () => void;
  bandos: Bando[];
  misionTitulo: string;
  setMisionTitulo: (val: string) => void;
  misionBandoId: number | null;
  setMisionBandoId: (id: number | null) => void;
  misionDescLider: string;
  setMisionDescLider: (val: string) => void;
  misionDescOperadores: string;
  setMisionDescOperadores: (val: string) => void;
  misionFotoUrl: string;
  guardandoMision: boolean;
  onSeleccionarFotoGaleria: () => void;
  onTomarFotoCamara: () => void;
  onQuitarFoto: () => void;
  onCrearMision: () => void;
}

export const ModalAsignarMision: React.FC<ModalAsignarMisionProps> = ({
  visible,
  onClose,
  bandos,
  misionTitulo,
  setMisionTitulo,
  misionBandoId,
  setMisionBandoId,
  misionDescLider,
  setMisionDescLider,
  misionDescOperadores,
  setMisionDescOperadores,
  misionFotoUrl,
  guardandoMision,
  onSeleccionarFotoGaleria,
  onTomarFotoCamara,
  onQuitarFoto,
  onCrearMision,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={() => {
      Keyboard.dismiss();
      onClose();
    }}
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={modalSheetStyles.modalOverlay}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} accessible={false} />
      <View style={[modalSheetStyles.modalContent, { maxHeight: '88%' }]}>
        <Pressable style={modalSheetStyles.modalHeaderQr} onPress={Keyboard.dismiss} accessible={false}>
          <MaterialCommunityIcons name="target" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={modalSheetStyles.modalTitulo}>ASIGNAR ORDEN DE MISIÓN</Text>
            <Text style={modalSheetStyles.modalSubtitulo}>
              Directiva táctica de combate para facciones
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cerrar asignación de misión"
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ marginVertical: 8, width: '100%' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <Text style={styles.lblFormMision}>NOMBRE DE LA MISIÓN:</Text>
            <TextInput
              style={styles.inputMision}
              placeholder="Ej: Captura de Puesto Radio Echo"
              placeholderTextColor={colors.textMuted}
              value={misionTitulo}
              onChangeText={setMisionTitulo}
              returnKeyType="done"
            />

            <Text style={styles.lblFormMision}>FACCIÓN DESTINATARIA:</Text>
            <View style={styles.selectorFaccionesMisionRow}>
              {bandos.map((b) => {
                const sel = misionBandoId === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.chipBandoMision,
                      sel && {
                        borderColor: b.colorHex || colors.primary,
                        backgroundColor: colors.borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setMisionBandoId(b.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.colorDotMini,
                        { backgroundColor: b.colorHex || colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.txtChipBandoMision,
                        sel && { color: b.colorHex || colors.primary, fontWeight: 'bold' },
                      ]}
                    >
                      {b.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.lblFormMision}>BRIEFING CONFIDENCIAL PARA EL LÍDER:</Text>
            <Text style={styles.lblAyudaMision}>
              Solo el líder de la facción podrá ver estas directivas e instrucciones clasificadas.
            </Text>
            <TextInput
              style={[styles.inputMision, styles.inputMisionMultilinea]}
              placeholder="Coordenadas exactas, objetivos secundarios, condiciones de extracción o información confidencial..."
              placeholderTextColor={colors.textMuted}
              value={misionDescLider}
              onChangeText={setMisionDescLider}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={Keyboard.dismiss}
            />

            <Text style={styles.lblFormMision}>ORDEN GENERAL PARA LOS OPERADORES:</Text>
            <Text style={styles.lblAyudaMision}>
              Directiva visible para todos los miembros de la facción en su radar de combate.
            </Text>
            <TextInput
              style={[styles.inputMision, styles.inputMisionMultilinea]}
              placeholder="Orden táctica visible para toda la tropa (ej: Avanzar a sector norte y asegurar perímetro)..."
              placeholderTextColor={colors.textMuted}
              value={misionDescOperadores}
              onChangeText={setMisionDescOperadores}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={Keyboard.dismiss}
            />

            <Text style={styles.lblFormMision}>
              FOTO ADJUNTA / CROQUIS PARA EL LÍDER (OPCIONAL):
            </Text>
            <Text style={styles.lblAyudaMision}>
              Adjunta una evidencia o croquis desde tu galería o captura una foto del terreno.
            </Text>

            {misionFotoUrl ? (
              <View style={styles.previewFotoAdjuntaBox}>
                <Image
                  source={{ uri: misionFotoUrl }}
                  style={styles.imgFotoAdjuntaPreview}
                  resizeMode="cover"
                />
                <View style={styles.accionesFotoAdjuntaRow}>
                  <TouchableOpacity
                    style={styles.btnCambiarFotoAdjunta}
                    onPress={onSeleccionarFotoGaleria}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name="image-edit"
                      size={14}
                      color={colors.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.txtBtnCambiarFotoAdjunta}>Cambiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnQuitarFotoAdjunta}
                    onPress={onQuitarFoto}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={14}
                      color={colors.danger}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.txtBtnQuitarFotoAdjunta}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.botonesAdjuntarFotoRow}>
                <TouchableOpacity
                  style={styles.btnAdjuntarGaleria}
                  onPress={onSeleccionarFotoGaleria}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="image-plus"
                    size={18}
                    color={colors.text}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.txtBtnAdjuntarFoto}>GALERÍA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnAdjuntarCamara}
                  onPress={onTomarFotoCamara}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="camera"
                    size={18}
                    color={colors.onPrimary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.txtBtnAdjuntarFotoCamara}>TOMAR FOTO</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </ScrollView>

        <View style={modalSheetStyles.modalBotones}>
          <TouchableOpacity
            style={modalSheetStyles.modalBotonCancelar}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
          >
            <Text style={modalSheetStyles.modalTextoCancelar}>CANCELAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              modalSheetStyles.modalBotonConfirmar,
              guardandoMision && modalSheetStyles.botonDeshabilitado,
              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
            ]}
            onPress={onCrearMision}
            disabled={guardandoMision}
          >
            {guardandoMision ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="radio-tower"
                  size={16}
                  color={colors.onPrimary}
                  style={{ marginRight: 6 }}
                />
                <Text style={modalSheetStyles.modalTextoConfirmar}>TRANSMITIR MISIÓN</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

interface ModalFotoMisionProps {
  visible: boolean;
  onClose: () => void;
  fotoUrl: string | null;
}

export const ModalFotoMision: React.FC<ModalFotoMisionProps> = ({
  visible,
  onClose,
  fotoUrl,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={modalSheetStyles.modalOverlay}>
      <View style={[modalSheetStyles.modalContent, { height: '80%', alignItems: 'center' }]}>
        <View style={modalSheetStyles.modalHeaderQr}>
          <MaterialCommunityIcons name="image" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={modalSheetStyles.modalTitulo}>FOTO TÁCTICA ADJUNTA</Text>
            <Text style={modalSheetStyles.modalSubtitulo}>Croquis clasificado para el mando</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cerrar foto táctica"
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {fotoUrl ? (
          <Image source={{ uri: fotoUrl }} style={styles.imgFotoMisionGrande} resizeMode="contain" />
        ) : null}

        <TouchableOpacity style={modalSheetStyles.btnCerrarModalTacsop} onPress={onClose}>
          <Text style={modalSheetStyles.txtBtnCerrarModalTacsop}>CERRAR FOTO</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  imgMapaTacticoModal: {
    width: '100%',
    height: 350,
    borderRadius: 8,
    marginVertical: 10,
  },
  sinMapaBox: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtSinMapa: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  modalBlindManCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.danger,
    padding: 20,
    alignItems: 'center',
    width: '90%',
  },
  tituloBlindMan: {
    color: colors.danger,
    fontSize: 18,
    fontFamily: fonts.displayBold,
    letterSpacing: 1,
    marginTop: 8,
  },
  subtituloBlindMan: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  txtBlindManDesc: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  blindManInstruccionesBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    gap: 6,
  },
  txtBlindManPaso: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  frecuenciaBlindManDestacada: {
    color: colors.danger,
    fontSize: 22,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  btnCerrarBlindMan: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    minHeight: 44,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  txtBtnCerrarBlindMan: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  lblFormMision: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  lblAyudaMision: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 6,
  },
  inputMision: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  inputMisionMultilinea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  selectorFaccionesMisionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chipBandoMision: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  colorDotMini: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txtChipBandoMision: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 6,
  },
  previewFotoAdjuntaBox: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  imgFotoAdjuntaPreview: {
    width: '100%',
    height: 140,
  },
  accionesFotoAdjuntaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnCambiarFotoAdjunta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txtBtnCambiarFotoAdjunta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnQuitarFotoAdjunta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txtBtnQuitarFotoAdjunta: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
  },
  botonesAdjuntarFotoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  btnAdjuntarGaleria: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderSubtle,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  txtBtnAdjuntarFoto: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnAdjuntarCamara: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  txtBtnAdjuntarFotoCamara: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  imgFotoMisionGrande: {
    width: '100%',
    height: '75%',
    marginVertical: 10,
    borderRadius: 10,
  },
});
