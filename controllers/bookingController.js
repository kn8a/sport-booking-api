const Booking = require("../models/bookingModel")
const asyncHandler = require("express-async-handler")

const checkAvailability = asyncHandler(async(req,res) => {
    console.log(req.params)
    //seperate date
    const date= {
        year: Number(req.params.date.slice(0,4)),
        month: Number(req.params.date.slice(5,7)),
        day: Number(req.params.date.slice(8))
    }
    //get booking for date - add Select only slots
    const existingBookings = await Booking.find({year:date.year, month:date.month, day:date.day})
    console.log(existingBookings)

    const buildTimes = () => {
        let slots= []
        for (let i=7; i<22; i++) {
            
            let price
            if (i<18) {
                price = 50
            } else {
                price = 100
            }
          slots.push({time: `${i}:00`, value: i, price: price})
          slots.push({time: `${i}:30`, value: i+0.5, price: price})
        }
        return slots
      }
      const times = buildTimes()
      console.log(times)
    res.status(200).json({times: times})
})

module.exports = {
    checkAvailability
  }