const mongoose = require("mongoose")

const logSchema = mongoose.Schema(
    {
        user_address: {
            type: String,
        },
        user_email: {
            type: String,
        },
        text: {type: String},
        type: {
            type: String,
            enum: ["booking", "refund", "topup", "other"],
          },
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model("Log", logSchema)