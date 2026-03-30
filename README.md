# 🏠 HabitApp

Una aplicación móvil completa para que los padres gestionen las tareas del hogar de sus hijos y los recompensen por su esfuerzo, con foco en hábitos, ahorro y educación financiera familiar.

![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-blue)
![Framework](https://img.shields.io/badge/Framework-Expo%20%7C%20React%20Native-purple)
![Backend](https://img.shields.io/badge/Backend-FastAPI-green)
![Database](https://img.shields.io/badge/Database-MongoDB-brightgreen)

## 📱 Características principales

### Para padres / tutores
- **Gestión de familia**: divisa, país/región, código de acceso para hijos, invitaciones a otros tutores.
- **Hijos**: perfiles, PIN opcional, avatar según género, límites y reglas de dinero.
- **Tareas**: creación, calendario, aprobación con reparto a saldo y metas de ahorro (auto‑ahorro, match, bonos).
- **Retiros**: solicitudes de los hijos, aprobación individual o **aprobación masiva** de montos pequeños.
- **Metas** (tareas y ahorro), **logros**, **reportes** (7/14 días), **notificaciones** (borrado masivo o selectivo).
- **Dinero a tener listo**: resumen de retiros pendientes en inicio y perfil.
- **Perfil — administración y seguridad**:
  - Exportar / importar **respaldo JSON** de actividad (vista previa antes de aplicar).
  - Reset de actividad (completo o parcial), modo demo (sembrar / limpiar datos de prueba).
  - **Bitácora de auditoría** (acciones sensibles).
  - **Sesiones** por dispositivo (listar y cerrar una sesión o todas).
  - **Auto‑logout** por inactividad (configurable).
  - **Bloqueo por intentos fallidos de PIN** (límites configurables a nivel familia).
  - **Permisos por rol** (owner / admin / parent) para reset, aprobar retiros y editar metas.
  - **Horas silenciosas** con selector de hora y **presets** (ej. 22:00–06:00).
  - **Valores recomendados Ecuador** (un toque) para montos y reglas típicas.
- **Diagnóstico** en perfil: estado API, BD, último respaldo exportado.

### Para hijos
- Tareas, pagos, retiros, metas de ahorro, logros, reporte simple, notificaciones.
- Flujos de **necesidad vs. deseo** y celebraciones por hitos de ahorro.

## 🆕 Novedades recientes (resumen)

| Área | Qué incluye |
|------|-------------|
| Seguridad | JWT con `token_version` / `session_version` (invalidar sesiones al cambiar contraseña o PIN), sesiones en `auth_sessions`, `POST /auth/logout-all-sessions`, bloqueo PIN tras N intentos |
| Familia | Ajustes de notificaciones, reglas de retiros, demo, auto‑logout, permisos por rol, `pin_failed_attempt_limit`, `pin_lockout_minutes` |
| Datos | Respaldo JSON, restauración con preview, reset parcial, demo seed/clear, bitácora `audit_logs` |
| UX | Calendario alineado, tarjetas de hijos sin overflow, compartir invitación, reportes 7/14 días, perfil con chips y presets Ecuador |

## 🛠️ Tecnologías

| Componente | Tecnología |
|------------|------------|
| Frontend | Expo SDK 54 / React Native |
| Backend | FastAPI (Python), `uvicorn server:app` |
| Base de datos | MongoDB |
| Autenticación | JWT |
| Estado | Zustand |
| HTTP | Axios |

## 📁 Estructura del proyecto

```
tareasdehogar/
├── backend/
│   ├── .env                 # Variables de entorno (local; no subir a git)
│   ├── server.py          # Punto de entrada ASGI → app.main
│   ├── app/               # Routers, modelos, servicios
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── tests/
│   └── seed_local_demo_data.py   # Datos demo (opcional)
├── frontend/
│   ├── .env               # EXPO_PUBLIC_BACKEND_URL
│   ├── app/               # Pantallas (Expo Router)
│   │   ├── (auth)/
│   │   ├── (parent)/
│   │   └── (child)/
│   ├── src/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── services/      # Cliente API
│   │   └── store/
│   └── package.json
├── deploy.md              # Guía de despliegue (API + tiendas)
└── README.md
```

## ⚙️ Configuración

### Backend — variables de entorno

Crear `backend/.env`:

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="tareas_hogar"
JWT_SECRET="tu-clave-secreta-muy-larga-y-segura-aqui"
```

Opcional: `CORS_ORIGINS` si el servidor lo usa.

### Frontend — variables de entorno

Crear `frontend/.env`:

```env
EXPO_PUBLIC_BACKEND_URL="http://localhost:8001"
```

En producción sin barra final y con `https://`. Ver `deploy.md`.

## 🚀 Instalación y ejecución

### Requisitos

- Node.js 18+
- Python 3.11+
- MongoDB 6+
- Yarn o npm

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
yarn install
npx expo start
```

### Datos demo locales (opcional)

```bash
cd backend
python seed_local_demo_data.py --clean --profile ecuador
```

No borra usuarios ni hijos; rellena tareas, pagos, metas, etc.

## 📚 API — endpoints útiles (resumen)

La API base es `{EXPO_PUBLIC_BACKEND_URL}/api` (el código del cliente añade `/api`).

**Autenticación**
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /auth/session`
- `POST /auth/child-login`, `POST /auth/change-password`, `POST /auth/change-child-pin`
- `POST /auth/logout-all-sessions`
- `GET /auth/sessions`, `POST /auth/sessions/{session_id}/revoke`

**Familia**
- `GET/PUT /families/my`, `POST /families`, `GET /families/members`, `POST /families/invite`
- `POST /families/reset-activity`, `POST /families/reset-activity/partial`
- `GET /families/activity-backup`, `POST /families/activity-restore`
- `GET /families/audit-log`, `GET /families/diagnostics`
- `POST /families/demo/seed`, `POST /families/demo/clear`

**Retiros**
- `POST /withdrawals/request`, `GET /withdrawals`, aprobar/rechazar por id
- `POST /withdrawals/approve-small/bulk`

**Salud**
- `GET /health` (raíz), `GET /api/health` si está montado en el router

Lista completa en los routers bajo `backend/app/routers/`.

## 🏆 Sistema de logros

Incluye logros por tareas completadas, rachas, metas y ahorro (definiciones en el backend). Consulta `GET /achievements/definitions`.

## 🔐 Seguridad

- JWT para padres e hijos; contraseñas y PIN con hash (SHA‑256 en backend actual).
- **Versionado de tokens**: al cambiar contraseña o PIN, o al cerrar todas las sesiones, las sesiones anteriores dejan de ser válidas.
- Sesiones de padre registradas en `auth_sessions` (opcional `sid` en el JWT).
- Bloqueo temporal tras intentos fallidos de PIN (configurable por familia).

## 📱 Pantallas (orientación)

- **Padres**: Inicio, Hijos, Tareas, Calendario, Metas, Reportes, Alertas, Perfil (y más según rutas).
- **Hijos**: Tareas, Pagos, Metas de ahorro, Reporte, Perfil, etc.

## 🧪 Pruebas

```bash
# Salud del API
curl http://localhost:8001/api/health

# Backend (pytest)
cd backend && pytest
```

## 📄 Licencia

**Propietaria — no es software libre.** Ver el archivo **[LICENSE](./LICENSE)** (incluye tabla de contacto para completar: correo, web).

**HabitApp** — powered by **ESPERA ZERO QUEUE S.A.**  
Quedan reservados todos los derechos. El uso, copia o distribución del código requiere autorización expresa de **ESPERA ZERO QUEUE S.A.**

## 👨‍💻 Titularidad

- **Razón social:** ESPERA ZERO QUEUE S.A.
- **Estilo comercial:** *Espera Zero Queue*
- **Producto:** **HabitApp**

---

## 🆘 Soporte

1. MongoDB en ejecución y `MONGO_URL` correcto.
2. `EXPO_PUBLIC_BACKEND_URL` alcanzable desde el dispositivo (no uses `localhost` en el móvil salvo emulador/túnel).
3. Puertos: backend en `8001` por defecto en desarrollo.
4. Despliegue en producción: **deploy.md**.

Para más detalle operativo (HTTPS, EAS, tiendas), abre **[deploy.md](./deploy.md)**.
