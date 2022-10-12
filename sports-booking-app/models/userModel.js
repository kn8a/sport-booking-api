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
      profile_pic: {
        type: String,
        default: "/api/file/630dc2552f6866ee7ec33221",
      },
      notes: {
        type: String,
        default: "",
      },
      balance: {
        type: Number,
        default: 0,
      },
      
    },
    {
      timestamps: true,
    }
  )
  
  module.exports = mongoose.model("User", userSchema)