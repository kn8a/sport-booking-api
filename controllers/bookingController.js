const Booking = require("../models/bookingModel")
const User = require("../models/userModel")
const asyncHandler = require("express-async-handler")

// function buildTimes(bookedSlots) {
//     let slots= []
    
//     for (let i=7; i<22; i++) {

//         let booked = false
//         if (bookedSlots.indexOf(i) != -1) {
//             booked = true
//         }
        
//         let price
//         if (i<18) {
//             price = 50
//         } else {
//             price = 100
//         }
        
//       slots.push({time: `${i}:00`, value: i, price: price, booked: booked})
        
//       booked = false
//       if (bookedSlots.indexOf(i) != -1) {
//         booked = true
//         }

//       slots.push({time: `${i}:30`, value: i+0.5, price: price, booked: booked})
//     }
//     return slots
//   }

  function buildTimes(bookedSlots) {
    let slots= []
    let hour = 7
    for (let i=7; i<22; i++) {
        console.log(i, hour)

        let booked = false
        if (bookedSlots.indexOf(hour) != -1) {
            booked = true
        }
        
        let price
        if (hour<18) {
            price = 50
        } else {
            price = 100
        }
        
      slots.push({time: `${hour}:00`, value: hour, price: price, booked: booked})
      hour = hour+0.5
        
      booked = false
      if (bookedSlots.indexOf(hour) != -1) {
        booked = true
        }

      slots.push({time: `${i}:30`, value: hour, price: price, booked: booked})
      hour= hour + 0.5
    }
    return slots
  }

  function dateSlicer(date) {
    return({
        year: Number(date.slice(0,4)),
        month: Number(date.slice(5,7)),
        day: Number(date.slice(8))
    })
  }

  function futureDateChecker(reqDate) {
    let currentDate = new Date();
    let cDay = currentDate.getDate();
    let cMonth = currentDate.getMonth() + 1;
    let cYear = currentDate.getFullYear();
    if (
        (cYear == reqDate.year && cMonth == reqDate.month && cDay > reqDate.day) ||
        (cYear == reqDate.year && cMonth > reqDate.month) ||
        (cYear > reqDate.year)
    ) {
        return true
    }
  }



//*check availability
const checkAvailability = asyncHandler(async(req,res) => {
    
    const date= dateSlicer(req.params.date)
    if (futureDateChecker(date)) {
        res.status(400).json({message: "You cannot book in the past. Please select a future date"})
        return
    }
    
    
    //*get booking for date - add Select only slots
    const existingBookings = await Booking.find({year:date.year, month:date.month, day:date.day}).select({slots:1})
    console.log(existingBookings)
    let bookedSlots=[]
    if (existingBookings) {
        for (let i=0; i<existingBookings.length; i++) {
            bookedSlots.push(...existingBookings[i].slots)
        }
    }
    console.log(bookedSlots)

    const times = buildTimes(bookedSlots)
    //console.log(times)
    res.status(200).json({times: times})
})

//*New booking
const newBooking = asyncHandler(async(req,res) => {

    //check for minimum 2 slots
    if (req.body.slots.length<2) {
        res.status(400).json({message: "Please select at least 2 consecutive slots and retry."})
        return
    }

    //check whether slots are consecutive
    for (let i=1; i<req.body.slots.length; i++) {
        if (req.body.slots[i].value - req.body.slots[i-1].value != 0.5) {
            res.status(400).json({message: "A booking must have consecutive time slots. If you need to book non consecutive times, you may do so in a separate booking"})
            return
        }
    }


    const date= dateSlicer(req.body.date)
    if (futureDateChecker(date)) {
        res.status(400).json({message: "You cannot book in the past. Please select a future date"})
        return
    }

    //get existing bookings
    const existingBookings = await Booking.find({year:date.year, month:date.month, day:date.day}).select({slots:1})
    //console.log(existingBookings)
    let bookedSlots=[]
    if (existingBookings) {
        for (let i=0; i<existingBookings.length; i++) {
            bookedSlots.push(...existingBookings[i].slots)
        }
    }
    
    //calculate price for the booking
    let total=0
    for (let i=0; i<req.body.slots.length; i++) {
        console.log(bookedSlots.indexOf(req.body.slots[i].value))
        if (bookedSlots.indexOf(req.body.slots[i].value) != -1) {
            res.status(400).json({
                message: 
                `One of more of the time slots you are trying to book has already been booked. 
                Please retry with a different time.`
            })
            total = 0
            console.log('already booked')
            return
        } else if (req.body.slots[i].value < 18) {
            total=total+50
        } else if (req.body.slots[i].value >= 18) {
            total=total+100
        }
    }

    const user = await User.findById(req.user._id)
    const newBalance = user.balance - total
    if (total>user.balance) {
        res.status(400).json({message: "Insufficient balance, please top-up and try again."})
        return
    }
    const userBalanceUpdate = await user.update({balance: user.balance-total})
    //console.log(userBalanceUpdate)
    if (!userBalanceUpdate) {
        res.status(400).json({message: "Database error. Please notify admin."})
        return
    }
    //create booking entry
    const newBooking = await Booking.create({
        user: req.user._id,
        year: date.year,
        month: date.month,
        day: date.day,
        amount: total,
        slots: req.body.slots.map(slot => {return slot.value}),
        status: 'confirmed'
    })
    console.log(newBooking)
    res.status(200).json({message: 'Booking confirmed', remainingBalance: newBalance})



})



module.exports = {
    checkAvailability, newBooking
  }