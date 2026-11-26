import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Cancha } from '../../../api/canchas.service';
import { colors } from '../../../theme/colors';

interface ModalFichaCanchaProps {
  visible: boolean;
  cancha: Cancha | null;
  esAdmin: boolean;
  onCerrar: () => void;
  onAbrirGoogleMaps: (cancha: Cancha) => void;
  onAbrirFormEditar: (cancha: Cancha) => void;
  onAbrirModalSugerir: (cancha: Cancha) => void;
}

export const ModalFichaCancha: React.FC<ModalFichaCanchaProps> = ({
  visible,
  cancha,
  esAdmin,
  onCerrar,
  onAbrirGoogleMaps,
  onAbrirFormEditar,
  onAbrirModalSugerir,
}) => {
  if (!cancha) return null;

  const esAbierta = cancha.esAbierta !== false && !cancha.adminEquipoId;
  const tieneCoordenadas = cancha.latitud !== undefined && cancha.longitud !== undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContenido}>
          {/* Cabecera de la Ficha */}
          <View style={styles.detalleModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detalleEyebrow}>FICHA TÁCTICA DEL CAMPO</Text>
              <Text style={styles.detalleTitulo}>{cancha.nombre}</Text>
            </View>
            <TouchableOpacity
              style={styles.btnCerrarModal}
              onPress={onCerrar}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ marginBottom: 12 }} showsVerticalScrollIndicator={false}>
            {/* Badges de Estado y Pertenencia */}
            <View style={styles.detalleBadgesRow}>
              {cancha.estado === 'EN_REVISION' ? (
                <View style={[styles.detalleBadge, styles.badgeEnRevision]}>
                  <MaterialCommunityIcons name="clock-outline" size={11} color={colors.warning} style={{ marginRight: 4 }} />
                  <Text style={styles.textoBadgeEnRevision}>EN REVISIÓN TÉCNICA</Text>
                </View>
              ) : (
                <View style={[styles.detalleBadge, styles.badgeActiva]}>
                  <MaterialCommunityIcons name="check-circle-outline" size={12} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={styles.textoBadgeActiva}>CAMPO ACTIVO</Text>
                </View>
              )}

              {esAbierta ? (
                <View style={[styles.detalleBadge, styles.badgeAbierta]}>
                  <MaterialCommunityIcons name="earth" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.textoBadgeAdmin, styles.textoAbierta]}>CANCHA ABIERTA</Text>
                </View>
              ) : (
                <View style={[styles.detalleBadge, styles.badgeEscuadra]}>
                  <MaterialCommunityIcons name="shield-account" size={12} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={[styles.textoBadgeAdmin, styles.textoEscuadra]}>
                    {cancha.equipoAdminNombre ? `EQUIPO: ${cancha.equipoAdminNombre}` : 'CAMPO DE EQUIPO'}
                  </Text>
                </View>
              )}
            </View>

            {/* Sección: Ubicación & Coordenadas */}
            <View style={styles.detalleSeccionBox}>
              <Text style={styles.detalleSeccionTitulo}>UBICACIÓN & GEOLOCALIZACIÓN</Text>
              <View style={styles.detalleItemRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.detalleItemTxt}>
                  {cancha.region || 'Chile'}
                  {cancha.ciudad ? ` • ${cancha.ciudad}` : ''}
                </Text>
              </View>
              <View style={[styles.detalleItemRow, { marginTop: 4 }]}>
                <MaterialCommunityIcons name="crosshairs-gps" size={16} color={colors.secondary} style={{ marginRight: 6 }} />
                <Text style={[styles.detalleItemTxt, { fontVariant: ['tabular-nums'] }]}>
                  {tieneCoordenadas
                    ? `Coordenadas: ${Number(cancha.latitud).toFixed(5)}, ${Number(cancha.longitud).toFixed(5)}`
                    : 'Coordenadas: Referencial por nombre'}
                </Text>
              </View>
            </View>

            {/* Sección: Descripción del Terreno */}
            <View style={styles.detalleSeccionBox}>
              <Text style={styles.detalleSeccionTitulo}>DESCRIPCIÓN DEL CAMPO & TERRENO</Text>
              <Text style={styles.detalleDescTxt}>
                {cancha.descripcion
                  ? cancha.descripcion
                  : 'Sin descripción detallada del terreno registrada aún.'}
              </Text>
            </View>

            {/* Sección: Régimen de Juego */}
            <View style={styles.detalleSeccionBox}>
              <Text style={styles.detalleSeccionTitulo}>TIPO DE ACCESO / COMANDANCIA</Text>
              <Text style={styles.detalleDescTxt}>
                {esAbierta
                  ? 'Este campo es Comunitario y Abierto: cualquier operador u organizador puede planificar partidas y pichangas aquí libremente.'
                  : `Este campo pertenece al equipo ${cancha.equipoAdminNombre || 'administrador'}. Se recomienda coordinar con los líderes del equipo antes de planificar un versus oficial.`}
              </Text>
            </View>

            {/* Sección: Galería Fotográfica */}
            <View style={styles.detalleSeccionBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.detalleSeccionTitulo}>
                  EVIDENCIAS Y FOTOGRAFÍAS ({cancha.fotos?.length || 0})
                </Text>
                <MaterialCommunityIcons name="camera" size={16} color={colors.primary} />
              </View>

              {cancha.fotos && cancha.fotos.length > 0 ? (
                cancha.fotos.map((foto, index) => (
                  <View key={index} style={styles.detalleFotoCard}>
                    <Image
                      source={{ uri: foto.url }}
                      style={styles.detalleFotoImg}
                      resizeMode="cover"
                    />
                    {foto.descripcion ? (
                      <View style={styles.detalleFotoDescBox}>
                        <Text style={styles.detalleFotoDescTxt}>{foto.descripcion}</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.sinFotosBox}>
                  <MaterialCommunityIcons name="image-off-outline" size={28} color={colors.textMuted} />
                  <Text style={styles.sinFotosTxt}>
                    No hay fotos registradas para este campo de juego.
                  </Text>
                </View>
              )}
            </View>

            {/* Botón Principal: Abrir Google Maps */}
            <TouchableOpacity
              style={styles.btnAbrirMapsGrande}
              activeOpacity={0.85}
              onPress={() => onAbrirGoogleMaps(cancha)}
            >
              <MaterialCommunityIcons name="google-maps" size={20} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={styles.txtBtnAbrirMapsGrande}>ABRIR EN GOOGLE MAPS</Text>
            </TouchableOpacity>

            {/* Botón de Edición (Admin) o Sugerencia (Jugador) */}
            <View style={styles.detalleBotonesRow}>
              {esAdmin ? (
                <TouchableOpacity
                  style={styles.btnDetalleEditar}
                  activeOpacity={0.85}
                  onPress={() => {
                    onCerrar();
                    onAbrirFormEditar(cancha);
                  }}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color={colors.onPrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnDetalleEditar}>EDITAR FICHA (COMANDANCIA)</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.btnDetalleSugerir}
                  activeOpacity={0.85}
                  onPress={() => {
                    onCerrar();
                    onAbrirModalSugerir(cancha);
                  }}
                >
                  <MaterialCommunityIcons name="comment-edit-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.txtBtnDetalleSugerir}>SUGERIR CAMBIOS O NUEVAS FOTOS</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalBtnSecundario}
            onPress={onCerrar}
            activeOpacity={0.8}
          >
            <Text style={styles.modalTxtSecundario}>CERRAR FICHA</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 16,
  },
  modalContenido: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  detalleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detalleEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  detalleTitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  btnCerrarModal: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detalleBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  detalleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeEnRevision: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoBadgeEnRevision: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeActiva: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoBadgeActiva: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '900',
  },
  badgeAbierta: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoBadgeAdmin: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textoAbierta: {
    color: colors.primary,
  },
  badgeEscuadra: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoEscuadra: {
    color: colors.success,
  },
  detalleSeccionBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  detalleSeccionTitulo: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detalleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detalleItemTxt: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  detalleDescTxt: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  detalleFotoCard: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.card,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  detalleFotoImg: {
    width: '100%',
    height: 160,
  },
  detalleFotoDescBox: {
    padding: 8,
  },
  detalleFotoDescTxt: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  sinFotosBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  sinFotosTxt: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  btnAbrirMapsGrande: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  txtBtnAbrirMapsGrande: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  detalleBotonesRow: {
    marginBottom: 10,
  },
  btnDetalleEditar: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtBtnDetalleEditar: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnDetalleSugerir: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtBtnDetalleSugerir: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  modalBtnSecundario: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalTxtSecundario: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
});
