const mongoose = require("mongoose")

const userSchema = mongoose.Schema(
    {
      name_first: {
        type: String,
        required: [true, "Please add a name"],
      },
      name_last: {
        type: String,
        required: [true, "Please add a last name"],
      },
      email: {
        type: String,
        required: [true, "Please add a display name"],
        unique: true,
      },
      address: {
        type: String,
        default: "",
      },
      password: {
        type: String,
        required: [true, "Please add a password"],
      },
      notes: [],
      balance: {
        type: Number,
        default: 0,
      },
      role: {
        type: String,
        required: true,
        default: "user",
        enum: ["user", "admin", "dev", "manager", "guard"],
      },
      status: {
        type: String,
        required: true,
        default: "pending",
        enum: ["pending", "approved", "suspended", "denied",],
      },
    },
    {
      timestamps: true,
    }
  )
  
  module.exports = mongoose.model("User", userSchema)