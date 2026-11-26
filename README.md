# Bájate Po — Aplicación móvil

Aplicación móvil multiplataforma de **Bájate Po**, construida con React Native y TypeScript para la comunidad de airsoft en Chile. Este repositorio corresponde al cliente móvil (`bajate-po-app`), conectado a la API REST y servidor Socket.io de `bajate-po-backend`.

## Stack móvil

- **React Native** `0.88.1` y **React** `19.3.0`
- **TypeScript** `~6.0.3`
- **Navegación:** React Navigation 7 (`native`, `native-stack`, `bottom-tabs`)
- **Tiempo real y almacenamiento seguro:** `socket.io-client`, `expo-secure-store`
- **Capacidades nativas:** cámara QR (`expo-camera`), galería de imágenes (`expo-image-picker`), notificaciones locales/push (`expo-notifications`), selector nativo de fecha y hora (`@react-native-community/datetimepicker`)
- **Iconografía:** `@expo/vector-icons` (MaterialCommunityIcons)

## Requisitos

- Node.js y npm
- Android Studio / emulador Android, o macOS con Xcode para simulador iOS, o dispositivo físico compatible
- Git

## Funcionalidades principales

- **Autenticación y registro:** inicio de sesión con control de cooldown, registro por pasos (credenciales, foto, región y roles tácticos) y persistencia de token JWT en `expo-secure-store`.
- **Inicio y notificaciones (`HomeScreen`):** radar de operaciones activas, ingreso rápido por código táctico (`ModalCodigoTactico`), campana y modal de notificaciones en tiempo real.
- **Mapa y Canchas (`CanchasScreen`, `ModalFichaCancha`):** listado y filtrado por región, modalidad (abierta o de equipo), apertura en Google Maps, registro/edición de campos con coordenadas GPS (soporte iOS para signos `-` y `.`) y envío de sugerencias de cambios con fotografías adjuntas.
- **Equipos (`EquiposScreen`, `ModalFichaEquipo`):** exploración y búsqueda de escuadrones, ingreso por código, postulaciones con mensaje y contacto, y panel de gestión para Team Leader y Fundador (solicitudes, traspaso de liderazgo, edición y disolución).
- **Eventos y Partidas (`CrearEventoScreen`, `EventoDetalleScreen`, `EscanerQrScreen`, `PartidaEnVivoScreen`):**
  - Creación de pichangas, versus y eventos masivos/milsim con selector de fecha/hora adaptado a modo oscuro en iOS y Android (`TacticalDateTimePicker`).
  - Configuración TACSOP, límites de crono, bandos, escuadras, fases, mesa de cronometraje (`MesaCronometrajeFase1`), misiones (`MisionesCombateFase2`) y escáner QR de bandos.
  - Gestión de partidas en vivo con rondas en tiempo real, votación MVP y evaluación de fama.
- **Perfil y Ajustes (`PerfilScreen`, `HistorialCompletoScreen`, `MedalleroCompletoScreen`, `AjustesScreen`):** edición de ficha y avatar, historial completo de partidas, medallero de logros y rangos, control de notificaciones y buzón de tickets a administración.
- **Usabilidad móvil e iOS:** modales con confirmaciones tácticas reutilizables (`ModalConfirmacionTactico`) y manejo consistente de cierre de teclado (`KeyboardAvoidingView`, cierre al tocar fuera, arrastrar o confirmar).

## Levantar entorno local completo

### 1. Iniciar MySQL y Backend

Desde la carpeta raíz del workspace:

```bash
docker compose up -d mysql_bajatepo
```

Luego, en `bajate-po-backend`, configura su `.env` (puerto `8080` por defecto) e inicia el servidor:

```bash
npm ci
npm run start:dev
```

### 2. Instalar dependencias e iniciar la app móvil

Desde `bajate-po-app`:

```bash
npm ci
npm start
```

También puedes usar directamente:

```bash
npm run android
npm run ios
npm run web
```

### Conexión con la API

La resolución automática de URL en `src/api/client.ts` soporta:

- Variable opcional `EXPO_PUBLIC_API_URL` en entorno local.
- Detección dinámica de la IP del equipo anfitrión cuando se ejecuta en red local.
- `http://localhost:8080` para entorno web/simulador local.

| Entorno | Dirección del backend |
| --- | --- |
| Emulador Android | `http://10.0.2.2:8080` |
| Simulador iOS / Web | `http://localhost:8080` |
| Dispositivo físico (misma red Wi-Fi) | `http://<IP-local-del-equipo>:8080` |

## Estructura principal

```text
bajate-po-app/
├── App.tsx                         # Raíz de navegación, AuthContext y SocketContext
├── app.json                        # Configuración de app, permisos y tema oscuro
├── eas.json                        # Perfiles de compilación EAS (development, preview, production)
├── index.ts                        # Punto de entrada
├── assets/                         # Íconos y recursos gráficos
├── src/
│   ├── api/                        # Cliente HTTP y servicios por dominio
│   ├── components/                 # DateTimePicker táctico y modales compartidos
│   ├── context/                    # AuthContext y SocketContext
│   ├── navigation/                 # Stack raíz, Bottom Tabs y ref de navegación
│   ├── screens/
│   │   ├── ajustes/                # Ajustes y buzón de tickets
│   │   ├── auth/                   # Login y registro
│   │   ├── canchas/                # Canchas, ficha y sugerencias
│   │   ├── equipos/                # Equipos, postulaciones y panel TL
│   │   ├── eventos/                # Creación, detalle, QR, crono y misiones
│   │   ├── home/                   # Inicio y operaciones activas
│   │   ├── partidas/               # Partida en vivo, MVP y fama
│   │   └── perfil/                 # Perfil, historial completo y medallero
│   ├── services/                   # Notificaciones del dispositivo
│   ├── theme/                      # Paleta de colores tácticos
│   └── utils/                      # Utilidades de dominio (ej. fama)
├── package.json
└── tsconfig.json
```

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia el servidor de desarrollo |
| `npm run android` | Abre la app en Android |
| `npm run ios` | Abre la app en simulador iOS |
| `npm run web` | Abre la app en navegador web |
| `npx tsc --noEmit` | Verifica tipos TypeScript |

## Dependencias del proyecto

Las versiones exactas quedan registradas en `package-lock.json`. Para instalaciones reproducibles, usa `npm ci`.
