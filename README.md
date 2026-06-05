# SAGEL — Despliegue en Cloudflare Pages

Sistema de Apoyo a la Gestión Legislativa  
Secretaría Legislativa — Senado de la Provincia de Buenos Aires

---

## Arquitectura del piloto

```
Cloudflare Pages  (hosting gratuito)
├── public/index.html          ← Frontend completo (HTML + CSS + JS)
└── functions/
    ├── _middleware.js          ← CORS global
    └── api/
        ├── _auth.js            ← JWT + hashing (Web Crypto)
        ├── _crud.js            ← Factory CRUD genérico
        ├── auth/login.js       ← POST /api/auth/login
        ├── expedientes.js      ← CRUD completo + archivos + historial
        ├── sesiones.js         ← CRUD sesiones
        ├── comisiones.js       ← CRUD comisiones
        ├── minutas.js          ← CRUD minutas
        ├── senadores.js        ← CRUD senadores
        ├── actores.js          ← CRUD actores institucionales
        ├── biblioteca.js       ← CRUD biblioteca documental
        ├── users.js            ← CRUD usuarios (solo admin)
        ├── stats.js            ← KPIs y datos del dashboard
        └── auditoria.js        ← Log de auditoría con filtros

Cloudflare D1  (SQLite serverless, gratis hasta 5GB)
└── sagel-db                    ← Base de datos única
```

---

## PASO 1 — Crear cuenta Cloudflare (si no tenés una)

1. Ir a https://dash.cloudflare.com/sign-up
2. Registrarse con email institucional
3. Confirmar el email

**El plan gratuito incluye todo lo necesario para el piloto:**
- Pages: hosting ilimitado
- D1: 5 GB almacenamiento + 5M lecturas/mes
- Workers: 100.000 requests/día

---

## PASO 2 — Instalar Wrangler CLI

```bash
npm install -g wrangler
```

Iniciar sesión:
```bash
wrangler login
```
(Abre el navegador para autenticar con tu cuenta Cloudflare)

---

## PASO 3 — Crear la base de datos D1

```bash
wrangler d1 create sagel-db
```

Cloudflare devuelve algo como:
```
✅ Successfully created DB 'sagel-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copiar ese `database_id`** y pegarlo en `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "sagel-db"
database_id = "PEGAR-AQUI-EL-ID"
```

---

## PASO 4 — Inicializar el esquema de la base de datos

```bash
# Ejecutar en la base de datos remota (producción)
wrangler d1 execute sagel-db --file=schema.sql --remote
```

Esto crea todas las tablas, índices y carga los datos iniciales:
- 46 senadores reales
- Usuarios de prueba (admin/admin, asesor/asesor, etc.)
- Biblioteca inicial

---

## PASO 5 — Configurar la variable de entorno JWT_SECRET

En el dashboard de Cloudflare:
1. Ir a **Pages → tu proyecto → Settings → Environment variables**
2. Agregar variable:
   - Nombre: `JWT_SECRET`
   - Valor: una cadena aleatoria larga (ej: `sagel-senado-pba-2025-secreto-largo`)
   - Entorno: Production

O por CLI antes del deploy:
```bash
wrangler pages secret put JWT_SECRET
# Pegar el valor cuando lo pide
```

---

## PASO 6 — Desplegar en Cloudflare Pages

**Opción A — Deploy directo desde esta carpeta (más rápido):**
```bash
wrangler pages deploy public --project-name=sagel
```

La primera vez crea el proyecto automáticamente.

**Opción B — Deploy desde GitHub (recomendado para producción):**
1. Subir esta carpeta a un repositorio GitHub
2. En Cloudflare: **Pages → Create a project → Connect to Git**
3. Seleccionar el repositorio
4. Configuración de build:
   - Build command: *(vacío)*
   - Build output directory: `public`
5. Agregar la variable de entorno `JWT_SECRET`
6. Deploy

---

## PASO 7 — Asociar D1 al proyecto Pages

En el dashboard:
1. Ir a **Pages → sagel → Settings → Functions**
2. Sección **D1 database bindings**
3. Agregar: Variable name = `DB`, Database = `sagel-db`
4. Guardar y hacer un nuevo deploy (o `wrangler pages deploy public --project-name=sagel`)

---

## PASO 8 — Acceder al sistema

La URL será: `https://sagel.pages.dev` (o tu dominio personalizado)

**Cuentas iniciales de prueba:**

| Usuario       | Contraseña    | Rol                    |
|---------------|---------------|------------------------|
| `admin`       | `admin`       | Administrador          |
| `secretario`  | `secretario`  | Secretario Legislativo |
| `asesor`      | `asesor`      | Asesor                 |
| `consulta`    | `consulta`    | Solo lectura           |

⚠️ **Cambiar todas las contraseñas inmediatamente** desde Admin → Usuarios.

---

## Desarrollo local (opcional)

Para probar antes de subir a Cloudflare:

```bash
# En la carpeta raíz del proyecto
wrangler pages dev public --d1=DB=sagel-db
```

Abre `http://localhost:8788`

---

## Upgrade: del plan gratuito al pago

Cuando el piloto supere los límites gratuitos:

| Límite D1 gratuito         | Costo al superar           |
|----------------------------|----------------------------|
| 5 GB almacenamiento        | $0.75/GB-mes adicional     |
| 5M lecturas/mes            | $0.001 por cada 1000 extra |
| 100K requests Workers/día  | Workers Paid: $5/mes fijo  |

Para una secretaría de 5-10 usuarios con uso normal, **el costo mensual no superaría $5-10 USD**.

---

## Estructura de archivos

```
sagel-cf/
├── wrangler.toml              ← Configuración Cloudflare (editar database_id)
├── schema.sql                 ← Esquema D1 + datos iniciales
├── public/
│   └── index.html             ← Aplicación completa (frontend)
└── functions/
    ├── _middleware.js
    └── api/
        ├── _auth.js
        ├── _crud.js
        ├── auth/login.js
        ├── expedientes.js
        ├── sesiones.js
        ├── comisiones.js
        ├── minutas.js
        ├── senadores.js
        ├── actores.js
        ├── biblioteca.js
        ├── users.js
        ├── stats.js
        └── auditoria.js
```

---

## Soporte

Ante cualquier error de deploy, revisar:
- `wrangler pages deploy` muestra el log completo
- Dashboard Cloudflare → Pages → tu proyecto → Deployments → Ver logs
- D1 → sagel-db → Console → ejecutar queries directamente
