const mongoose = require("mongoose");

async function conectarDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error("Falta MONGODB_URI");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  return mongoose.connection;
}

module.exports = { conectarDB };
