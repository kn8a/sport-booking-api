const mongoose = require("mongoose")

const bookingSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        slot: {
            start: {
                Date
            },
            end: {
                Date
            },
            total: {
                Number
            }
        },
        status: {
            type: String,
            required: true,
            default: "pending",
            enum: ["pending", "confirmed", "cancelled"]
        },
        notes: [{type: String}],
        payment: {
            type: mongoose.Schema.Types.ObjectId, ref: "Payment"
        }
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model("Booking", bookingSchema)