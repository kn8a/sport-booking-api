const Booking = require("../models/bookingModel")
const User = require("../models/userModel")
const Log = require("../models/logModel")
const asyncHandler = require("express-async-handler")
const axios = require("axios")
const { MailtrapClient } = require("mailtrap")

const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN })
const sender = {
  name: "Tennis Admin",
  email: process.env.MAILTRAP_SENDER_EMAIL,
}

function buildTimes(bookedSlots, localTime, date) {
  // console.log(date)
  let slots = []
  let hour = 7
  for (let i = 7; i < 22; i++) {
    //console.log(i, hour)

    let booked = false
    if (
      bookedSlots.indexOf(hour) != -1 ||
      (localTime.year == date.year &&
        localTime.month == date.month &&
        localTime.day == date.day &&
        hour <= localTime.hour + 0.5)
    ) {
      booked = true
    }

    let price
    if (hour < 18) {
      price = 50
    } else {
      price = 100
    }

    slots.push({
      time: `${hour}:00`,
      value: hour,
      price: price,
      booked: booked,
    })
    hour = hour + 0.5

    booked = false
    if (
      bookedSlots.indexOf(hour) != -1 ||
      (localTime.year == date.year &&
        localTime.month == date.month &&
        localTime.day == date.day &&
        hour <= localTime.hour + 0.5)
    ) {
      booked = true
    }

    slots.push({ time: `${i}:30`, value: hour, price: price, booked: booked })
    hour = hour + 0.5
  }
  return slots
}

function dateSlicer(date) {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8)),
  }
}

function futureDateChecker(reqDate, localTime) {
  // let currentDate = new Date();
  // let cDay = currentDate.getDate();
  // let cMonth = currentDate.getMonth() + 1;
  // let cYear = currentDate.getFullYear();
  if (
    (localTime.year == reqDate.year &&
      localTime.month == reqDate.month &&
      localTime.day > reqDate.day) ||
    (localTime.year == reqDate.year && localTime.month > reqDate.month) ||
    localTime.year > reqDate.year
  ) {
    return true
  }
}

function getBkkTime() {
  axios.get(
    "https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok"
  )
}

//*check availability
const checkAvailability = asyncHandler(async (req, res) => {
  //getBkkTime()

  const localTime = await axios
    .get("https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok")
    .then((response) => {
      return response.data
    })

  //console.log(localTime)

  // const timeData = await fetch('https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok')
  // const bkkDate = await timeData.json
  // console.log(bkkDate)

  const date = dateSlicer(req.params.date)

  // const bookDate = new Date(req.params.date)
  // console.log(bookDate)
  // const unixDate = Math.floor(bookDate.getTime()/1000)
  // console.log(unixDate)

  if (futureDateChecker(date, localTime)) {
    res
      .status(400)
      .json({
        message: "You cannot book in the past. Please select a future date",
      })
    return
  }

  //*get booking for date - add Select only slots
  const existingBookings = await Booking.find({
    year: date.year,
    month: date.month,
    day: date.day,
    status: { $not: { $eq: "cancelled" } },
  }).select({ slots: 1 })
  //console.log(existingBookings)
  let bookedSlots = []
  if (existingBookings) {
    for (let i = 0; i < existingBookings.length; i++) {
      bookedSlots.push(...existingBookings[i].slots)
    }
  }
  //console.log(bookedSlots)

  const times = buildTimes(bookedSlots, localTime, date)
  //console.log(times)
  res.status(200).json({ times: times })
})

//*New booking
const newBooking = asyncHandler(async (req, res) => {
  //check for minimum 2 slots
  if (req.body.slots.length < 2) {
    res
      .status(400)
      .json({
        message: "Please select at least 2 consecutive slots and retry.",
      })
    return
  }

  //check whether slots are consecutive
  for (let i = 1; i < req.body.slots.length; i++) {
    if (req.body.slots[i].value - req.body.slots[i - 1].value != 0.5) {
      res
        .status(400)
        .json({
          message:
            "A booking must have consecutive time slots. If you need to book non consecutive times, you may do so in a separate booking",
        })
      return
    }
  }

  const localTime = await axios
    .get("https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok")
    .then((response) => {
      return response.data
    })

  //console.log(localTime)

  const date = dateSlicer(req.body.date)
  //console.log(date)
  if (futureDateChecker(date, localTime)) {
    res
      .status(400)
      .json({
        message: "You cannot book in the past. Please select a future date",
      })
    return
  }

  //get existing bookings
  const existingBookings = await Booking.find({
    year: date.year,
    month: date.month,
    day: date.day,
    status: { $not: { $eq: "cancelled" } },
  }).select({ slots: 1 })
  //console.log(existingBookings)
  let bookedSlots = []
  if (existingBookings) {
    for (let i = 0; i < existingBookings.length; i++) {
      bookedSlots.push(...existingBookings[i].slots)
    }
  }

  //calculate price for the booking
  let total = 0
  for (let i = 0; i < req.body.slots.length; i++) {
    //console.log(bookedSlots.indexOf(req.body.slots[i].value))
    if (bookedSlots.indexOf(req.body.slots[i].value) != -1) {
      res.status(400).json({
        message: `One of more of the time slots you are trying to book has already been booked. 
                Please retry with a different time.`,
      })
      total = 0
      //console.log("already booked")
      return
    } else if (req.body.slots[i].value < 18) {
      total = total + 50
    } else if (req.body.slots[i].value >= 18) {
      total = total + 100
    }
  }

  const user = await User.findById(req.user._id)
  const newBalance = user.balance - total
  //console.log(user.balance, total)
  if (total > user.balance) {
    res
      .status(400)
      .json({ message: "Insufficient balance, please top-up and try again." })
    return
  }

  //^date contructor
  //console.log(typeof(req.body.slots[0].value))
  let hour = 0
  let minute = 0
  if (Math.trunc(req.body.slots[0].value) < req.body.slots[0].value) {
    hour = Math.trunc(req.body.slots[0].value)
    minute = 30
  } else {
    hour = req.body.slots[0].value
    minute = 0
  }

  const bookDate = new Date(date.year, date.month, date.day, hour, minute)
  //console.log(bookDate)
  const unixDate = Math.floor(bookDate.getTime() / 1000)
  //console.log(unixDate)

  const userBalanceUpdate = await user.update({ balance: user.balance - total })
  //console.log(userBalanceUpdate)
  if (!userBalanceUpdate) {
    res.status(400).json({ message: "Database error. Please notify admin." })
    return
  }
  //create booking entry
  const newBooking = await Booking.create({
    user: req.user._id,
    year: date.year,
    month: date.month,
    day: date.day,
    amount: total,
    slots: req.body.slots.map((slot) => {
      return slot.value
    }),
    slots_full: req.body.slots,
    status: "confirmed",
    //20221027.5
    date: unixDate,
  })
  //log the booking
  const newLog = await Log.create({
    user_address: req.user.address,
    type: "booking",
    text: `${req.user.address} booked ${req.body.slots.length / 2} hour/s, on ${
      date.day
    }/${date.month}/${date.year}, totalling ${total}. User's balance is now: ${
      user.balance - total
    }`,
  })
  //send confirmation email
  client.send({
    from: sender,
    to: [{ email: req.user.email }],
    subject: `Tennis booking confirmation`,
    text: `
        Hi ${req.user.name_first}, 
        
        Your booking of time slots ${req.body.slots.map((slot) => {return slot.time})} (${req.body.slots.length / 2} hour/s) on ${date.day}/${date.month}/${date.year} is confirmed.
        
        Confirmation #: ${newBooking._id.toString()}
        Total amount charged: ${newBooking.amount}
        Remaining account balance: ${user.balance - total}

        This is an auto-generated email.
        `,
  })

  res
    .status(200)
    .json({ message: "Booking confirmed", remainingBalance: newBalance })
})

//*Get my booking
const getUpcomingBookings = asyncHandler(async (req, res) => {
  const localTime = await axios
    .get("https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok")
    .then((response) => {
      return response.data
    })

  const requestTime = new Date(
    localTime.year,
    localTime.month,
    localTime.day,
    localTime.hour,
    localTime.minute
  )
  const unixDate = Math.floor(requestTime.getTime() / 1000)

  const upcoming = await Booking.find({
    user: req.user._id,
    date: { $gte: `${unixDate}` },
    status: "confirmed",
  }).sort({ date: 1 })
  //console.log(upcoming)
  res.status(200).json({ upcoming: upcoming })
})

const cancelBooking = asyncHandler(async (req, res) => {
  //console.log(req.body)

  //get booking
  const booking = await Booking.findById(req.body._id)
  //check if booking is valid
  if (!booking) {
    res.status(400).json({ message: "No such booking in the database" })
    return
  }
  //check if user is owner of booking
  if (booking.user.toString() != req.user._id.toString()) {
    res
      .status(400)
      .json({ message: "You are not authorized to cancel this booking" })
    return
  }
  //check that the booking is confirmed status
  if (booking.status != "confirmed") {
    res
      .status(400)
      .json({
        message: `The booking is in ${booking.status} status, and cannot be cancelled.`,
      })
    return
  }

  const localTime = await axios
    .get("https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok")
    .then((response) => {
      return response.data
    })

  //check that booking is not in the past
  const requestTime = new Date(
    localTime.year,
    localTime.month,
    localTime.day,
    localTime.hour,
    localTime.minute
  )
  const requestUnixDate = Math.floor(requestTime.getTime() / 1000)

  let hour = 0
  let minute = 0
  if (Math.trunc(booking.slots[0]) < booking[0]) {
    hour = Math.trunc(booking.slots[0])
    minute = 30
  } else {
    hour = booking.slots[0]
    minute = 0
  }
  const bookingTime = new Date(
    booking.year,
    booking.month,
    booking.day,
    hour,
    minute
  )
  const bookingUnixTime = Math.floor(bookingTime.getTime() / 1000)

  if (bookingUnixTime < requestUnixDate) {
    res
      .status(400)
      .json({
        message: `Cannot cancel a past booking or a booking that already started`,
      })
    return
  }

  //change booking status to cancelled
  const updatedBooking = await booking.update({ status: "cancelled" })

  //update user balance
  const user = await User.findById(req.user._id)
  const updatedUser = await user.update({
    balance: user.balance + booking.amount,
  })
  //console.log(updatedUser)

  const newLog = await Log.create({
    user_address: user.address,
    user_email: user.email,
    type: "refund",
    text: `${user.name_first} at ${user.address} cancelled ${booking.slots.length / 2} hour/s, on ${booking.day}/${booking.month}/${booking.year}, totalling ${booking.amount}. User's balance is now: ${user.balance + booking.amount}`,
  })

  //send confirmation email
  client.send({
    from: sender,
    to: [{ email: user.email }],
    subject: `Tennis booking cancellation`,
    text: `
        Hi ${user.name_first}, 
        
        Your booking of time slots ${booking.slots_full.map((slot) => {return slot.time})} (${booking.slots.length / 2} hour/s) on ${booking.day}/${booking.month}/${booking.year} is cancelled.
        
        Confirmation #: ${newLog._id.toString()}
        Refund amount: ${booking.amount}
        Remaining account balance: ${user.balance + booking.amount}

        This is an auto-generated email.
        `,
  })

  //return confirmation with amount of credit and new user balance.
  res.status(200).json({
      message: `Booking cancelled. You have been credited ${booking.amount}.`,
    })
})

module.exports = {
  checkAvailability,
  newBooking,
  getUpcomingBookings,
  cancelBooking,
}

