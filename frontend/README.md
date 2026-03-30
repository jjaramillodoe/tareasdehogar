# HabitApp — Frontend (Expo)

App móvil con [Expo](https://expo.dev) y [Expo Router](https://docs.expo.dev/router/introduction/). Ver también el [README principal](../README.md) del repositorio y la [guía de despliegue](../deploy.md).

## Requisitos

- Node.js 18+
- Cuenta de desarrollo para builds de tienda (opcional; ver `deploy.md`)

## Puesta en marcha

```bash
npm install
npx expo start
```

Opciones habituales: Expo Go, emulador Android, simulador iOS o build de desarrollo.

## Variables de entorno

Crea `frontend/.env` (no subas secretos al repositorio):

```env
# Origen del API FastAPI (sin barra final; el cliente añade /api)
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

En **producción**, usa la URL HTTPS del backend antes de generar el build (EAS); las variables `EXPO_PUBLIC_*` se incrustan en el bundle en el momento del build.

## Estructura de rutas (`app/`)

| Grupo | Descripción |
|--------|-------------|
| `index.tsx` | Pantalla de bienvenida (no autenticado): accesos a registro, login, guía, hijo/a y enlaces legales. |
| `(auth)/` | Login, registro y acceso como hijo/a (`child-login`). |
| `(parent)/` | Tabs del flujo padre/tutor: inicio, tareas, metas, calendario, reportes, perfil, etc. |
| `(child)/` | Tabs del flujo hijo/a: tareas, metas, pagos. |
| `(public)/` | Pantallas **informativas y legales** (accesibles sin sesión y también desde el perfil). |

### Pantallas públicas y legales (`(public)/`)

Rutas pensadas para tiendas (privacidad, menores) y para ayuda al usuario:

| Ruta | Contenido |
|------|-----------|
| `/(public)/how-it-works` | Guía **Cómo funciona la app** (padres e hijos: tareas, fotos, metas). |
| `/(public)/privacy` | **Política de privacidad** (texto modelo). |
| `/(public)/privacy-minors` | **Privacidad y menores** (tutores, datos de hijos, evidencias). |
| `/(public)/terms` | **Términos de uso** (texto modelo). |

**Componentes relacionados**

- `src/components/PublicContentLayout.tsx` — cabecera con volver + scroll para estas pantallas.
- `src/constants/legalStyles.ts` — estilos compartidos de títulos y párrafos en documentos legales.

Los textos legales son **orientativos**; revísalos con asesoría jurídica antes de publicar en App Store o Google Play.

**Dónde se enlaza**

- Bienvenida: botón «Cómo funciona la app», «Soy hijo/a» y enlaces Privacidad / Menores / Términos.
- Registro: aceptación con enlaces a Términos y Privacidad.
- Login hijo/a: nota con enlace a Privacidad y menores.
- Perfil (padre): sección **Información legal** con las cuatro entradas.

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm start` / `npx expo start` | Servidor de desarrollo Metro. |
| `npm run lint` | `expo lint`. |
| `npm run android` / `npm run ios` | Abre en emulador/simulador según plataforma. |

## Más información

- [Documentación Expo](https://docs.expo.dev/)
- Builds y tiendas: [`deploy.md`](../deploy.md) en la raíz del repositorio.
