const Booking = require("../models/bookingModel")
const asyncHandler = require("express-async-handler")

const checkAvailability = asyncHandler(async(req,res) => {
    console.log(req.params)
    return
})

module.exports = {
    checkAvailability
  }