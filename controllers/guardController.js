const Booking = require("../models/bookingModel")
const User = require("../models/userModel")
const Invite = require("../models/inviteModel")
const Log = require("../models/logModel")
const bcrypt = require("bcryptjs")

const asyncHandler = require("express-async-handler")
const axios = require("axios")
const { MailtrapClient } = require("mailtrap")
const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN })
const sender = {
  name: "Tennis Admin",
  email: process.env.MAILTRAP_SENDER_EMAIL,
}
const randomString = require("random-string")

//* confirm guard
const confirmGuard = asyncHandler(async (req, res) => {
  res.status(200).json({ guard: true })
})

//* get today's bookings
const getBookings = asyncHandler(async (req, res) => {
    console.log('guard get bookings')
    
    const localTime = await axios
    .get("https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok")
    .then((response) => {
      return response.data
    })

    const bookings = await Booking.find({year: localTime.year, month: localTime.month, day: localTime.day, status:'confirmed'})
    .populate({
        path: "user",
        select: { name_first: 1, name_last: 1, address: 1 },
      }).sort({date: 1})
    res.status(200).json({ bookings: bookings })
  })

//* confirm a booking
const confirmBooking = asyncHandler(async (req, res) => {
    console.log(req.body)
    const booking = await Booking.findById(req.body.id).populate('user')
    console.log(booking)
    const updateBooking = await booking.update({status: 'completed'})
    const newLog = await Log.create({
        created_by: req.user._id,
        reference_user: booking.user._id,
        user_address: booking.user.address,
        user_email: booking.user.email,
        type: "check-in",
        text: `Guard (${req.user.name_first} ${
          req.user.name_last
        }) checked-in ${booking.user.name_first} ${booking.user.name_last} (${booking.user.address}) for booking on ${booking.day}/${booking.month}/${booking.year} with time slots: ${booking.slots_full.map((slot) => {
            return slot.time
          })}`,
      })
      client.send({
        from: sender,
        to: [{ email: booking.user.email }],
        subject: `Tennis booking check-in`,
        text: `
            Hi ${booking.user.name_first}, 
            
            You have checked-in for your booking of time slots ${booking.slots_full.map((slot) => {
              return slot.time
            })} (${booking.slots.length / 2} hour/s) on ${booking.day}/${
          booking.month
        }/${booking.year}.
            
            Confirmation #: ${newLog._id.toString()}
    
            This is an auto-generated email.
            `,
      })
    res.status(200).json({ guard: true })
  })
  



  module.exports = {
    confirmBooking, confirmGuard, getBookings
  }