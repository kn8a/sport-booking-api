const Booking = require("../models/bookingModel")
const asyncHandler = require("express-async-handler")

const checkAvailability = asyncHandler(async(req,res) => {
    console.log(req.params)
    let currentDate = new Date();
    let cDay = currentDate.getDate();
    let cMonth = currentDate.getMonth() + 1;
    let cYear = currentDate.getFullYear();
    //seperate date

    const date= {
        year: Number(req.params.date.slice(0,4)),
        month: Number(req.params.date.slice(5,7)),
        day: Number(req.params.date.slice(8))
    }

    if (
        (cYear == date.year && cMonth == date.month && cDay > date.day) ||
        (cYear == date.year && cMonth > date.month) ||
        (cYear > date.year)
    ) {
        res.status(400).json({message: "You cannot book in the past. Please select a future date"})
        return
    }
    
    //get booking for date - add Select only slots
    const existingBookings = await Booking.find({year:date.year, month:date.month, day:date.day}).select({slots:1}).populate('slots')
    console.log(existingBookings)
    let bookedSlots=[]
    if (existingBookings) {
        for (let i=0; i<existingBookings.length; i++) {
            bookedSlots.push(...existingBookings[i].slots)
        }
    }
    console.log(bookedSlots)

    const buildTimes = () => {
        let slots= []
        
        for (let i=7; i<22; i++) {

            let booked = false
            if (bookedSlots.indexOf(i) != -1) {
                booked = true
            }
            
            let price
            if (i<18) {
                price = 50
            } else {
                price = 100
            }
          slots.push({time: `${i}:00`, value: i, price: price, booked: booked})
          slots.push({time: `${i}:30`, value: i+0.5, price: price, booked: booked})
        }
        return slots
      }
      const times = buildTimes()
      console.log(times)
    res.status(200).json({times: times})
})

const newBooking = asyncHandler(async(req,res) => {
    console.log(req.body)
    const date= {
        year: Number(req.body.date.slice(0,4)),
        month: Number(req.body.date.slice(5,7)),
        day: Number(req.body.date.slice(8))
    }
    console.log(date)
    const totalAmount = req.body.slots.reduce((total, slot) => {
        return total + slot.price
    },0)
    console.log(totalAmount)
    const newBooking = await Booking.create({
        user: req.user._id,
        year: date.year,
        month: date.month,
        day: date.day,
        amount: totalAmount,
        slots: req.body.slots.map(slot => {return slot.value}),
        status: 'confirmed'
    })
    console.log(newBooking)


})

module.exports = {
    checkAvailability, newBooking
  }