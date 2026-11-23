import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// 🌍 URL oficial de tu túnel Ngrok para cuando salgas a probar fuera de casa
export const NGROK_API_URL = 'https://scholar-poise-hardcopy.ngrok-free.dev';

// ⚙️ SWITCH DE ENTORNO:
// false = MODO LOCAL (desarrollo rápido en casa por Wi-Fi, cambios instantáneos con Fast Refresh)
// true  = MODO NGROK (para probar fuera de casa con datos móviles)
export const USAR_NGROK = false;

export function getApiUrl(): string {
  // 1. Si USAR_NGROK está activo, usamos el túnel público https
  if (USAR_NGROK) {
    return NGROK_API_URL.replace(/\/$/, '');
  }

  // 2. Si se define variable local en .env y no es ngrok, se respeta
  if (process.env.EXPO_PUBLIC_API_URL && !process.env.EXPO_PUBLIC_API_URL.includes('ngrok')) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:8080';
  }

  // 3. Intentar obtener la IP del host dinámicamente desde Expo (Metro bundler)
  // hostUri viene típicamente como "192.168.1.87:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8080`;
    }
  }

  // 4. Fallback con la IP local de tu computador en la red (Ethernet/Wi-Fi)
  return 'http://192.168.1.87:8080';
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
    'ngrok-skip-browser-warning': 'true', // Permite saltar la página intermedia de Ngrok Free
    'User-Agent': 'BajatePoApp/1.0',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;

  if (__DEV__) {
    console.log(`[API] Solicitando: ${url}`);
  }

  // Temporizador de corte duro (8s) para que la app móvil nunca se congele
  const controller = new AbortController();
  const timeoutMs = 8000;
  let timeoutId: any;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Tiempo de espera agotado al conectar con el servidor en ${baseUrl}. Asegúrate de que el backend y ngrok estén corriendo.`));
    }, timeoutMs);
  });

  const fetchPromise = (async () => {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        (Array.isArray(data?.message) ? data.message.join(', ') : 'Error en la petición');
      const err: any = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      err.segundosRestantes = data?.segundosRestantes;
      throw err;
    }

    return data as T;
  })();

  try {
    const res = await Promise.race([fetchPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(
        `Tiempo de espera agotado al conectar con el servidor en ${baseUrl}. Asegúrate de que el backend y ngrok estén activos.`,
      );
    }
    throw new Error(
      error.message || `No se pudo conectar al servidor en ${baseUrl}. Verifica tu conexión a internet o el túnel de ngrok.`,
    );
  }
}
