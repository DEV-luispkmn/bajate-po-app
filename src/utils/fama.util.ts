/**
 * Utilidades para el Sistema de Fama (Karma/Reputación) de Operadores.
 *
 * Balanceada (fama ~ 0):
 * - Borde del perfil: Naranja táctico (#E06D28)
 * - Nombre de perfil / inicio: Blanco (#FFFFFF)
 *
 * Fama positiva (> 0):
 * - Transición progresiva desde verde esmeralda hasta dorado legendario (#FFD700).
 *
 * Fama negativa (< 0):
 * - Transición progresiva desde naranja oscuro hasta rojo infierno (#991B1B / #DC2626).
 */
import { colors } from '../theme/colors';

export interface EstiloFama {
  colorBorde: string;
  colorTexto: string;
  nivel: 'LEGENDARIO' | 'DISTINGUIDO' | 'CONFIABLE' | 'NEUTRAL' | 'CUESTIONADO' | 'SOSPECHOSO' | 'INFAME';
  descripcion: string;
}

export function obtenerEstiloFama(fama: number = 0): EstiloFama {
  const val = Number(fama) || 0;

  // Estado Neutral / Balanceado (sin elogios ni reportes o cerca de cero)
  if (Math.abs(val) < 0.01) {
    return {
      colorBorde: colors.primary, // Naranja táctico estándar
      colorTexto: colors.text, // Blanco estándar
      nivel: 'NEUTRAL',
      descripcion: 'Operador Balanceado',
    };
  }

  // FAMA POSITIVA (> 0): de verde a dorado
  if (val > 0) {
    if (val >= 6.0) {
      return {
        colorBorde: colors.trophyGold, // Dorado legendario
        colorTexto: '#FFE082', // Oro claro radiante
        nivel: 'LEGENDARIO',
        descripcion: 'Operador Legendario',
      };
    }
    if (val >= 3.0) {
      return {
        colorBorde: colors.warning, // Ámbar dorado
        colorTexto: '#FCD34D', // Dorado cálido
        nivel: 'DISTINGUIDO',
        descripcion: 'Operador Distinguido',
      };
    }
    if (val >= 1.0) {
      return {
        colorBorde: colors.success, // Verde esmeralda intenso
        colorTexto: '#6EE7B7', // Verde menta
        nivel: 'CONFIABLE',
        descripcion: 'Operador Ejemplar',
      };
    }
    // 0 < val < 1.0
    return {
      colorBorde: '#22C55E', // Verde táctico
      colorTexto: '#86EFAC', // Verde suave
      nivel: 'CONFIABLE',
      descripcion: 'Operador Confiable',
    };
  }

  // FAMA NEGATIVA (< 0): de naranja oscuro a rojo infierno
  if (val <= -6.0) {
    return {
      colorBorde: colors.dangerDark, // Rojo infierno oscuro
      colorTexto: colors.danger, // Rojo infierno
      nivel: 'INFAME',
      descripcion: 'Operador Infame',
    };
  }
  if (val <= -3.0) {
    return {
      colorBorde: '#DC2626', // Rojo carmesí alerta
      colorTexto: '#F87171', // Rojo claro
      nivel: 'SOSPECHOSO',
      descripcion: 'Operador Sospechoso',
    };
  }
  if (val <= -1.0) {
    return {
      colorBorde: '#EA580C', // Bermellón óxido
      colorTexto: '#FB923C', // Naranja cobrizo
      nivel: 'CUESTIONADO',
      descripcion: 'Operador en Observación',
    };
  }
  // -1.0 < val < 0
  return {
    colorBorde: colors.warning, // Naranja oscuro
    colorTexto: '#FDBA74', // Naranja tenue
    nivel: 'CUESTIONADO',
    descripcion: 'Operador Cuestionado',
  };
}
