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
    res.status(200).json({ guard: true })
  })

//* confirm a booking
const confirmBooking = asyncHandler(async (req, res) => {
    res.status(200).json({ guard: true })
  })



  module.exports = {
    confirmBooking, confirmGuard, getBookings
  }