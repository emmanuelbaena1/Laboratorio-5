const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const Usuario = require("../src/models/Usuario");
const Libro = require("../src/models/Libro");
const Pedido = require("../src/models/Pedido");
const {
  request,
  crearServidor,
  iniciarDb,
  limpiarDb,
  cerrarDb,
  mockPaypal,
  resetPaypal,
} = require("./helpers");

const direccion = {
  calle: "Calle 1",
  ciudad: "Bogotá",
  region: "Cundinamarca",
  codigoPostal: "110111",
  telefono: "3001234567",
};

describe("LibroYa integración", () => {
  let app;

  before(async () => {
    await iniciarDb();
    app = crearServidor();
  });

  after(async () => {
    resetPaypal();
    await cerrarDb();
  });

  beforeEach(async () => {
    await limpiarDb();
    resetPaypal();
  });

  async function registrarCliente(overrides = {}) {
    const res = await request(app)
      .post("/api/auth/registro")
      .send({
        nombre: "Cliente Demo",
        email: overrides.email || "cliente@test.com",
        password: overrides.password || "secreto123",
        rol: "admin",
      });
    return res;
  }

  async function crearAdmin() {
    const admin = await Usuario.create({
      nombre: "Admin",
      email: "admin@test.com",
      password: "adminpass1",
      rol: "admin",
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "admin@test.com",
      password: "adminpass1",
    });
    return { admin, token: login.body.token };
  }

  it("GET /health responde 200", async () => {
    const res = await request(app).get("/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
  });

  it("login: registro, login y /me", async () => {
    const registro = await registrarCliente();
    assert.equal(registro.status, 201);
    assert.equal(registro.body.usuario.rol, "cliente");
    assert.ok(registro.body.token);

    const login = await request(app).post("/api/auth/login").send({
      email: "cliente@test.com",
      password: "secreto123",
    });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.usuario.email, "cliente@test.com");
  });

  it("permisos por rol: cliente no crea libros, admin sí", async () => {
    const cliente = await registrarCliente();
    const prohibido = await request(app)
      .post("/api/libros")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({
        titulo: "X",
        autor: "Y",
        descripcion: "Z",
        precio: 10,
        stock: 1,
        categoria: "Ficción",
        imagen: "https://example.com/a.jpg",
      });
    assert.equal(prohibido.status, 403);

    const { token } = await crearAdmin();
    const creado = await request(app)
      .post("/api/libros")
      .set("Authorization", `Bearer ${token}`)
      .send({
        titulo: "Libro Admin",
        autor: "Autor",
        descripcion: "Desc",
        precio: 12.5,
        stock: 5,
        categoria: "Ciencia",
        imagen: "https://example.com/b.jpg",
      });
    assert.equal(creado.status, 201);
    assert.equal(creado.body.libro.titulo, "Libro Admin");
  });

  it("pedido ajeno responde 403", async () => {
    mockPaypal({ orderId: "ORDER-AJENO" });
    const dueño = await registrarCliente({ email: "dueno@test.com" });
    const otro = await registrarCliente({ email: "otro@test.com" });

    const libro = await Libro.create({
      titulo: "Uno",
      autor: "A",
      descripcion: "D",
      precio: 10,
      stock: 3,
      categoria: "Ficción",
      imagen: "https://example.com/c.jpg",
    });

    const pago = await request(app)
      .post("/api/pagos/crear")
      .set("Authorization", `Bearer ${dueño.body.token}`)
      .send({
        items: [{ libroId: libro._id.toString(), cantidad: 1, precio: 999 }],
        direccion,
      });
    assert.equal(pago.status, 201);

    const capturado = await request(app)
      .post("/api/pagos/capturar")
      .set("Authorization", `Bearer ${dueño.body.token}`)
      .send({ paypalOrderId: "ORDER-AJENO" });
    assert.equal(capturado.status, 200);

    const pedidoId = capturado.body.pedido._id;
    const ajeno = await request(app)
      .get(`/api/pedidos/${pedidoId}`)
      .set("Authorization", `Bearer ${otro.body.token}`);
    assert.equal(ajeno.status, 403);

    const propio = await request(app)
      .get(`/api/pedidos/${pedidoId}`)
      .set("Authorization", `Bearer ${dueño.body.token}`);
    assert.equal(propio.status, 200);
  });

  it("total calculado en el servidor ignora precio falso", async () => {
    mockPaypal({ orderId: "ORDER-TOTAL" });
    const cliente = await registrarCliente();
    const libro = await Libro.create({
      titulo: "Precio fijo",
      autor: "A",
      descripcion: "D",
      precio: 20,
      stock: 5,
      categoria: "Ficción",
      imagen: "https://example.com/d.jpg",
    });

    const res = await request(app)
      .post("/api/pagos/crear")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({
        items: [
          { libroId: libro._id.toString(), cantidad: 2, precio: 1 },
        ],
        direccion,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.total, 40);
    assert.equal(res.body.pedido.items[0].precio, 20);
    assert.equal(res.body.pedido.estado, "PendientePago");
    assert.equal(res.body.pedido.moneda, "USD");

    const actualizado = await Libro.findById(libro._id);
    assert.equal(actualizado.stock, 3);
  });

  it("captura repetida no duplica ni altera stock", async () => {
    mockPaypal({ orderId: "ORDER-IDEM", captureId: "CAP-1" });
    const cliente = await registrarCliente();
    const libro = await Libro.create({
      titulo: "Idem",
      autor: "A",
      descripcion: "D",
      precio: 15,
      stock: 4,
      categoria: "Ciencia",
      imagen: "https://example.com/e.jpg",
    });

    await request(app)
      .post("/api/pagos/crear")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({
        items: [{ libroId: libro._id.toString(), cantidad: 1 }],
        direccion,
      });

    const c1 = await request(app)
      .post("/api/pagos/capturar")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({ paypalOrderId: "ORDER-IDEM" });
    assert.equal(c1.status, 200);
    assert.equal(c1.body.pedido.estado, "Pagado");
    assert.equal(c1.body.pedido.captureId, "CAP-1");

    const c2 = await request(app)
      .post("/api/pagos/capturar")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({ paypalOrderId: "ORDER-IDEM" });
    assert.equal(c2.status, 200);
    assert.equal(c2.body.pedido.estado, "Pagado");
    assert.equal(c2.body.pedido.captureId, "CAP-1");

    const pedidos = await Pedido.find({ paypalOrderId: "ORDER-IDEM" });
    assert.equal(pedidos.length, 1);

    const stock = await Libro.findById(libro._id);
    assert.equal(stock.stock, 3);
  });

  it("compra simultánea de la última unidad", async () => {
    let counter = 0;
    mockPaypal({
      orderId: () => `ORDER-RACE-${++counter}`,
    });

    const c1 = await registrarCliente({ email: "a@test.com" });
    const c2 = await registrarCliente({ email: "b@test.com" });
    const libro = await Libro.create({
      titulo: "Último",
      autor: "A",
      descripcion: "D",
      precio: 9,
      stock: 1,
      categoria: "Historia",
      imagen: "https://example.com/f.jpg",
    });

    const payload = {
      items: [{ libroId: libro._id.toString(), cantidad: 1 }],
      direccion,
    };

    const [r1, r2] = await Promise.all([
      request(app)
        .post("/api/pagos/crear")
        .set("Authorization", `Bearer ${c1.body.token}`)
        .send(payload),
      request(app)
        .post("/api/pagos/crear")
        .set("Authorization", `Bearer ${c2.body.token}`)
        .send(payload),
    ]);

    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [201, 409]);

    const stock = await Libro.findById(libro._id);
    assert.equal(stock.stock, 0);

    const pendientes = await Pedido.find({
      estado: "PendientePago",
      "items.libro": libro._id,
    });
    assert.equal(pendientes.length, 1);
  });

  it("PATCH estado solo avanza un paso", async () => {
    mockPaypal({ orderId: "ORDER-ESTADO" });
    const cliente = await registrarCliente();
    const { token: adminToken } = await crearAdmin();
    const libro = await Libro.create({
      titulo: "Estado",
      autor: "A",
      descripcion: "D",
      precio: 10,
      stock: 2,
      categoria: "Ficción",
      imagen: "https://example.com/g.jpg",
    });

    await request(app)
      .post("/api/pagos/crear")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({
        items: [{ libroId: libro._id.toString(), cantidad: 1 }],
        direccion,
      });

    const capturado = await request(app)
      .post("/api/pagos/capturar")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({ paypalOrderId: "ORDER-ESTADO" });

    const id = capturado.body.pedido._id;

    const salto = await request(app)
      .patch(`/api/pedidos/${id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "Despachado" });
    assert.equal(salto.status, 400);

    const ok = await request(app)
      .patch(`/api/pedidos/${id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "Preparando" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.pedido.estado, "Preparando");
  });

  it("cancelar libera stock una sola vez", async () => {
    mockPaypal({ orderId: "ORDER-CANCEL" });
    const cliente = await registrarCliente();
    const libro = await Libro.create({
      titulo: "Cancel",
      autor: "A",
      descripcion: "D",
      precio: 8,
      stock: 5,
      categoria: "Infantil",
      imagen: "https://example.com/h.jpg",
    });

    await request(app)
      .post("/api/pagos/crear")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({
        items: [{ libroId: libro._id.toString(), cantidad: 2 }],
        direccion,
      });

    let stock = await Libro.findById(libro._id);
    assert.equal(stock.stock, 3);

    const cancel = await request(app)
      .post("/api/pagos/cancelar")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({ paypalOrderId: "ORDER-CANCEL" });
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.pedido.estado, "Cancelado");

    stock = await Libro.findById(libro._id);
    assert.equal(stock.stock, 5);

    await request(app)
      .post("/api/pagos/cancelar")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({ paypalOrderId: "ORDER-CANCEL" });

    stock = await Libro.findById(libro._id);
    assert.equal(stock.stock, 5);
  });

  it("GET /api/pedidos omite PendientePago y Cancelado", async () => {
    mockPaypal({ orderId: "ORDER-HIDE" });
    const cliente = await registrarCliente();
    const libro = await Libro.create({
      titulo: "Hide",
      autor: "A",
      descripcion: "D",
      precio: 7,
      stock: 3,
      categoria: "Ficción",
      imagen: "https://example.com/i.jpg",
    });

    await request(app)
      .post("/api/pagos/crear")
      .set("Authorization", `Bearer ${cliente.body.token}`)
      .send({
        items: [{ libroId: libro._id.toString(), cantidad: 1 }],
        direccion,
      });

    const lista = await request(app)
      .get("/api/pedidos")
      .set("Authorization", `Bearer ${cliente.body.token}`);
    assert.equal(lista.status, 200);
    assert.equal(lista.body.pedidos.length, 0);
  });

  it("modelos tienen timestamps", async () => {
    const u = await Usuario.create({
      nombre: "T",
      email: "ts@test.com",
      password: "abcdef",
    });
    const l = await Libro.create({
      titulo: "T",
      autor: "A",
      descripcion: "D",
      precio: 1,
      stock: 1,
      categoria: "Ficción",
      imagen: "https://example.com/j.jpg",
    });
    const p = await Pedido.create({
      usuario: u._id,
      items: [{ libro: l._id, titulo: "T", cantidad: 1, precio: 1 }],
      direccion,
      total: 1,
      moneda: "USD",
      estado: "PendientePago",
      paypalOrderId: "ORDER-TS",
    });

    assert.ok(u.createdAt);
    assert.ok(u.updatedAt);
    assert.ok(l.createdAt);
    assert.ok(l.updatedAt);
    assert.ok(p.createdAt);
    assert.ok(p.updatedAt);
  });
});
