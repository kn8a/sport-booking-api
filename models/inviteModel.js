const mongoose = require("mongoose")

const inviteSchema = mongoose.Schema(
    {
        address: {type: String},
        code: {type: String},
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model("Invite", inviteSchema)