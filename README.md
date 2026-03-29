# 🏠 Tareas del Hogar

Una aplicación móvil completa para que los padres gestionen las tareas del hogar de sus hijos y los recompensen por su esfuerzo.

![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-blue)
![Framework](https://img.shields.io/badge/Framework-Expo%20%7C%20React%20Native-purple)
![Backend](https://img.shields.io/badge/Backend-FastAPI-green)
![Database](https://img.shields.io/badge/Database-MongoDB-brightgreen)

## 📱 Características Principales

### Para Padres/Tutores
- ✅ **Gestión de Familia**: Crear y configurar la familia con divisa personalizada
- 👨‍👩‍👧‍👦 **Gestión de Hijos**: Agregar hijos (menores de 19 años) con PIN opcional
- 📋 **Tareas Predefinidas**: 18 tareas comunes del hogar listas para usar
- 💰 **Sistema de Pagos**: Asignar montos a cada tarea
- ✔️ **Aprobación de Tareas**: Revisar y aprobar tareas completadas
- 🎯 **Metas y Bonos**: Crear metas semanales con bonos extra
- 📊 **Reportes**: Estadísticas y gráficas de progreso
- 🔔 **Notificaciones**: Centro de alertas en tiempo real

### Para Hijos
- 📝 Ver tareas asignadas
- ✅ Marcar tareas como completadas
- 💵 Ver saldo acumulado
- 🏆 Desbloquear logros
- 🔥 Sistema de rachas diarias

## 🛠️ Tecnologías

| Componente | Tecnología |
|------------|------------|
| Frontend | Expo / React Native |
| Backend | FastAPI (Python) |
| Base de Datos | MongoDB |
| Autenticación | JWT |
| Estado | Zustand |
| HTTP Client | Axios |

## 📁 Estructura del Proyecto

```
/app
├── backend/
│   ├── .env                 # Variables de entorno del backend
│   ├── server.py            # API FastAPI
│   └── requirements.txt     # Dependencias Python
├── frontend/
│   ├── .env                 # Variables de entorno del frontend
│   ├── app/                 # Pantallas (Expo Router)
│   │   ├── (auth)/          # Pantallas de autenticación
│   │   ├── (parent)/        # Pantallas para padres
│   │   └── (child)/         # Pantallas para hijos
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── constants/       # Colores y constantes
│   │   ├── services/        # API client
│   │   └── store/           # Estado global (Zustand)
│   └── package.json
└── README.md
```

## ⚙️ Configuración

### Variables de Entorno - Backend

Crear archivo `/app/backend/.env`:

```env
# Base de datos MongoDB
MONGO_URL="mongodb://localhost:27017"
DB_NAME="tareas_hogar"

# Seguridad JWT (generar una clave segura)
JWT_SECRET="tu-clave-secreta-muy-larga-y-segura-aqui"

# CORS (en producción, especificar dominios)
CORS_ORIGINS="*"
```

### Variables de Entorno - Frontend

Crear archivo `/app/frontend/.env`:

```env
# URL del backend API
EXPO_PUBLIC_BACKEND_URL="https://tu-dominio.com"

# Configuración de Expo (opcional para desarrollo)
EXPO_TUNNEL_SUBDOMAIN=tu-app
EXPO_PACKAGER_HOSTNAME=https://tu-app.preview.emergentagent.com
```

## 🚀 Instalación y Ejecución

### Requisitos Previos

- Node.js 18+
- Python 3.11+
- MongoDB 6+
- Expo CLI

### Backend

```bash
# Navegar al directorio del backend
cd /app/backend

# Crear entorno virtual (opcional pero recomendado)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
.\venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
# Navegar al directorio del frontend
cd /app/frontend

# Instalar dependencias
yarn install
# o
npm install

# Ejecutar en modo desarrollo
npx expo start

# Para web
npx expo start --web

# Para tunnel (acceso remoto)
npx expo start --tunnel
```

## 📚 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar nuevo padre/tutor |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Obtener usuario actual |

### Familia
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/families` | Crear familia |
| GET | `/api/families/my` | Obtener mi familia |
| PUT | `/api/families/my` | Actualizar familia |

### Hijos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/children` | Agregar hijo |
| GET | `/api/children` | Listar hijos |
| GET | `/api/children/{id}` | Obtener hijo |
| PUT | `/api/children/{id}` | Actualizar hijo |
| DELETE | `/api/children/{id}` | Eliminar hijo |

### Tareas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/chores` | Crear tarea |
| GET | `/api/chores` | Listar tareas |
| GET | `/api/chores/child/{id}` | Tareas de un hijo |
| PUT | `/api/chores/{id}` | Actualizar tarea |
| DELETE | `/api/chores/{id}` | Eliminar tarea |
| POST | `/api/chores/{id}/complete` | Marcar completada |
| POST | `/api/chores/{id}/approve` | Aprobar tarea |
| POST | `/api/chores/{id}/reject` | Rechazar tarea |

### Metas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/goals` | Crear meta |
| GET | `/api/goals` | Listar metas |
| PUT | `/api/goals/{id}` | Actualizar meta |
| DELETE | `/api/goals/{id}` | Eliminar meta |
| POST | `/api/goals/{id}/pay-bonus` | Pagar bono |

### Notificaciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/notifications` | Listar notificaciones |
| GET | `/api/notifications/count` | Contar no leídas |
| POST | `/api/notifications/{id}/read` | Marcar como leída |
| POST | `/api/notifications/read-all` | Marcar todas leídas |

### Estadísticas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/stats/child/{id}` | Stats de un hijo |
| GET | `/api/stats/family/report` | Reporte familiar |

### Logros
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/achievements/child/{id}` | Logros de un hijo |
| GET | `/api/achievements/definitions` | Definiciones de logros |

## 🏆 Sistema de Logros

| Logro | Requisito |
|-------|-----------|
| Primera Tarea | Completar 1 tarea |
| Trabajador | Completar 5 tareas |
| Súper Trabajador | Completar 10 tareas |
| Experto | Completar 25 tareas |
| Maestro | Completar 50 tareas |
| Racha de 3 | 3 días consecutivos |
| Racha Semanal | 7 días consecutivos |
| Racha de 2 Semanas | 14 días consecutivos |
| Racha Mensual | 30 días consecutivos |
| Meta Cumplida | Completar primera meta |
| Primer Centenario | Ganar 100 en total |
| Ahorrador | Ganar 500 en total |

## 📋 Tareas Predefinidas

La app incluye 18 tareas predefinidas:

| Tarea | Monto Sugerido |
|-------|----------------|
| Limpiar la sala | $30 |
| Limpiar el cuarto | $25 |
| Limpiar la cocina | $35 |
| Lavar los trastes | $20 |
| Barrer el patio | $25 |
| Sacar la basura | $10 |
| Tender la cama | $10 |
| Lavar la ropa | $40 |
| Planchar la ropa | $30 |
| Limpiar el baño | $35 |
| Pasear al perro | $15 |
| Alimentar mascotas | $10 |
| Regar las plantas | $10 |
| Hacer la tarea | $20 |
| Lavar el carro | $50 |
| Aspirar la casa | $30 |
| Ordenar el closet | $25 |
| Ayudar con la cena | $20 |

## 🎨 Tema de Colores

La app usa un tema vibrante con tres colores principales:

- **Azul (Primary)**: `#2563EB` - Acciones principales
- **Amarillo/Dorado (Secondary)**: `#F59E0B` - Dinero y recompensas
- **Rojo (Accent)**: `#EF4444` - Alertas y destacados

## 🔐 Seguridad

- Autenticación mediante JWT (JSON Web Tokens)
- Contraseñas hasheadas con SHA-256
- PIN opcional para acceso de hijos
- Tokens con expiración de 7 días
- Validación de edad (menores de 19 años)

## 📱 Pantallas de la App

### Autenticación
- Pantalla de bienvenida con splash animado
- Registro de padres/tutores
- Inicio de sesión

### Panel de Padres
- **Inicio**: Resumen, tareas pendientes de aprobación
- **Hijos**: Gestión de perfiles de hijos
- **Tareas**: Crear, asignar y gestionar tareas
- **Metas**: Sistema de metas y bonos
- **Reportes**: Estadísticas y gráficas
- **Alertas**: Centro de notificaciones
- **Perfil**: Configuración de familia y cuenta

### Vista de Hijos
- **Mis Tareas**: Tareas pendientes y completadas
- **Historial**: Pagos recibidos

## 🧪 Testing

```bash
# Test del backend
curl http://localhost:8001/api/health

# Test de autenticación
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"Test User"}'
```

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👨‍💻 Autor

Desarrollado con ❤️ para familias que quieren enseñar responsabilidad financiera a sus hijos.

---

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa que MongoDB esté corriendo
2. Verifica las variables de entorno
3. Asegúrate de que los puertos 8001 (backend) y 3000 (frontend) estén disponibles
4. Revisa los logs del backend: `tail -f /var/log/supervisor/backend.err.log`
5. Revisa los logs del frontend: `tail -f /var/log/supervisor/expo.err.log`
