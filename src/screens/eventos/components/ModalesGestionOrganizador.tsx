import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TacticalDateTimePicker } from '../../../components/TacticalDateTimePicker';
import { Bando, DetalleEventoResponse } from '../../../api/eventos.service';
import { colors } from '../../../theme/colors';
import { modalSheetStyles } from './modalSheetStyles';

interface ModalEditarEventoProps {
  visible: boolean;
  onClose: () => void;
  esMasivo: boolean;
  editTitulo: string;
  setEditTitulo: (val: string) => void;
  editDescripcion: string;
  setEditDescripcion: (val: string) => void;
  editFechaInicio: Date;
  setEditFechaInicio: (val: Date) => void;
  editFechaFin: Date;
  setEditFechaFin: (val: Date) => void;
  editVidasMax: string;
  setEditVidasMax: (val: string) => void;
  editTiempoDesangradoMin: string;
  setEditTiempoDesangradoMin: (val: string) => void;
  editRequiereTorniquete: boolean;
  setEditRequiereTorniquete: (val: boolean) => void;
  editLimitesCrono: any[];
  setEditLimitesCrono: React.Dispatch<React.SetStateAction<any[]>>;
  guardandoEdicion: boolean;
  onGuardar: () => void;
}

export const ModalEditarEvento: React.FC<ModalEditarEventoProps> = ({
  visible,
  onClose,
  esMasivo,
  editTitulo,
  setEditTitulo,
  editDescripcion,
  setEditDescripcion,
  editFechaInicio,
  setEditFechaInicio,
  editFechaFin,
  setEditFechaFin,
  editVidasMax,
  setEditVidasMax,
  editTiempoDesangradoMin,
  setEditTiempoDesangradoMin,
  editRequiereTorniquete,
  setEditRequiereTorniquete,
  editLimitesCrono,
  setEditLimitesCrono,
  guardandoEdicion,
  onGuardar,
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
        <Pressable style={{ width: '100%' }} onPress={Keyboard.dismiss} accessible={false}>
          <Text style={modalSheetStyles.modalTitulo}>MODIFICAR OPERACIÓN</Text>
          <Text style={modalSheetStyles.modalSubtitulo}>
            Actualiza los parámetros tácticos y reglas:
          </Text>
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ width: '100%' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <Text style={modalSheetStyles.inputModalLabel}>TÍTULO (*):</Text>
            <TextInput
              style={modalSheetStyles.inputModal}
              value={editTitulo}
              onChangeText={setEditTitulo}
              placeholder="Título del evento"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />

            <Text style={modalSheetStyles.inputModalLabel}>BRIEFING / DESCRIPCIÓN:</Text>
            <TextInput
              style={[modalSheetStyles.inputModal, modalSheetStyles.inputModalArea]}
              value={editDescripcion}
              onChangeText={setEditDescripcion}
              placeholder="Detalles de la operación..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={Keyboard.dismiss}
            />

            <TacticalDateTimePicker
              label="HORA DE INICIO (*):"
              value={editFechaInicio}
              onChange={setEditFechaInicio}
            />

            <TacticalDateTimePicker
              label="HORA DE TÉRMINO (*):"
              value={editFechaFin}
              minimumDate={editFechaInicio}
              onChange={setEditFechaFin}
            />

            {esMasivo && (
              <View
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <MaterialCommunityIcons
                    name="shield-sword"
                    size={18}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                    REGLAS TACSOP & CRONÓGRAFO
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={modalSheetStyles.inputModalLabel}>VIDAS POR OPERADOR:</Text>
                    <TextInput
                      style={modalSheetStyles.inputModal}
                      value={editVidasMax}
                      onChangeText={setEditVidasMax}
                      keyboardType="numeric"
                      placeholder="2"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalSheetStyles.inputModalLabel}>DESANGRADO (MIN):</Text>
                    <TextInput
                      style={modalSheetStyles.inputModal}
                      value={editTiempoDesangradoMin}
                      onChangeText={setEditTiempoDesangradoMin}
                      keyboardType="numeric"
                      placeholder="5"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.switchTorniqueteBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
                      ¿Requiere torniquete obligatorio?
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                      Auto-aplicación médica en combate
                    </Text>
                  </View>
                  <Switch
                    value={editRequiereTorniquete}
                    onValueChange={setEditRequiereTorniquete}
                    trackColor={{ false: colors.inputBg, true: colors.primary }}
                    thumbColor={editRequiereTorniquete ? colors.text : colors.textMuted}
                  />
                </View>

                <Text style={[modalSheetStyles.inputModalLabel, { marginBottom: 6 }]}>
                  LÍMITES DE CRONO POR CATEGORÍA (FPS / JULIOS):
                </Text>
                {editLimitesCrono.map((lim: any, idx: number) => (
                  <View key={lim.categoria || idx} style={styles.filaLimiteCronoEdit}>
                    <Text style={{ width: 68, color: colors.text, fontSize: 11, fontWeight: '700' }}>
                      {lim.categoria}
                    </Text>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>FPS:</Text>
                      <TextInput
                        style={[
                          modalSheetStyles.inputModal,
                          { flex: 1, height: 34, paddingVertical: 2, fontSize: 11, marginBottom: 0 },
                        ]}
                        value={lim.maxFps ? String(lim.maxFps) : ''}
                        keyboardType="numeric"
                        onChangeText={(val) => {
                          const fpsNum = parseInt(val, 10) || 0;
                          const jNum = Number(
                            (0.5 * 0.0002 * Math.pow(fpsNum * 0.3048, 2)).toFixed(2),
                          );
                          setEditLimitesCrono((prev: any[]) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, maxFps: fpsNum, maxJoules: jNum } : item,
                            ),
                          );
                        }}
                      />
                    </View>
                    <View style={{ width: 65, alignItems: 'center' }}>
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                        {lim.maxJoules} J
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>0.20g</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </ScrollView>

        <View style={[modalSheetStyles.modalBotones, { marginTop: 12 }]}>
          <TouchableOpacity
            style={modalSheetStyles.modalBotonCancelar}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
          >
            <Text style={modalSheetStyles.modalTextoCancelar}>VOLVER</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              modalSheetStyles.modalBotonConfirmar,
              guardandoEdicion && modalSheetStyles.botonDeshabilitado,
            ]}
            disabled={guardandoEdicion}
            onPress={onGuardar}
          >
            {guardandoEdicion ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={modalSheetStyles.modalTextoConfirmar}>GUARDAR CAMBIOS</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

interface ModalCancelarEventoProps {
  visible: boolean;
  onClose: () => void;
  motivos: string[];
  motivoSeleccionado: string;
  setMotivoSeleccionado: (val: string) => void;
  motivoOtroTexto: string;
  setMotivoOtroTexto: (val: string) => void;
  cancelandoEvento: boolean;
  onConfirmar: () => void;
}

export const ModalCancelarEvento: React.FC<ModalCancelarEventoProps> = ({
  visible,
  onClose,
  motivos,
  motivoSeleccionado,
  setMotivoSeleccionado,
  motivoOtroTexto,
  setMotivoOtroTexto,
  cancelandoEvento,
  onConfirmar,
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
      <View style={modalSheetStyles.modalContent}>
        <Pressable style={{ width: '100%' }} onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <MaterialCommunityIcons
              name="cancel"
              size={20}
              color={colors.danger}
              style={{ marginRight: 6 }}
            />
            <Text style={[modalSheetStyles.modalTitulo, { color: colors.danger, marginBottom: 0 }]}>
              CANCELAR OPERACIÓN
            </Text>
          </View>
          <Text style={modalSheetStyles.modalSubtitulo}>
            Indica el motivo de la cancelación. Se notificará a los participantes:
          </Text>
        </Pressable>

        {motivos.map((motivo) => {
          const seleccionado = motivoSeleccionado === motivo;
          return (
            <TouchableOpacity
              key={motivo}
              style={[styles.itemMotivoChip, seleccionado && styles.itemMotivoChipActivo]}
              onPress={() => {
                Keyboard.dismiss();
                setMotivoSeleccionado(motivo);
              }}
            >
              <MaterialCommunityIcons
                name={seleccionado ? 'radiobox-marked' : 'radiobox-blank'}
                size={16}
                color={seleccionado ? colors.danger : colors.textMuted}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.txtMotivoChip, seleccionado && styles.txtMotivoChipActivo]}>
                {motivo}
              </Text>
            </TouchableOpacity>
          );
        })}

        {motivoSeleccionado === 'Otro motivo...' && (
          <TextInput
            style={[modalSheetStyles.inputModal, modalSheetStyles.inputModalArea, { marginTop: 8 }]}
            value={motivoOtroTexto}
            onChangeText={setMotivoOtroTexto}
            placeholder="Escribe el motivo detallado..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={Keyboard.dismiss}
          />
        )}

        <View style={modalSheetStyles.modalBotones}>
          <TouchableOpacity
            style={modalSheetStyles.modalBotonCancelar}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
          >
            <Text style={modalSheetStyles.modalTextoCancelar}>VOLVER</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.btnConfirmarCancelarEvento,
              cancelandoEvento && modalSheetStyles.botonDeshabilitado,
            ]}
            disabled={cancelandoEvento}
            onPress={onConfirmar}
          >
            {cancelandoEvento ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={styles.txtConfirmarCancelarEvento}>CONFIRMAR CANCELACIÓN</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

interface ModalHabilitarEscuadrasProps {
  visible: boolean;
  onClose: () => void;
  bando: Bando | null;
  modoEscuadra: 'GENERAR' | 'CREAR_UNA';
  setModoEscuadra: (modo: 'GENERAR' | 'CREAR_UNA') => void;
  cantidadEscuadras: string;
  setCantidadEscuadras: (val: string) => void;
  nombreNuevaEscuadra: string;
  setNombreNuevaEscuadra: (val: string) => void;
  cupoMaxNuevaEscuadra: string;
  setCupoMaxNuevaEscuadra: (val: string) => void;
  guardandoEscuadra: boolean;
  onGenerar: () => void;
}

export const ModalHabilitarEscuadras: React.FC<ModalHabilitarEscuadrasProps> = ({
  visible,
  onClose,
  bando,
  modoEscuadra,
  setModoEscuadra,
  cantidadEscuadras,
  setCantidadEscuadras,
  nombreNuevaEscuadra,
  setNombreNuevaEscuadra,
  cupoMaxNuevaEscuadra,
  setCupoMaxNuevaEscuadra,
  guardandoEscuadra,
  onGenerar,
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
      <View style={modalSheetStyles.modalContent}>
        <Pressable style={modalSheetStyles.modalHeaderQr} onPress={Keyboard.dismiss} accessible={false}>
          <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={modalSheetStyles.modalTitulo}>HABILITAR ESCUADRAS</Text>
            <Text style={modalSheetStyles.modalSubtitulo}>Facción: {bando?.nombre}</Text>
          </View>
        </Pressable>

        <View style={styles.qrTabsContainer}>
          <TouchableOpacity
            style={[styles.qrTabBtn, modoEscuadra === 'GENERAR' && styles.qrTabBtnActivo]}
            onPress={() => setModoEscuadra('GENERAR')}
          >
            <Text style={[styles.qrTabTxt, modoEscuadra === 'GENERAR' && styles.qrTabTxtActivo]}>
              MÚLTIPLES (X)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.qrTabBtn, modoEscuadra === 'CREAR_UNA' && styles.qrTabBtnActivo]}
            onPress={() => setModoEscuadra('CREAR_UNA')}
          >
            <Text style={[styles.qrTabTxt, modoEscuadra === 'CREAR_UNA' && styles.qrTabTxtActivo]}>
              + ESPECÍFICA
            </Text>
          </TouchableOpacity>
        </View>

        {modoEscuadra === 'GENERAR' ? (
          <View>
            <Text style={modalSheetStyles.inputModalLabel}>CANTIDAD DE ESCUADRAS A HABILITAR:</Text>
            <View style={styles.botonesCantidadRow}>
              {['2', '3', '4', '6', '8'].map((cant) => (
                <TouchableOpacity
                  key={cant}
                  style={[
                    styles.btnChipCantidad,
                    cantidadEscuadras === cant && styles.btnChipCantidadActivo,
                  ]}
                  onPress={() => setCantidadEscuadras(cant)}
                >
                  <Text
                    style={[
                      styles.txtChipCantidad,
                      cantidadEscuadras === cant && styles.txtChipCantidadActivo,
                    ]}
                  >
                    {cant}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={modalSheetStyles.inputModalLabel}>CUPO MÁXIMO POR ESCUADRA:</Text>
            <TextInput
              style={modalSheetStyles.inputModal}
              value={cupoMaxNuevaEscuadra}
              onChangeText={setCupoMaxNuevaEscuadra}
              keyboardType="numeric"
              placeholder="ej: 10"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ) : (
          <View>
            <Text style={modalSheetStyles.inputModalLabel}>NOMBRE DE LA ESCUADRA (*):</Text>
            <TextInput
              style={modalSheetStyles.inputModal}
              value={nombreNuevaEscuadra}
              onChangeText={setNombreNuevaEscuadra}
              placeholder="ej: Escuadra Alfa Recon"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={modalSheetStyles.inputModalLabel}>CUPO MÁXIMO DE OPERADORES:</Text>
            <TextInput
              style={modalSheetStyles.inputModal}
              value={cupoMaxNuevaEscuadra}
              onChangeText={setCupoMaxNuevaEscuadra}
              keyboardType="numeric"
              placeholder="ej: 10"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}

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
              guardandoEscuadra && modalSheetStyles.botonDeshabilitado,
            ]}
            disabled={guardandoEscuadra}
            onPress={onGenerar}
          >
            {guardandoEscuadra ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={modalSheetStyles.modalTextoConfirmar}>
                {modoEscuadra === 'GENERAR' ? 'HABILITAR ESCUADRAS' : 'CREAR ESCUADRA'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

interface ModalDesignarLiderBandoProps {
  visible: boolean;
  onClose: () => void;
  bando: Bando | null;
  evento: DetalleEventoResponse['evento'];
  jugadores: DetalleEventoResponse['jugadores'];
  onDesignarLider: (jugadorId: number | null) => void;
}

export const ModalDesignarLiderBando: React.FC<ModalDesignarLiderBandoProps> = ({
  visible,
  onClose,
  bando,
  evento,
  jugadores,
  onDesignarLider,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={modalSheetStyles.modalOverlay}
    >
      <View style={modalSheetStyles.modalContent}>
        <View style={modalSheetStyles.modalHeaderQr}>
          <MaterialCommunityIcons name="star-shooting" size={24} color={colors.warning} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={modalSheetStyles.modalTitulo}>DESIGNAR LÍDER DE FACCIÓN</Text>
            <Text style={modalSheetStyles.modalSubtitulo}>Facción: {bando?.nombre}</Text>
          </View>
        </View>

        <Text style={modalSheetStyles.inputModalLabel}>SELECCIONA AL COMANDANTE:</Text>
        <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.itemCandidatoLider,
              !bando?.liderId && styles.itemCandidatoLiderActivo,
            ]}
            onPress={() => onDesignarLider(null)}
          >
            <MaterialCommunityIcons
              name="account-remove"
              size={18}
              color={colors.textMuted}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.txtCandidatoNombre}>Dejar sin líder asignado</Text>
          </TouchableOpacity>

          {jugadores
            .filter((j) => j.bandoId === bando?.id || j.jugadorId === evento.organizadorId)
            .map((cand) => {
              const esActual = bando?.liderId === cand.jugadorId;
              return (
                <TouchableOpacity
                  key={cand.jugadorId}
                  style={[styles.itemCandidatoLider, esActual && styles.itemCandidatoLiderActivo]}
                  onPress={() => onDesignarLider(cand.jugadorId)}
                >
                  <MaterialCommunityIcons
                    name={esActual ? 'star' : 'account'}
                    size={18}
                    color={esActual ? colors.warning : colors.primary}
                    style={{ marginRight: 8 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.txtCandidatoNombre,
                        esActual && { color: colors.warning, fontWeight: '900' },
                      ]}
                    >
                      {cand.alias || `Operador #${cand.jugadorId}`}
                      {cand.jugadorId === evento.organizadorId ? ' (ORGANIZADOR)' : ''}
                    </Text>
                    <Text style={styles.txtCandidatoRol}>Rol: {cand.rol || 'ASALTO'}</Text>
                  </View>
                  {esActual && (
                    <Text style={{ color: colors.warning, fontWeight: '900' }}>ACTUAL</Text>
                  )}
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        <View style={modalSheetStyles.modalBotones}>
          <TouchableOpacity style={modalSheetStyles.modalBotonCancelar} onPress={onClose}>
            <Text style={modalSheetStyles.modalTextoCancelar}>CERRAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

interface ModalNombrarCoorganizadorProps {
  visible: boolean;
  onClose: () => void;
  evento: DetalleEventoResponse['evento'];
  jugadores: DetalleEventoResponse['jugadores'];
  onAgregarCoorganizador: (jugadorId: number) => void;
}

export const ModalNombrarCoorganizador: React.FC<ModalNombrarCoorganizadorProps> = ({
  visible,
  onClose,
  evento,
  jugadores,
  onAgregarCoorganizador,
}) => {
  const disponibles = jugadores.filter(
    (j) =>
      j.jugadorId !== evento.organizadorId &&
      !evento.coorganizadores?.some((co) => co.jugadorId === j.jugadorId),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={modalSheetStyles.modalOverlay}
      >
        <View style={modalSheetStyles.modalContent}>
          <View style={modalSheetStyles.modalHeaderQr}>
            <MaterialCommunityIcons name="account-multiple-plus" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={modalSheetStyles.modalTitulo}>NOMBRAR CO-ORGANIZADOR</Text>
              <Text style={modalSheetStyles.modalSubtitulo}>
                Otorga facultades de mando a otro operador inscrito:
              </Text>
            </View>
          </View>

          <Text style={modalSheetStyles.inputModalLabel}>OPERADORES INSCRITOS:</Text>
          <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
            {disponibles.map((cand) => (
              <TouchableOpacity
                key={cand.jugadorId}
                style={styles.itemCandidatoLider}
                onPress={() => onAgregarCoorganizador(cand.jugadorId)}
              >
                <MaterialCommunityIcons
                  name="shield-account"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.txtCandidatoNombre}>
                    {cand.alias || `Operador #${cand.jugadorId}`}
                  </Text>
                  <Text style={styles.txtCandidatoRol}>Rol: {cand.rol || 'ASALTO'}</Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 11 }}>
                  + NOMBRAR
                </Text>
              </TouchableOpacity>
            ))}

            {disponibles.length === 0 && (
              <Text style={styles.sinOperadores}>No hay operadores disponibles para nombrar.</Text>
            )}
          </ScrollView>

          <View style={modalSheetStyles.modalBotones}>
            <TouchableOpacity style={modalSheetStyles.modalBotonCancelar} onPress={onClose}>
              <Text style={modalSheetStyles.modalTextoCancelar}>VOLVER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  switchTorniqueteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  filaLimiteCronoEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    backgroundColor: colors.surfaceElevated,
    padding: 8,
    borderRadius: 6,
  },
  itemMotivoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  itemMotivoChipActivo: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  txtMotivoChip: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  txtMotivoChipActivo: {
    color: colors.text,
  },
  btnConfirmarCancelarEvento: {
    flex: 2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minHeight: 44,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txtConfirmarCancelarEvento: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
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
  botonesCantidadRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  btnChipCantidad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingVertical: 8,
  },
  btnChipCantidadActivo: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  txtChipCantidad: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  txtChipCantidadActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  itemCandidatoLider: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  itemCandidatoLiderActivo: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  txtCandidatoNombre: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  txtCandidatoRol: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  sinOperadores: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
