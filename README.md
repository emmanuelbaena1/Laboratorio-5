# LibroYa: Librería Virtual Full-Stack

LibroYa es una plataforma de comercio electrónico orientada a la venta de libros físicos con control de inventario en bodega central y logística de despacho a domicilio (sin retiro en tienda física). 

El sistema implementa una arquitectura desacoplada: interfaz moderna en **Next.js (App Router)**, backend en **Node.js/Express**, base de datos en **MongoDB Atlas**, pasarela de pagos con **PayPal Sandbox (Orders v2)** y actualizaciones de pedidos en tiempo real con **WebSockets (Socket.IO)**.

---

## URLs Desplegadas (Railway)

- **Frontend:** [https://frontend-production-bd9f81de.up.railway.app](https://frontend-production-bd9f81de.up.railway.app)
- **Backend:** [https://libroya-production.up.railway.app](https://libroya-production.up.railway.app)
- **Health Check del Backend:** [https://libroya-production.up.railway.app/health](https://libroya-production.up.railway.app/health)

---

## Stack Tecnológico

- **Frontend:**
  - Next.js 15 (App Router) + React 19
  - Tailwind CSS v4 (Paleta editorial: papel `#f6f1e7`, tinta `#1c1917`, terracota `#b4533a`)
  - `@paypal/react-paypal-js` (Integración oficial de PayPal Buttons v2)
  - `@dnd-kit` (Drag & drop para el tablero Kanban de pedidos)
  - `socket.io-client` (Recepción de eventos en tiempo real)
- **Backend:**
  - Node.js + Express
  - Socket.IO (Servidor WebSocket con handshake autenticado mediante JWT)
  - Mongoose + MongoDB Atlas
  - Autenticación con JWT (JSON Web Tokens) y contraseñas cifradas con `bcrypt`
  - Validación de esquemas con `Zod`
  - Seguridad: `helmet`, `cors`, `trust proxy` y rate limiting de 10 intentos fallidos con `express-rate-limit`

---

## Requisitos Previos

1. **Node.js** (versión 18 o superior).
2. **Cluster en MongoDB Atlas** (o instancia local de MongoDB).
3. **Cuenta de PayPal Developer** para obtener credenciales de Sandbox (Client ID y Client Secret).

---

## Configuración y Ejecución en Local

### 1. Clonar el proyecto e instalar dependencias

```bash
# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

---

### 2. Variables de Entorno

El repositorio contiene plantillas `.env.example` en ambas carpetas. Crea los archivos correspondientes sin comitearlos (`.env` está ignorado en git).

#### Backend (`backend/.env`)
Crear `backend/.env` copiando `backend/.env.example`:

| Variable | Descripción | Ejemplo / Valor por defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto en el que escucha el servidor Express | `4000` |
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas | `mongodb+srv://<usuario>:<password>@cluster.mongodb.net/libroya` |
| `JWT_SECRET` | Clave secreta para firmar los tokens JWT | *Cadena criptográfica aleatoria* |
| `CLIENT_URL` | URL del frontend autorizada en CORS y Socket.IO | `http://localhost:3000` |
| `PAYPAL_CLIENT_ID` | Client ID de la app en PayPal Developer (Sandbox) | `<tu_paypal_client_id>` |
| `PAYPAL_CLIENT_SECRET` | Client Secret de PayPal Developer (Sandbox) | `<tu_paypal_client_secret>` |
| `PAYPAL_API_BASE` | URL base de la API de PayPal | `https://api-m.sandbox.paypal.com` |
| `SEED_ADMIN_EMAIL` | Correo del administrador inicial para el seed | `admin@libroya.test` |
| `SEED_ADMIN_PASSWORD` | Contraseña que tendrá el administrador inicial | *Elige una contraseña segura* |

> **Importante:** No coloques contraseñas fijas ni credenciales reales en repositorios públicos.

#### Frontend (`frontend/.env.local`)
Crear `frontend/.env.local` copiando `frontend/.env.example`:

| Variable | Descripción | Valor Local |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL base del backend Express | `http://localhost:4000` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID`| Client ID público de PayPal Sandbox | `<tu_paypal_client_id>` |

---

### 3. Poblar la Base de Datos (Seed)

Antes de iniciar la aplicación por primera vez, ejecuta el script de seed desde la carpeta `backend`. Requiere que `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` estén configurados en `backend/.env`:

```bash
cd backend
node src/seed/seed.js
```

Este script:
1. Valida que existan las credenciales del admin en las variables de entorno.
2. Crea o actualiza la cuenta del usuario administrador.
3. Inserta 12 libros de muestra con stock en bodega, precios en USD y portadas temáticas.

---

### 4. Iniciar los Servidores

Abre dos terminales independientes:

**Terminal 1 — Backend:**
```bash
cd backend
npm start
```
El backend iniciará en `http://0.0.0.0:4000`.

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
El frontend estará disponible en `http://localhost:3000`.

---

## Verificación del Servidor (Health Check)

El backend expone una ruta pública de comprobación de estado que no requiere autenticación:

```bash
curl http://localhost:4000/health
```

Respuesta esperada (HTTP 200 OK):
```json
{
  "ok": true
}
```

---

## Cuentas de Acceso y Pruebas

1. **Cuenta Administrador:**
   - Creada a partir del seed (`node src/seed/seed.js`).
   - El email y contraseña corresponden a los definidos en `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.
   - Permite ingresar a `/login`, acceder a `/admin/pedidos` (Kanban de pedidos en tiempo real) y a `/admin/libros` (creación, edición de stock y catálogo).

2. **Cuenta Cliente:**
   - Se crea directamente desde la aplicación web ingresando a `/registro`.
   - Todos los usuarios registrados públicamente reciben de forma forzada el rol `cliente`.
   - Permite navegar el catálogo, agregar libros al carrito, ingresar dirección de despacho, pagar vía PayPal Sandbox y monitorear el pedido en `/pedidos`.

