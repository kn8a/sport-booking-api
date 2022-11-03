const Booking = require("../models/bookingModel")
const User = require("../models/userModel")
const asyncHandler = require("express-async-handler")
const axios = require("axios");

const checkAvailability = asyncHandler(async(req,res) => {
    
    //getBkkTime()

    const localTime = await axios.get('https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok')
    .then(response => {
        return response.data
    })
    
    console.log(localTime)

    // const timeData = await fetch('https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok')
    // const bkkDate = await timeData.json 
    // console.log(bkkDate)
    
    const date= dateSlicer(req.params.date)

    
    // const bookDate = new Date(req.params.date)
    // console.log(bookDate)
    // const unixDate = Math.floor(bookDate.getTime()/1000)
    // console.log(unixDate)

    if (futureDateChecker(date,localTime)) {
        res.status(400).json({message: "You cannot book in the past. Please select a future date"})
        return
    }
    

    
    //*get booking for date - add Select only slots
    const existingBookings = await Booking.find({year:date.year, month:date.month, day:date.day, status:{$not: {$eq: 'cancelled'}}}).select({slots:1})
    //console.log(existingBookings)
    let bookedSlots=[]
    if (existingBookings) {
        for (let i=0; i<existingBookings.length; i++) {
            bookedSlots.push(...existingBookings[i].slots)
        }
    }
    //console.log(bookedSlots)

    const times = buildTimes(bookedSlots, localTime, date)
    //console.log(times)
    res.status(200).json({times: times})
})

module.exports = {
    checkAvailability, newBooking, getUpcomingBookings, cancelBooking
  }