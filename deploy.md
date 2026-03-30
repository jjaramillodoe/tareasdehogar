# Guía de despliegue — HabitApp

Este documento describe cómo desplegar el **backend** (FastAPI + MongoDB) y cómo publicar la **app móvil** (Expo) en **App Store (iOS)** y **Google Play (Android)**.

---

## Resumen

| Pieza | Tecnología | Notas |
|--------|------------|--------|
| API | FastAPI (`uvicorn server:app`) | Debe exponerse por **HTTPS** en producción. |
| Base de datos | MongoDB | En producción suele usarse **MongoDB Atlas** (gestionado). |
| App | Expo SDK 54 / React Native | La URL del API se inyecta en build con `EXPO_PUBLIC_BACKEND_URL`. |

---

## 1. Backend — Dónde desplegar

Opciones habituales (elige una según presupuesto y comodidad):

| Plataforma | Ventajas |
|------------|----------|
| **[Railway](https://railway.app/)** | Despliegue rápido, variables de entorno sencillas, buen DX. |
| **[Render](https://render.com/)** | Similar a Railway; tier gratuito limitado. |
| **[Fly.io](https://fly.io/)** | Buen control de regiones y contenedores. |
| **VPS** (DigitalOcean, Hetzner, Lightsail, etc.) | Máximo control; tú instalas Python, `uvicorn`, Nginx/Caddy y TLS. |

**MongoDB en la nube (recomendado):** [MongoDB Atlas](https://www.mongodb.com/atlas). Crea un clúster, usuario/contraseña y obtén el **connection string** (`mongodb+srv://...`).

**Requisitos para la app móvil:**

- El backend debe ser accesible por **HTTPS** (certificado TLS válido). iOS y Android bloquean o penalizan HTTP claro en muchos casos.
- No uses `localhost` en la app compilada: el teléfono no ve tu PC.

---

## 2. Variables de entorno del backend (`.env`)

En el servidor (o en el panel de “Environment” de tu PaaS), define **al menos**:

```env
# MongoDB — en Atlas usa el URI que te dan (mongodb+srv://...)
MONGO_URL="mongodb+srv://USUARIO:PASSWORD@cluster.xxxxx.mongodb.net/?appName=TareasHogar"

# Nombre de la base de datos lógica
DB_NAME="tareas_hogar"

# Clave para firmar JWT — genera una cadena larga y aleatoria y guárdala en un gestor de secretos
# Ejemplo de generación (no commitees el valor): openssl rand -hex 32
JWT_SECRET="cambia-esto-por-un-secreto-largo-y-unico"

# Opcional: el código usa valor por defecto si falta, pero en producción DEBES fijarlo explícitamente
```

**Qué cambiar respecto a desarrollo local:**

| Variable | Desarrollo | Producción |
|----------|------------|------------|
| `MONGO_URL` | `mongodb://localhost:27017` | URI de **Atlas** o Mongo en red privada. |
| `JWT_SECRET` | Cualquier valor de prueba | Secreto **único y fuerte**; si lo cambias, todos los usuarios tendrán que volver a iniciar sesión. |
| `DB_NAME` | `tareas_hogar` | El que quieras, pero debe ser **consistente** entre entornos si migras datos. |

**Nota:** En el repo, `backend/.env` está pensado para local. En producción **no** subas `.env` al repositorio; configura variables en el proveedor o en un secreto (Vault, Doppler, etc.).

**CORS:** El código actual permite orígenes amplios en middleware. Para mayor seguridad más adelante puedes restringir orígenes a tu dominio web si expones una PWA; la app nativa usa peticiones con token, no depende de CORS del mismo modo que un navegador. Si ajustas CORS, prueba login y rutas `/api/*` desde la app.

**JWT y sesiones:** Si cambias `JWT_SECRET` en producción, **todas** las sesiones existentes dejarán de ser válidas (los usuarios deberán iniciar sesión de nuevo). El backend también usa `token_version` en usuarios y `session_version` en hijos para invalidar sesiones tras cambio de contraseña/PIN o “cerrar todas las sesiones”; no requiere variables extra.

---

## 3. Comando de arranque en producción

Desde el directorio `backend/` (con dependencias instaladas: `pip install -r requirements.txt`):

```bash
uvicorn server:app --host 0.0.0.0 --port 8001
```

- **No** uses `--reload` en producción.
- Detrás de un reverse proxy (Nginx, Caddy), suele escuchar en `127.0.0.1:8001` y el proxy termina TLS en el puerto 443.

**Comprobación rápida** (sustituye tu dominio):

- `GET https://tu-dominio.com/api/health` → debería responder JSON con estado correcto.
- Opcional: `GET https://tu-dominio.com/api/` → mensaje de bienvenida de la API.

---

## 3.1 MongoDB — colecciones usadas (referencia)

MongoDB crea colecciones **bajo demanda**. No hace falta migración SQL; al desplegar una versión nueva del backend, las colecciones nuevas aparecen al usarse. Entre otras:

| Colección | Uso |
|-----------|-----|
| `users`, `families`, `children` | Cuentas y familia |
| `auth_sessions` | Sesiones de padre/tutor (listado y cierre por dispositivo) |
| `audit_logs` | Bitácora de acciones sensibles |
| `chores`, `payments`, `goals`, `savings_goals`, `withdrawals`, … | Actividad habitual |

Haz **copias de seguridad** de Atlas (snapshots / export) antes de operaciones masivas en producción. La app también ofrece export/import JSON de actividad desde el perfil del padre (probar primero en staging).

---

## 4. Proxy inverso y HTTPS (VPS)

Ejemplo conceptual con **Caddy** (certificados automáticos):

```caddyfile
tu-api.ejemplo.com {
    reverse_proxy 127.0.0.1:8001
}
```

Con **Nginx** necesitas certificados (Let’s Encrypt con Certbot). Asegúrate de que las cabeceras `Host` y `X-Forwarded-Proto` se reenvían correctamente si FastAPI o el cliente las usan en el futuro.

---

## 5. Frontend / app Expo — Variable `EXPO_PUBLIC_BACKEND_URL`

El cliente HTTP usa `EXPO_PUBLIC_BACKEND_URL` como **origen del API** (sin `/api` al final; el código añade `/api`).

**Ejemplo producción:**

```env
EXPO_PUBLIC_BACKEND_URL=https://tu-api.ejemplo.com
```

**Reglas:**

- Esquema **`https:`**.
- **Sin** barra final (`/`).
- Debe coincidir con el dominio donde sirves FastAPI (o el subdominio dedicado al API).

**Importante:** Las variables `EXPO_PUBLIC_*` se **incrustan en el bundle en el momento del build**. Si cambias el dominio del API, debes **volver a generar** builds de la app (EAS Build) y subir nuevas versiones a las tiendas (o usar actualizaciones OTA solo si tu política y Expo lo permiten para ese cambio).

Archivo local de referencia: `frontend/.env` (no commitees secretos; solo la URL pública del API es habitual en builds).

**Dependencias nativas recientes:** el frontend usa módulos como `expo-file-system`, `expo-sharing`, `expo-document-picker` y `@react-native-community/datetimepicker`. Van en `package.json`; un `eas build` normal los incluye. Tras añadir dependencias nativas nuevas, siempre genera un **nuevo build** de tienda (no solo Metro en local).

---

## 6. Builds con EAS (Expo Application Services)

La forma recomendada para iOS y Android con Expo es **[EAS Build](https://docs.expo.dev/build/introduction/)**.

### 6.1 Cuenta y proyecto

1. Cuenta en [expo.dev](https://expo.dev).
2. En `frontend/`:

   ```bash
   npm install
   npx eas-cli login
   npx eas init
   ```

3. Esto crea `eas.json` (perfiles `development`, `preview`, `production` puedes ajustarlos según la [documentación oficial](https://docs.expo.dev/build/eas-json/)).

### 6.2 Identificadores de app (obligatorio antes de tiendas)

En `app.json` (o `app.config.js`) define identificadores **únicos y permanentes**:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.tudominio.habitapp"
    },
    "android": {
      "package": "com.tudominio.habitapp"
    }
  }
}
```

Sustituye `com.tudominio.habitapp` por el identificador que registrarás en Apple y Google (debe ser único en el mundo).

### 6.3 Build iOS y Android

Con `eas.json` configurado y `EXPO_PUBLIC_BACKEND_URL` apuntando a producción:

```bash
cd frontend
eas build --platform ios --profile production
eas build --platform android --profile production
```

- **iOS:** EAS puede gestionar certificados y perfiles si lo permites en el flujo interactivo.
- **Android:** Para Play Store necesitas un **AAB** (Android App Bundle); EAS suele generarlo en el perfil `production` por defecto.

---

## 7. Apple App Store (iOS)

### 7.1 Cuenta

- **Apple Developer Program** (~99 USD/año): [developer.apple.com](https://developer.apple.com/programs/).

### 7.2 App Store Connect

1. Crea la app en [App Store Connect](https://appstoreconnect.apple.com/) con el mismo **Bundle ID** que en `app.json`.
2. Completa ficha: nombre, descripción, capturas de pantalla, categoría, edad, etc.
3. **Política de privacidad:** URL pública obligatoria si recoges datos personales (cuentas, menores, etc.).
4. Declaraciones sobre **cuentas de niños** y recopilación de datos según las guías de Apple.

### 7.3 Subida del build

- Usa **Transporter** o la integración de EAS Submit:

  ```bash
  eas submit --platform ios --latest
  ```

- Enlaza el build a la versión en App Store Connect y envía a revisión.

### 7.4 Revisión

- Tiempo variable (horas a días).
- Responde si Apple pide aclaraciones sobre permisos (cámara, fotos ya declarados en `infoPlist` del proyecto).

---

## 8. Google Play (Android)

### 8.1 Cuenta

- **Google Play Console** (cuota de registro única): [play.google.com/console](https://play.google.com/console).

### 8.2 Ficha y políticas

1. Crea la aplicación con el **mismo** `applicationId` / `package` que en `app.json`.
2. Completa la ficha de Play Store, capturas, icono 512×512, gráfico opcional.
3. **Política de privacidad** (URL).
4. Cuestionario de **seguridad de datos** (Data safety) según qué datos recopila la app.
5. Si la app está dirigida a niños, revisa las políticas de **Families** de Google Play.

### 8.3 Subida

- Sube el **AAB** generado por EAS (producción).
- Prueba interna/cerrada antes de producción si quieres validar en dispositivos reales.

```bash
eas submit --platform android --latest
```

(o subida manual en la consola).

### 8.4 Firma

- Play App Signing: Google recomienda dejar que Google firme el APK/AAB; EAS puede alinearse con este flujo siguiendo la documentación actual de Expo.

---

## 9. Checklist previo al lanzamiento

- [ ] API en **HTTPS** estable.
- [ ] `MONGO_URL`, `JWT_SECRET` y `DB_NAME` correctos en el servidor.
- [ ] `GET /api/health` OK desde fuera.
- [ ] `EXPO_PUBLIC_BACKEND_URL` de producción en el **build** de la app.
- [ ] `bundleIdentifier` (iOS) y `package` (Android) definidos y coincidentes con las tiendas.
- [ ] Versión y `version` / `android.versionCode` / `ios.buildNumber` incrementadas según reglas de cada tienda.
- [ ] Política de privacidad y (si aplica) soporte/contacto publicados.
- [ ] Prueba en dispositivo real: registro, login, tareas, fotos (permisos).
- [ ] (Opcional) Probar respaldo/export JSON y flujo crítico de retiros en un entorno de **staging** antes de producción.

---

## 10. Actualizar solo el backend

Si cambias lógica del API pero no la URL:

- Redeploy del backend suele bastar; los clientes ya instalados seguirán usando el mismo host.

Si cambias **URL del API**:

- Nuevos builds de la app (u OTA si aplica y es compatible con tu cambio).

---

## 11. Referencias útiles

- [Expo — EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo — Submit to stores](https://docs.expo.dev/submit/introduction/)
- [MongoDB Atlas connection string](https://www.mongodb.com/docs/atlas/driver-connection/)
- [FastAPI — deployment](https://fastapi.tiangolo.com/deployment/)

---

## 12. Documentación del producto

- **README del repositorio (`README.md`)**: funcionalidades, estructura del proyecto, variables de entorno básicas y resumen de endpoints.
- Este **`deploy.md`**: infraestructura, HTTPS, EAS y tiendas.

*Última revisión alineada con Expo SDK 54 y backend FastAPI (`uvicorn server:app` desde `backend/`).*
