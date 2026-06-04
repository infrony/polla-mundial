# 🏆 Polla Mundial 2026

Aplicación web de pronósticos para el **FIFA World Cup 2026** (EEUU · México · Canadá). Los usuarios se registran, predicen resultados de los 72 partidos de la fase de grupos y compiten en una tabla de posiciones en tiempo real.

## Características

- **Autenticación** — registro con email/contraseña o Google OAuth
- **72 partidos** — fase de grupos completa, Grupos A–L con banderas de países
- **Pronóstico de grupos** — predice quién clasifica 1° y 2° en cada grupo
- **Tabla en vivo** — ranking actualizado con puntos reales desde la base de datos
- **Panel de administrador** — ingresa resultados, gestiona inscripciones ($5) y visualiza todos los picks
- **Bloqueo automático** — los picks se cierran al inicio del primer partido de cada grupo
- **Responsive** — diseñado mobile-first

## Stack

| Capa | Tecnología |
|---|---|
| Frontend/Backend | Next.js 14 (App Router) |
| Autenticación | NextAuth.js v4 |
| Base de datos | PostgreSQL (Neon) |
| Estilos | CSS personalizado (dark theme) |
| Despliegue | Docker / EasyPanel |

## Instalación local

### Requisitos

- Node.js 20+
- Cuenta en [Neon](https://neon.tech) (PostgreSQL serverless gratuito)

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd polla-mundial

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# 4. Crear tablas en la base de datos
node scripts/init-db.js

# 5. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Base de datos (Neon PostgreSQL)
POSTGRES_URL="postgresql://usuario:password@host/dbname?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="genera-uno-con: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NEXT_PUBLIC_GOOGLE_ENABLED="true"

# Email que recibe permisos de admin automáticamente
ADMIN_EMAIL="tu@email.com"
```

### Configurar Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Crea una credencial **OAuth 2.0 → Web application**
3. Agrega los URIs autorizados:
   - **JavaScript origins:** `http://localhost:3000`
   - **Redirect URIs:** `http://localhost:3000/api/auth/callback/google`
4. Copia el Client ID y Client Secret a `.env.local`

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo (http://localhost:3000)
npm run build      # Build de producción
npm start          # Servidor de producción
node scripts/init-db.js  # Crear/reiniciar tablas en la base de datos
```

## Estructura del proyecto

```
polla-mundial/
├── app/
│   ├── (app)/          # Páginas autenticadas (partidos, grupos, tabla, mis-picks)
│   ├── (auth)/         # Login y registro
│   ├── admin/          # Panel de administrador
│   └── api/            # API routes (picks, group-picks, leaderboard, admin)
├── components/         # Componentes React reutilizables
├── lib/
│   ├── auth.js         # Configuración NextAuth
│   ├── data.js         # Datos de los 72 partidos y 12 grupos
│   └── db.js           # Conexión a PostgreSQL
├── public/             # Archivos estáticos (imágenes)
├── scripts/
│   └── init-db.js      # Script de inicialización de base de datos
├── Dockerfile
└── .env.local          # Variables de entorno (no subir a git)
```

## Sistema de puntos

| Acierto | Puntos |
|---|---|
| Resultado correcto del partido (1 / X / 2) | 1 pt |
| Equipo correcto clasificando 1° en su grupo | 2 pts |
| Equipo correcto clasificando 2° en su grupo | 1 pt |

## Despliegue en EasyPanel

1. Sube el proyecto a GitHub
2. En EasyPanel → **New Service → App → GitHub**
3. EasyPanel detecta el `Dockerfile` automáticamente
4. Configura las variables de entorno en el panel de EasyPanel
5. Agrega el dominio de producción a los URIs autorizados de Google Cloud Console:
   `https://tu-dominio.com/api/auth/callback/google`

## Base de datos

Las tablas se crean con `node scripts/init-db.js`:

| Tabla | Descripción |
|---|---|
| `users` | Usuarios registrados (email, password hash, provider, admin, paid) |
| `picks` | Pronósticos de partidos por usuario (1/X/2) |
| `group_picks` | Pronósticos de clasificados por grupo |
| `match_results` | Resultados reales ingresados por el admin |
| `group_results` | Clasificados reales por grupo |

## Administrador

El email definido en `ADMIN_EMAIL` recibe permisos de admin automáticamente al registrarse. El panel admin (`/admin`) permite:

- Ver todos los participantes y su estado de inscripción ($5)
- Confirmar o revocar el pago de cada usuario
- Ingresar resultados de partidos → los puntos se calculan automáticamente
- Ingresar clasificados de grupos
- Ver la matriz completa de picks de todos los usuarios
