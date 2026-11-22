# PRD — Documento de Requisitos del Producto (LibroYa)

## 1. Visión y Suposición del Negocio

**LibroYa** es una plataforma de comercio electrónico de libros físicos.

> **Suposición fundamental del modelo:**  
> LibroYa no cuenta con tienda física ni servicio de retiro en punto de venta. La operación se basa en una **bodega central de almacenamiento** desde la cual se despachan los pedidos directamente a la dirección del comprador. Por ende, la precisión del inventario de bodega y el seguimiento transparente del ciclo de despacho son críticos para evitar sobreventas e incumplimientos.

---

## 2. Problema que Resuelve

1. **Riesgo de Sobreventa:** En compras concurrentes, la falta de una reserva atómica de inventario durante el proceso de pago suele generar órdenes pagadas sin stock disponible.
2. **Inconsistencia de Precios:** Los clientes malintencionados pueden alterar el valor de los productos manipulando el frontend o las peticiones HTTP hacia la pasarela de pagos.
3. **Falta de Trazabilidad en Tiempo Real:** Los clientes desconocen el estado de su paquete tras pagar, y los administradores carecen de una herramienta visual para gestionar el flujo de despacho sin recargar pantallas.

---

## 3. Roles y Permisos

| Rol | Descripción | Permisos y Alcance |
| :--- | :--- | :--- |
| **Visitante / Anónimo** | Usuario no autenticado | Puede navegar el catálogo, buscar por título o autor, filtrar por categorías, consultar fichas con stock en bodega y gestionar un carrito local. |
| **Cliente Autenticado** | Comprador registrado | Todo lo anterior más: avanzar a `/checkout`, ingresar dirección de entrega, completar el pago con PayPal Sandbox, cancelar pagos pendientes y consultar su historial de pedidos en tiempo real en `/pedidos`. |
| **Administrador** | Personal de operaciones y bodega | Acceso a las rutas `/admin/*`. Gestiona el catálogo de libros (crear, editar, ajustar stock en bodega, activar/desactivar títulos) y gestiona el despacho en el tablero Kanban en tiempo real (`/admin/pedidos`). |

---

## 4. Alcance del MVP

### Incluido en el MVP:
- Catálogo público con búsqueda textual `q` y filtro de categorías.
- Ficha de detalle de producto con disponibilidad real de bodega.
- Carrito de compras local (`localStorage`) que respeta topes de stock.
- Checkout con formulario de dirección de entrega.
- Integración de pasarela de pagos con **PayPal Sandbox** (Orders API v2) con recálculo estricto en el servidor.
- Manejo idempotente de pagos: reserva temporal de stock al crear la orden y liberación inmediata en caso de cancelación o fallo.
- Historial de pedidos del cliente sincronizado mediante WebSockets (excluyendo estados transitorios).
- Tablero Kanban drag-and-drop para administración con avance de estado paso a paso y rollback automático ante errores.
- Autenticación JWT con protección contra fuerza bruta (rate limiting).

### No incluido en el MVP:
- Soporte para pagos contra entrega o pasarelas locales adicionales.
- Múltiples bodegas o cálculo dinámico de tarifas de envío según geolocalización.
- Módulo de devoluciones o reembolsos post-entrega.
- Sistema de reseñas o valoraciones de libros.

---

## 5. Requisitos Funcionales

### RF-1: Gestión de Identidad y Acceso
- El endpoint `/api/auth/registro` asigna obligatoriamente el rol `cliente`. El cliente no puede elevar sus privilegios mediante el payload.
- El login bloquea la IP por 15 minutos al acumular 10 intentos fallidos consecutivos, omitiendo las solicitudes exitosas (`skipSuccessfulRequests: true`).
- Las sesiones se mantienen mediante tokens JWT almacenados en el cliente y validados en el servidor mediante el middleware `proteger`.

### RF-2: Catálogo de Libros y Bodega
- El catálogo público (`GET /api/libros`) únicamente ofrece libros con bandera `activo: true`.
- Los libros cuentan con campos: `titulo`, `autor`, `descripcion`, `precio`, `stock`, `categoria`, `imagen` y `activo`.
- Solo los administradores pueden crear libros, modificar datos, activar/desactivar o ajustar el stock directamente (`PATCH /api/libros/:id/stock`).

### RF-3: Carrito de Compras
- El carrito se conserva en el navegador del usuario (`localStorage`).
- La cantidad agregada de un libro no puede superar el `stock` disponible en bodega registrado al momento de la interacción.

### RF-4: Pagos e Idempotencia (PayPal Sandbox)
- **Creación de Orden (`POST /api/pagos/crear`):**
  - El servidor recalcula el total consultando los precios actuales en la base de datos (ignora precios enviados por el cliente).
  - Reserva el stock de inmediato usando operaciones atómicas (`$inc` negativo condicionado a `stock >= cantidad`).
  - Crea la orden en PayPal Orders v2 en moneda `USD`.
  - Registra el pedido en base de datos con estado `PendientePago`.
- **Cancelación (`POST /api/pagos/cancelar`):**
  - Si el usuario cancela en la ventana de PayPal o surge un error, se pasa el estado a `Cancelado` y se repone el stock una sola vez.
- **Captura (`POST /api/pagos/capturar`):**
  - Ejecuta la captura en PayPal. Valida que el estado sea `COMPLETED`, el monto exacto y la moneda `USD`.
  - Si coincide, almacena `captureId`, transiciona a `Pagado` y emite el evento WebSocket `pedido:actualizado`.
  - Si el pedido ya estaba en `Pagado`, responde el pedido sin duplicar capturas ni modificar stock.
  - Si la captura falla o los montos no cuadran, devuelve el stock y marca `Cancelado`.

### RF-5: Historial y Monitoreo en Tiempo Real
- El endpoint `GET /api/pedidos` omite pedidos en `PendientePago` y `Cancelado`.
- Clientes solo leen sus propios pedidos; administradores leen todos los pedidos visibles.
- Al emitirse `pedido:actualizado` por WebSockets, las vistas `/pedidos` y `/admin/pedidos` se actualizan reactivamente sin recargar la página.

### RF-6: Tablero Kanban Administrativo
- Visualización en cuatro columnas: `Pagado`, `Preparando`, `Despachado`, `Entregado`.
- El avance de estado es unidireccional y de un solo paso:
  $$\text{Pagado} \longrightarrow \text{Preparando} \longrightarrow \text{Despachado} \longrightarrow \text{Entregado}$$
- Si el administrador intenta saltar pasos (ej. `Pagado` a `Despachado`) o retroceder, el backend rechaza con `400 Bad Request` y la tarjeta regresa automáticamente a su columna de origen.

---

## 6. Requisitos No Funcionales

- **RNF-1 Seguridad:** Cifrado de contraseñas con bcrypt (cost factor adecuado), uso de Helmet para encabezados HTTP seguros, configuración de CORS restringido a `CLIENT_URL`, validación de schemas con Zod.
- **RNF-2 Consistencia Transaccional:** Uso de filtros atómicos en MongoDB para reserva y devolución de inventario, impidiendo condiciones de carrera en ventas concurrentes de última unidad.
- **RNF-3 Concurrencia y Tiempo Real:** Conexión persistente mediante Socket.IO con salas segmentadas (`admins` y `user:{id}`) para proteger la privacidad de los eventos.
- **RNF-4 Experiencia de Usuario (UX):** Diseño responsivo (mobile-first), feedback visual de carga en captura de pagos y persistencia local del carrito.

---

## 7. Flujos Principales de la Aplicación

### A. Flujo de Compra Exitosa
```
[Cliente] Agrega libros al carrito
    │
    ▼
[Cliente] Ingresa a /checkout y completa dirección
    │
    ▼
[Next.js] Solicita POST /api/pagos/crear
    │
    ├──> [Express] Recalcula precios de MongoDB
    ├──> [Express] Reserva stock con decremento atómico
    └──> [PayPal] Crea orden Sandbox por el total del servidor
    │
    ▼
[Cliente] Aprueba el pago en el modal de PayPal
    │
    ▼
[Next.js] Ejecuta POST /api/pagos/capturar con paypalOrderId
    │
    ├──> [Express] Captura en PayPal Sandbox
    ├──> [Express] Valida estado COMPLETED, monto y moneda USD
    ├──> [Express] Actualiza pedido a estado "Pagado"
    └──> [Socket.IO] Emite "pedido:actualizado" a cliente y admins
    │
    ▼
[Next.js] Vacía carrito local y muestra confirmación con enlace a /pedidos
```

### B. Flujo de Cancelación o Fallo de Pago
```
[Cliente] Hace clic en Cancelar en PayPal o la pasarela falla
    │
    ▼
[Next.js] Dispara onCancel/onError en PayPalCheckout
    │
    ▼
[Express] Recibe POST /api/pagos/cancelar
    │
    ├──> [MongoDB] Devuelve el stock reservado a los libros
    └──> [MongoDB] Actualiza estado del pedido a "Cancelado"
    │
    ▼
[Next.js] Muestra alerta: "Pago cancelado. El stock se liberó."
```

### C. Flujo de Despacho en Kanban (Admin)
```
[Admin] Arrastra tarjeta en /admin/pedidos
    │
    ▼
[Frontend] Actualiza posición optimista y llama PATCH /api/pedidos/:id/estado
    │
    ├── Si destino == estado siguiente:
    │     ├── [Express] Guarda nuevo estado en DB
    │     ├── [Socket.IO] Notifica "pedido:actualizado"
    │     └── [Frontend] Confirma posición de la tarjeta
    │
    └── Si destino != estado siguiente:
          ├── [Express] Responde 400 Bad Request
          └── [Frontend] Revierte la tarjeta a su columna anterior y muestra error
```

---

## 8. Criterios de Aceptación del Sistema

1. **Última unidad disponible:** Dos clientes intentando comprar simultáneamente el último ejemplar de un libro: solo uno concreta la reserva; el segundo recibe error de stock insuficiente y no se genera orden en PayPal.
2. **Protección de precios:** Un precio alterado manualmente en el body de la petición HTTP no modifica el total guardado ni el monto cobrado por PayPal.
3. **Privacidad de pedidos:** Un cliente no puede consultar pedidos ajenos mediante `/api/pedidos/:id` (responde `403 Forbidden`).
4. **Respeto a estados visibles:** En ningún caso aparecen pedidos en `PendientePago` o `Cancelado` en `/pedidos` ni en el Kanban de administración.
5. **Reversión de Kanban:** Arrastrar un pedido de `Pagado` directamente a `Despachado` muestra un mensaje de error y la tarjeta retorna a `Pagado`.

---

## 9. Limitaciones Conocidas

- Entorno configurado para una única divisa operativa (`USD`).
- Pasarela exclusiva para PayPal Sandbox (no admite tarjetas de crédito directas sin pasar por PayPal).
- La conexión a Socket.IO requiere que el cliente mantenga conectividad a internet; en caso de reconexión, Next.js recarga la lista mediante API REST.

