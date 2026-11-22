const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    rol: {
      type: String,
      enum: ["cliente", "admin"],
      default: "cliente",
    },
  },
  { timestamps: true }
);

usuarioSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

usuarioSchema.methods.compararPassword = function compararPassword(candidato) {
  return bcrypt.compare(candidato, this.password);
};

usuarioSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("Usuario", usuarioSchema);
