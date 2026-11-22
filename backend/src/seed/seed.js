require("dotenv").config();

const mongoose = require("mongoose");
const { conectarDB } = require("../config/db");
const Usuario = require("../models/Usuario");
const Libro = require("../models/Libro");

const LIBROS = [
  {
    titulo: "Cien años de soledad",
    autor: "Gabriel García Márquez",
    descripcion:
      "La saga de la familia Buendía en el mítico pueblo de Macondo.",
    precio: 18.5,
    stock: 25,
    categoria: "Ficción",
    imagen: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
  },
  {
    titulo: "El amor en los tiempos del cólera",
    autor: "Gabriel García Márquez",
    descripcion: "Una historia de amor que atraviesa décadas y obstáculos.",
    precio: 16.9,
    stock: 18,
    categoria: "Ficción",
    imagen: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400",
  },
  {
    titulo: "Sapiens",
    autor: "Yuval Noah Harari",
    descripcion: "Una breve historia de la humanidad desde la Edad de Piedra.",
    precio: 22.0,
    stock: 30,
    categoria: "No ficción",
    imagen: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400",
  },
  {
    titulo: "Hábitos atómicos",
    autor: "James Clear",
    descripcion: "Cómo pequeños cambios generan resultados extraordinarios.",
    precio: 19.5,
    stock: 22,
    categoria: "No ficción",
    imagen: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400",
  },
  {
    titulo: "El principito",
    autor: "Antoine de Saint-Exupéry",
    descripcion: "Un cuento poético sobre la amistad, el amor y la mirada infantil.",
    precio: 12.0,
    stock: 40,
    categoria: "Infantil",
    imagen: "https://images.unsplash.com/photo-1621351183012-e2f9972ea9f2?w=400",
  },
  {
    titulo: "Donde viven los monstruos",
    autor: "Maurice Sendak",
    descripcion: "La aventura de Max en la tierra de los monstruos salvajes.",
    precio: 14.5,
    stock: 15,
    categoria: "Infantil",
    imagen: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400",
  },
  {
    titulo: "Breve historia del tiempo",
    autor: "Stephen Hawking",
    descripcion: "Una introducción a la cosmología moderna para todos.",
    precio: 21.0,
    stock: 12,
    categoria: "Ciencia",
    imagen: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400",
  },
  {
    titulo: "El gen egoísta",
    autor: "Richard Dawkins",
    descripcion: "La evolución vista desde la perspectiva de los genes.",
    precio: 20.5,
    stock: 10,
    categoria: "Ciencia",
    imagen: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400",
  },
  {
    titulo: "Historia de dos ciudades",
    autor: "Charles Dickens",
    descripcion: "Londres y París en la época de la Revolución Francesa.",
    precio: 15.0,
    stock: 14,
    categoria: "Historia",
    imagen: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
  },
  {
    titulo: "Guns, Germs, and Steel",
    autor: "Jared Diamond",
    descripcion: "Por qué unas sociedades prosperaron más que otras.",
    precio: 23.5,
    stock: 9,
    categoria: "Historia",
    imagen: "https://images.unsplash.com/photo-1456513080880-7d36d38a4144?w=400",
  },
  {
    titulo: "Rayuela",
    autor: "Julio Cortázar",
    descripcion: "Una novela experimental que se puede leer en varios órdenes.",
    precio: 17.25,
    stock: 16,
    categoria: "Ficción",
    imagen: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400",
  },
  {
    titulo: "Cosmos",
    autor: "Carl Sagan",
    descripcion: "Un viaje por el universo y nuestro lugar en él.",
    precio: 24.0,
    stock: 11,
    categoria: "Ciencia",
    imagen: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400",
  },
];

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "Faltan SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD. Define ambas en .env antes de ejecutar el seed."
    );
    process.exit(1);
  }

  await conectarDB();

  await Usuario.deleteMany({});
  await Libro.deleteMany({});

  const admin = await Usuario.create({
    nombre: "Administrador",
    email,
    password,
    rol: "admin",
  });

  await Libro.insertMany(LIBROS);

  console.log(`Seed listo. Admin: ${admin.email}. Libros: ${LIBROS.length}.`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
