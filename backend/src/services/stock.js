const Libro = require("../models/Libro");
const AppError = require("../utils/AppError");

async function reservarStock(items) {
  const reservados = [];

  try {
    for (const item of items) {
      const actualizado = await Libro.findOneAndUpdate(
        {
          _id: item.libro,
          activo: true,
          stock: { $gte: item.cantidad },
        },
        { $inc: { stock: -item.cantidad } },
        { new: true }
      );

      if (!actualizado) {
        throw new AppError(
          `Stock insuficiente para el libro ${item.titulo || item.libro}`,
          409
        );
      }

      reservados.push(item);
    }

    return reservados;
  } catch (err) {
    await devolverStock(reservados);
    throw err;
  }
}

async function devolverStock(items) {
  for (const item of items) {
    await Libro.findByIdAndUpdate(item.libro, {
      $inc: { stock: item.cantidad },
    });
  }
}

module.exports = { reservarStock, devolverStock };
