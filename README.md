# Bájate Po — Aplicación móvil

Aplicación móvil multiplataforma de **Bájate Po**, desarrollada con Expo y React Native. Este README corresponde al proyecto `bajate-po-app`.

> **Estado actual:** el proyecto conserva la pantalla inicial de Expo/React Native. La conexión con la API todavía no está implementada en la aplicación.

## Stack móvil

- **Expo SDK:** `~58.0.21`
- **React Native:** `0.88.1`
- **React:** `19.3.0`
- **TypeScript:** `~6.0.3`
- **Navegación:** React Navigation 7 (`native` y `native-stack`)
- **Entornos:** Android, iOS y web (Expo)

## Requisitos

- Node.js y npm, en versiones compatibles con Expo SDK 58.
- Android Studio y un emulador Android, o un dispositivo Android con Expo Go.
- Para ejecutar el simulador o generar builds locales de iOS: macOS y Xcode.
- Git para clonar el repositorio.

## Instalación y ejecución móvil

Desde la raíz del repositorio móvil:

```bash
npm ci
npm start
```

Cuando se abra Expo:

- Presiona `a` para abrir la aplicación en un emulador Android conectado.
- Presiona `i` para abrir el simulador de iOS (requiere macOS y Xcode).
- Presiona `w` para abrir la versión web.
- Escanea el código QR con Expo Go para ejecutarla en un dispositivo físico.

También se pueden usar los scripts definidos en `package.json`:

```bash
npm run android
npm run ios
npm run web
```

Para reiniciar el servidor borrando la caché de Metro:

```bash
npx expo start --clear
```

## Levantar base de datos y backend

El workspace de desarrollo contiene el proyecto móvil, `bajate-po-backend` y un `docker-compose.yml` en la carpeta raíz. Si se trabaja con esos directorios juntos:

### 1. Iniciar MySQL

Desde la carpeta que contiene `docker-compose.yml`:

```bash
docker compose up -d mysql_bajatepo
```

El servicio publica MySQL en el puerto `3306` y crea la base `bajatepo_db`. Las credenciales de desarrollo están definidas en el Compose local; no las uses en producción ni publiques secretos en el repositorio.

### 2. Iniciar el backend

En otra terminal, desde `bajate-po-backend`:

```bash
npm ci
npm run start:dev
```

El backend NestJS escucha por defecto en el puerto `3000`. Su archivo `.env` debe definir `DATABASE_URL` con una URL MySQL compatible con la configuración local, por ejemplo:

```dotenv
DATABASE_URL="mysql://<usuario>:<contraseña>@localhost:3306/bajatepo_db"
```

No sobrescribas ni compartas el `.env` con credenciales personales. La URL debe coincidir con las credenciales configuradas para MySQL.

### 3. Iniciar la aplicación móvil

En otra terminal, desde `bajate-po-app`:

```bash
npm ci
npm start
```

### Acceso a la API desde un dispositivo

Cuando se implemente la integración de la app con la API, `localhost` debe apuntar al equipo correcto:

| Entorno | Host habitual para llegar al backend |
| --- | --- |
| Emulador Android de Android Studio | `10.0.2.2` |
| Simulador iOS | `localhost` |
| Dispositivo físico | IP local de la computadora en la misma red Wi-Fi |

La aplicación todavía no define una variable de entorno ni consume endpoints; estos valores son una referencia para la futura integración. No uses `localhost` como host de API desde un teléfono físico.

## Estructura principal

```text
bajate-po-app/
├── App.tsx          # Pantalla de entrada
├── app.json         # Configuración de Expo e íconos
├── index.ts         # Punto de entrada
├── assets/          # Recursos gráficos
├── package.json     # Scripts y dependencias
└── tsconfig.json    # Configuración de TypeScript
```

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia el servidor de desarrollo de Expo |
| `npm run android` | Inicia Expo y abre Android |
| `npm run ios` | Inicia Expo y abre iOS |
| `npm run web` | Inicia Expo para web |

## Solución de problemas

- **El teléfono no se conecta a Expo:** comprueba que el teléfono y la computadora estén en la misma red. Si la red bloquea la conexión local, prueba el modo túnel desde Expo.
- **Android no encuentra el backend:** usa `10.0.2.2` en el emulador Android; desde un dispositivo físico usa la IP local de la computadora.
- **Cambios no aparecen o Metro falla:** detén Expo y vuelve a iniciarlo con `npx expo start --clear`.
- **`npm ci` falla:** verifica que estés en la carpeta `bajate-po-app` y que uses una versión de Node compatible con Expo SDK 58.

## Dependencias del proyecto

Las versiones exactas quedan registradas en `package-lock.json`. Para instalar de forma reproducible, usa `npm ci` en lugar de `npm install`.
