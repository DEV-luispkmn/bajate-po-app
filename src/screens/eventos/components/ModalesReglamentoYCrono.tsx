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
import { DetalleEventoResponse } from '../../../api/eventos.service';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { modalSheetStyles } from './modalSheetStyles';

const LIMITES_CRONO_DEFAULT = [
  { categoria: 'PISTOLA', maxJoules: 1.0, maxFps: 328, medMetros: 0, tipoDisparo: 'SEMI' },
  { categoria: 'ASALTO', maxJoules: 1.49, maxFps: 400, medMetros: 5, tipoDisparo: 'SEMI_AUTO' },
  { categoria: 'SOPORTE', maxJoules: 1.6, maxFps: 415, medMetros: 15, tipoDisparo: 'AUTO_RAFAGA' },
  { categoria: 'DMR', maxJoules: 1.88, maxFps: 450, medMetros: 20, tipoDisparo: 'SEMI' },
  { categoria: 'SNIPER', maxJoules: 2.81, maxFps: 550, medMetros: 30, tipoDisparo: 'CERROJO' },
];

interface ModalLimitesCronoProps {
  visible: boolean;
  onClose: () => void;
  limitesCrono?: any[] | null;
}

export const ModalLimitesCrono: React.FC<ModalLimitesCronoProps> = ({
  visible,
  onClose,
  limitesCrono,
}) => {
  const tabla = limitesCrono && limitesCrono.length > 0 ? limitesCrono : LIMITES_CRONO_DEFAULT;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalSheetStyles.modalOverlay}>
        <View style={[modalSheetStyles.modalContent, { maxHeight: '80%' }]}>
          <View style={modalSheetStyles.modalHeaderQr}>
            <MaterialCommunityIcons name="speedometer" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={modalSheetStyles.modalTitulo}>LÍMITES DE CRONÓGRAFO OFICIAL</Text>
              <Text style={modalSheetStyles.modalSubtitulo}>
                Homologación de réplicas en terreno (BB 0.20g)
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 12 }}>
            <View style={styles.cronoTablaPreMision}>
              <View style={styles.cronoTablaFilaHeader}>
                <Text style={[styles.cronoTablaColHeader, { flex: 1.2 }]}>CATEGORÍA</Text>
                <Text style={[styles.cronoTablaColHeader, { flex: 1 }]}>MAX J</Text>
                <Text style={[styles.cronoTablaColHeader, { flex: 1 }]}>~FPS</Text>
                <Text style={[styles.cronoTablaColHeader, { flex: 0.9 }]}>MED</Text>
                <Text style={[styles.cronoTablaColHeader, { flex: 1.1 }]}>DISPARO</Text>
              </View>
              {tabla.map((lim: any) => (
                <View key={lim.categoria} style={styles.cronoTablaFila}>
                  <Text style={[styles.cronoTablaCol, { flex: 1.2, fontWeight: '800' }]}>
                    {lim.categoria}
                  </Text>
                  <Text style={[styles.cronoTablaColMono, { flex: 1, color: colors.primary }]}>
                    {lim.maxJoules} J
                  </Text>
                  <Text style={[styles.cronoTablaColMono, { flex: 1 }]}>
                    {lim.maxFps ? `${lim.maxFps}` : '-'}
                  </Text>
                  <Text style={[styles.cronoTablaColMono, { flex: 0.9, color: colors.warning }]}>
                    {lim.medMetros}m
                  </Text>
                  <Text
                    style={[
                      styles.cronoTablaCol,
                      { flex: 1.1, fontSize: 11, color: colors.textMuted },
                    ]}
                  >
                    {lim.tipoDisparo || '-'}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.txtAvisoPreMisionCrono, { marginTop: 10 }]}>
              * Toda réplica debe disparar dentro de los parámetros estipulados para su categoría. Las BBs de prueba del cronógrafo son de 0.20g.
            </Text>
          </ScrollView>

          <TouchableOpacity style={modalSheetStyles.modalBotonCancelar} onPress={onClose}>
            <Text style={modalSheetStyles.modalTextoCancelar}>ENTENDIDO / CERRAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

interface ModalTacsopReglamentoProps {
  visible: boolean;
  onClose: () => void;
  evento: DetalleEventoResponse['evento'];
  esMasivo: boolean;
  soyOrganizador: boolean;
  miBando?: DetalleEventoResponse['jugadores'][number] | null;
}

export const ModalTacsopReglamento: React.FC<ModalTacsopReglamentoProps> = ({
  visible,
  onClose,
  evento,
  esMasivo,
  soyOrganizador,
  miBando,
}) => {
  const tabla =
    evento.tacsop?.limitesCrono && evento.tacsop.limitesCrono.length > 0
      ? evento.tacsop.limitesCrono
      : LIMITES_CRONO_DEFAULT;

  const bandosRadio =
    esMasivo && !soyOrganizador && miBando?.bandoId
      ? evento.bandos?.filter((b) => b.id === miBando.bandoId)
      : evento.bandos;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalSheetStyles.modalOverlay}>
        <View style={[modalSheetStyles.modalContent, { maxHeight: '85%' }]}>
          <View style={modalSheetStyles.modalHeaderQr}>
            <MaterialCommunityIcons name="shield-sword" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={modalSheetStyles.modalTitulo}>TACSOP & REGLAMENTO DE MISIÓN</Text>
              <Text style={modalSheetStyles.modalSubtitulo}>
                Preset: {evento.tacsop?.presetTipo || 'ESTÁNDAR'}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <Text style={styles.tacsopModalSeccion}>SISTEMA MÉDICO & VIDAS</Text>
            <View style={styles.tacsopModalCard}>
              <Text style={styles.txtTacsopFila}>
                • Vidas por operador:{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.vidasMax ?? 2} vidas
                </Text>
              </Text>
              <Text style={styles.txtTacsopFila}>
                • Torniquetes requeridos:{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.requiereTorniquete
                    ? `SÍ (${evento.tacsop?.torniquetesPorJugador ?? 1} por operador)`
                    : 'NO'}
                </Text>
              </Text>
              <Text style={styles.txtTacsopFila}>
                • Tiempo de desangrado (bleed-out):{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.tiempoDesangradoMin ?? 3} minutos
                </Text>
              </Text>
              <Text style={styles.txtTacsopFila}>
                • Quién revive:{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.soloMedicoRevive
                    ? 'Solo Médico con rol'
                    : 'Cualquier operador (Buddy Aid)'}
                </Text>
              </Text>
              <Text style={styles.txtTacsopFila}>
                • Pañuelo Rojo/Naranja de Muerto:{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.requierePanueloRojo !== false
                    ? 'OBLIGATORIO SIEMPRE'
                    : 'RECOMENDADO'}
                </Text>
              </Text>
              <Text style={styles.txtTacsopFila}>
                • Luz Roja Nocturna:{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.luzRojaNocturna || 'RECOMENDADA'}
                </Text>
              </Text>
            </View>

            <Text style={styles.tacsopModalSeccion}>MUNICIÓN Y CARGADORES</Text>
            <View style={styles.tacsopModalCard}>
              <Text style={styles.txtTacsopFila}>
                • Tipo de cargadores:{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.tipoCargadores || 'LIBRE'}
                </Text>
              </Text>
              <Text style={styles.txtTacsopFila}>
                • Límite de munición BBs:{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.limiteMunicionBbs
                    ? `${evento.tacsop.limiteMunicionBbs} BBs`
                    : 'Sin límite'}
                </Text>
              </Text>
              <Text style={styles.txtTacsopFila}>
                • Pirotecnia sonora / detonaciones:{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.pirotecniaPermitida ? 'PERMITIDA' : 'PROHIBIDA'}
                </Text>
              </Text>
              <Text style={styles.txtTacsopFila}>
                • Granadas de humo frío:{' '}
                <Text style={styles.txtTacsopHighlight}>
                  {evento.tacsop?.humoFrioPermitido !== false
                    ? 'PERMITIDO (Solo frío)'
                    : 'PROHIBIDO'}
                </Text>
              </Text>
            </View>

            <Text style={styles.tacsopModalSeccion}>LÍMITES DE CRONÓGRAFO (JOULES & MED)</Text>
            <View style={styles.tacsopModalCard}>
              {tabla.map((lim: any) => (
                <View key={lim.categoria} style={styles.filaModalCronoItem}>
                  <Text style={styles.txtCatCronoModal}>{lim.categoria}:</Text>
                  <Text style={styles.txtValCronoModal}>
                    {lim.maxJoules} J (~{lim.maxFps} FPS) | MED: {lim.medMetros}m ({lim.tipoDisparo})
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.tacsopModalSeccion}>COMUNICACIONES BAOFENG UV-5R</Text>
            <View style={styles.tacsopModalCard}>
              <Text style={styles.txtTacsopFila}>
                • Canal Emergencia (Blind Man):{' '}
                <Text style={[styles.txtTacsopFrec, { color: colors.danger }]}>
                  {evento.tacsop?.frecuenciaEmergencia || '462.5625 MHz'}
                </Text>
              </Text>
              <Text style={styles.txtTacsopFila}>
                • Canal Staff / Control:{' '}
                <Text style={styles.txtTacsopFrec}>
                  {evento.tacsop?.frecuenciaStaff || '462.5875 MHz'} (CTCSS:{' '}
                  {evento.tacsop?.subtonoStaff || '67.0 Hz'})
                </Text>
              </Text>
              {bandosRadio?.map((b) => (
                <Text key={b.id} style={styles.txtTacsopFila}>
                  • Frecuencia {b.nombre}:{' '}
                  <Text style={styles.txtTacsopFrec}>
                    {b.frecuenciaRadio || '462.6125 MHz'}{' '}
                    {b.subtonoRadio ? `(CTCSS: ${b.subtonoRadio})` : ''}
                  </Text>
                </Text>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={modalSheetStyles.btnCerrarModalTacsop} onPress={onClose}>
            <Text style={modalSheetStyles.txtBtnCerrarModalTacsop}>
              ENTENDIDO, VOLVER A LA OPERACIÓN
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

interface ModalCronografoStaffProps {
  visible: boolean;
  onClose: () => void;
  jugadores: DetalleEventoResponse['jugadores'];
  cronoJugadorId: number | null;
  setCronoJugadorId: (id: number | null) => void;
  cronoTipoReplica: string;
  setCronoTipoReplica: (val: string) => void;
  cronoCategoria: string;
  setCronoCategoria: (val: string) => void;
  cronoJoules: string;
  setCronoJoules: (val: string) => void;
  cronoFps: string;
  setCronoFps: (val: string) => void;
  cronoGramaje: string;
  setCronoGramaje: (val: string) => void;
  cronoModelo: string;
  setCronoModelo: (val: string) => void;
  cronoAprobado: boolean;
  setCronoAprobado: (val: boolean) => void;
  guardandoCrono: boolean;
  onGuardarCrono: () => void;
}

export const ModalCronografoStaff: React.FC<ModalCronografoStaffProps> = ({
  visible,
  onClose,
  jugadores,
  cronoJugadorId,
  setCronoJugadorId,
  cronoTipoReplica,
  setCronoTipoReplica,
  cronoCategoria,
  setCronoCategoria,
  cronoJoules,
  setCronoJoules,
  cronoFps,
  setCronoFps,
  cronoGramaje,
  setCronoGramaje,
  cronoModelo,
  setCronoModelo,
  cronoAprobado,
  setCronoAprobado,
  guardandoCrono,
  onGuardarCrono,
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
      <View style={[modalSheetStyles.modalContent, { maxHeight: '90%' }]}>
        <Pressable style={modalSheetStyles.modalHeaderQr} onPress={Keyboard.dismiss} accessible={false}>
          <MaterialCommunityIcons name="speedometer" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={modalSheetStyles.modalTitulo}>CRONÓGRAFO OFICIAL (STAFF)</Text>
            <Text style={modalSheetStyles.modalSubtitulo}>
              Registra y homologa réplicas en terreno
            </Text>
          </View>
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ marginVertical: 6, width: '100%' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <Text style={modalSheetStyles.inputModalLabel}>SELECCIONA EL OPERADOR:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {jugadores.map((j) => (
                <TouchableOpacity
                  key={j.jugadorId}
                  style={[
                    styles.chipJugadorCrono,
                    cronoJugadorId === j.jugadorId && styles.chipJugadorCronoActivo,
                  ]}
                  onPress={() => setCronoJugadorId(j.jugadorId)}
                >
                  <Text
                    style={[
                      styles.txtChipJugadorCrono,
                      cronoJugadorId === j.jugadorId && styles.txtChipJugadorCronoActivo,
                    ]}
                  >
                    {j.alias || `Op #${j.jugadorId}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={modalSheetStyles.inputModalLabel}>TIPO DE RÉPLICA:</Text>
            <View style={styles.chipsRowSelectorCrono}>
              {(['PRIMARIA', 'PRIMARIA_2', 'SECUNDARIA'] as const).map((tr) => (
                <TouchableOpacity
                  key={tr}
                  style={[styles.chipTipoRep, cronoTipoReplica === tr && styles.chipTipoRepActivo]}
                  onPress={() => setCronoTipoReplica(tr)}
                >
                  <Text
                    style={[
                      styles.txtChipTipoRep,
                      cronoTipoReplica === tr && styles.txtChipTipoRepActivo,
                    ]}
                  >
                    {tr === 'PRIMARIA'
                      ? 'PRIMARIA'
                      : tr === 'PRIMARIA_2'
                      ? 'PRIMARIA 2'
                      : 'SECUNDARIA'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={modalSheetStyles.inputModalLabel}>CATEGORÍA:</Text>
            <View style={styles.chipsRowSelectorCrono}>
              {['PISTOLA', 'ASALTO', 'SOPORTE', 'DMR', 'SNIPER'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chipTipoRep, cronoCategoria === cat && styles.chipTipoRepActivo]}
                  onPress={() => setCronoCategoria(cat)}
                >
                  <Text
                    style={[
                      styles.txtChipTipoRep,
                      cronoCategoria === cat && styles.txtChipTipoRepActivo,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={modalSheetStyles.inputModalLabel}>ENERGÍA (JOULES):</Text>
                <TextInput
                  style={[modalSheetStyles.inputModal, styles.inputMonoValor]}
                  placeholder="Ej: 1.14"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={cronoJoules}
                  onChangeText={setCronoJoules}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalSheetStyles.inputModalLabel}>FPS (OPCIONAL):</Text>
                <TextInput
                  style={[modalSheetStyles.inputModal, styles.inputMonoValor]}
                  placeholder="Ej: 350"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={cronoFps}
                  onChangeText={setCronoFps}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={modalSheetStyles.inputModalLabel}>BBs (GRAMOS):</Text>
                <TextInput
                  style={[modalSheetStyles.inputModal, styles.inputMonoValor]}
                  placeholder="0.25"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={cronoGramaje}
                  onChangeText={setCronoGramaje}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalSheetStyles.inputModalLabel}>MODELO (OPCIONAL):</Text>
                <TextInput
                  style={modalSheetStyles.inputModal}
                  placeholder="Ej: M4 MK18"
                  placeholderTextColor={colors.textMuted}
                  value={cronoModelo}
                  onChangeText={setCronoModelo}
                />
              </View>
            </View>

            <View style={styles.switchAprobadoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txtAprobadoTitulo}>ESTADO DE HOMOLOGACIÓN</Text>
                <Text
                  style={[
                    styles.txtAprobadoSub,
                    { color: cronoAprobado ? colors.success : colors.danger },
                  ]}
                >
                  {cronoAprobado
                    ? 'Aprobada para entrar a la cancha'
                    : 'Rechazada (Sobrepasa el límite)'}
                </Text>
              </View>
              <Switch
                value={cronoAprobado}
                onValueChange={setCronoAprobado}
                trackColor={{ false: colors.danger, true: colors.primary }}
              />
            </View>
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
              guardandoCrono && modalSheetStyles.botonDeshabilitado,
            ]}
            onPress={onGuardarCrono}
            disabled={guardandoCrono}
          >
            {guardandoCrono ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={modalSheetStyles.modalTextoConfirmar}>GUARDAR CRONAJE</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const styles = StyleSheet.create({
  cronoTablaPreMision: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
  },
  cronoTablaFilaHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 4,
    marginBottom: 4,
  },
  cronoTablaColHeader: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  cronoTablaFila: {
    flexDirection: 'row',
    paddingVertical: 3,
    alignItems: 'center',
  },
  cronoTablaCol: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  cronoTablaColMono: {
    color: colors.text,
    fontSize: 11,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
  },
  txtAvisoPreMisionCrono: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  tacsopModalSeccion: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 4,
  },
  tacsopModalCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginBottom: 8,
  },
  txtTacsopFila: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 18,
  },
  txtTacsopHighlight: {
    color: colors.text,
    fontWeight: '800',
  },
  txtTacsopFrec: {
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
  },
  filaModalCronoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  txtCatCronoModal: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  txtValCronoModal: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
  },
  chipJugadorCrono: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  chipJugadorCronoActivo: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  txtChipJugadorCrono: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  txtChipJugadorCronoActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  chipsRowSelectorCrono: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chipTipoRep: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipTipoRepActivo: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  txtChipTipoRep: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  txtChipTipoRepActivo: {
    color: colors.primary,
    fontWeight: '900',
  },
  inputMonoValor: {
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
  },
  switchAprobadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginTop: 8,
  },
  txtAprobadoTitulo: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  txtAprobadoSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
});
