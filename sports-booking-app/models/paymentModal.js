const mongoose = require("mongoose")

const paymentSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
        },
        status: {
            type: String,
            required: true,
            default: "pending",
            enum: ["pending", "paid", "cancelled"]
        },
        type: {
            type: String,
            required: true,
            enum: ["cash", "transfer", "balance", "balance+cash", "balance+transfer"]
        },
        notes: [{type: String}],
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model("Booking", bookingSchema)