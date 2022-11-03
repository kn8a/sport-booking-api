const mongoose = require("mongoose")

const logSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        text: {type: String},
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model("Log", logSchema)