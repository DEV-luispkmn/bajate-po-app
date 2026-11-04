import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export function getApiUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  // 1. Intentar obtener la IP del host dinámicamente desde Expo
  // hostUri viene típicamente como "192.168.1.87:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000`;
    }
  }

  // 2. Fallback con la IP local de tu computador en la red (Ethernet)
  return 'http://192.168.1.87:3000';
}

export const DEFAULT_API_URL = getApiUrl();

const TOKEN_KEY = 'bajate_po_jwt_token';

export async function guardarToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function obtenerToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function borrarToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await obtenerToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;

  // Temporizador de corte para que no se quede pegado infinitamente
  const controller = new AbortController();
  const timeoutMs = 12000; // 12 segundos
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        (Array.isArray(data?.message) ? data.message.join(', ') : 'Error en la petición');
      throw new Error(errorMsg);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(
        `Tiempo de espera agotado al conectar con el servidor en ${baseUrl}. Asegúrate de que el backend esté corriendo y que tu celular esté en el mismo Wi-Fi.`,
      );
    }
    throw new Error(
      error.message || `No se pudo conectar al servidor en ${baseUrl}. Verifica tu red local.`,
    );
  }
}
