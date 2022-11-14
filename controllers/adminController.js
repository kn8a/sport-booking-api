const Booking = require("../models/bookingModel")
const User = require("../models/userModel")
const Invite = require("../models/inviteModel")
const Log = require("../models/logModel")
const asyncHandler = require("express-async-handler")
const axios = require("axios")
const { MailtrapClient } = require("mailtrap")
const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN })
const sender = {
  name: "Tennis Admin",
  email: process.env.MAILTRAP_SENDER_EMAIL,
}

const randomString = require("random-string")

const generateCode = asyncHandler(async (req, res) => {
  //validate address format
  function useRegex(input) {
    let regex = /\d\d\/\d\d\d/i
    return regex.test(input)
  }

  if (!useRegex(req.body.address)) {
    res.status(400).json({ message: "Incorrect address format" })
    return
  }

  //check if address already has code
  const alreadyExists = await Invite.findOne({ address: req.body.address })

  //generate new code
  const code = randomString({
    length: 6,
    numeric: true,
    letters: true,
    exclude: ["0", "O", "o", "l", "I", "L", "1", 'i', 'q'],
  })

  //if exists update, else create new
  if (alreadyExists) {
    await alreadyExists.update({ code: code })
    res.status(200).json({ code: code })
    return
  } else {
    await Invite.create({
      address: req.body.address,
      code: code,
    })
    res.status(200).json({ code: code })
  }
})

const confirmAdmin = asyncHandler(async (req, res) => {
  res.status(200).json({ admin: true })
})

const lookupUsersTopUp = asyncHandler(async (req, res) => {
  const users = await User.find({ status: "approved", role: "user" }).select({
    address: 1,
    name_first: 1,
    name_last: 1,
    email: 1,
    balance: 1,
  })
  res.status(200).json({ users: users })
})

const TopUp = asyncHandler(async (req, res) => {
  const { userId, amount, receipt } = req.body
  console.log(userId, amount, receipt)
  if (!userId) {
    res.status(400).json({ message: "Please select a user and try again" })
    return
  }
  if (!amount || Number(amount) % 50 != 0) {
    res.status(400).json({ message: "Please enter valid amount and try again" })
    return
  }
  if (!receipt) {
    res.status(400).json({ message: "Please enter a receipt number" })
    return
  }

  const user = await User.findById(userId)
  if (!user) {
    res.status(400).json({ message: "This user does not exist" })
    return
  }
  const newBal = user.balance + Number(amount)
  const updatedUser = await user.update({ balance: newBal })
  const log = await Log.create({
    user_address: user.address,
    user_email: user.email,
    type: "topup",
    text: `Admin (${req.user.name_first}) added ${amount} to ${user.address} (${user.name_first}, ${user.name_last}). Receipt number is ${receipt}. User's new balance is ${newBal}`,
  })
  //send confirmation email
  client.send({
    from: sender,
    to: [{ email: user.email }],
    subject: `Tennis top-up confirmation`,
    text: `
        Hi ${user.name_first}, 
        
        Your account has been credited ${amount}.
        
        Confirmation #: ${log._id.toString()}
        Receipt #: ${receipt}
        Your current balance: ${newBal}

        This is an auto-generated email.
        `,
  })
  res
    .status(200)
    .json({
      message: `Added ${amount} to ${user.address}. New balance: ${newBal}`,
    })
})

const getPastBooking = asyncHandler(async (req, res) => {

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
    const unixDateCur = Math.floor(requestTime.getTime() / 1000)
    requestTime.setDate(requestTime.getDate() -30)
    const unixDatePast = Math.floor(requestTime.getTime() / 1000)

    const pastBookings = await Booking.find({status: 'confirmed', $and: [{date: {$gt: unixDatePast}, status:'confirmed'},{date: {$lt: unixDateCur}}]}).populate({
      path: "user",
      select: { name_first: 1, name_last: 1, address: 1 },
    }).sort({ date: -1 })
    res.status(200).json({bookings: pastBookings})
})

const getFutureBooking = asyncHandler(async (req, res) => {

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
    const unixDateCur = Math.floor(requestTime.getTime() / 1000)
    console.log(requestTime)
    
    const futureBookings = await Booking.find({status: 'confirmed', date: {$gt: unixDateCur}}).populate({
      path: "user",
      select: { name_first: 1, name_last: 1, address: 1 },
    }).sort({ date: 1 })
    res.status(200).json({bookings: futureBookings})
})

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.body._id)
  if (booking.status == 'cancelled') {
    res.json(400).json({message: 'This booking has already been cancelled. Go back to main menu to refresh.'})
    return
  }
  const user = await User.findById(req.body.user._id)
  console.log(booking)
  const newBal = user.balance + booking.amount
  const bookingupdate = await booking.update({status: 'cancelled'})
  const userUpdate = await user.update({balance: newBal})
  const newLog = await Log.create({
    user_address: user.address,
    user_email: req.user.email,
    type: "refund",
    text: `Admin (${req.user.name_first}) cancelled/refunded ${booking.slots.length / 2} hour/s, on ${booking.day}/${booking.month}/${booking.year}, totalling ${booking.amount}. For address: ${user.address} (${user.name_first}). User's balance is now: ${user.balance + booking.amount}`,
  })
  console.log(newLog)
  client.send({
    from: sender,
    to: [{ email: user.email }],
    subject: `Tennis booking cancellation`,
    text: `
        Hi ${user.name_first}, 
        
        Your booking of time slots ${booking.slots_full.map((slot) => {return slot.time})} (${booking.slots.length / 2} hour/s) on ${booking.day}/${booking.month}/${booking.year}, has been cancelled by admin (${req.user.name_first}).
        
        Confirmation #: ${newLog._id.toString()}
        Refund amount: ${booking.amount}
        New account balance: ${user.balance + booking.amount}

        This is an auto-generated email.
        `,
  })
  //return confirmation with amount of credit and new user balance.
  res.status(200).json({
    message: `Booking cancelled. ${user.address} has been credited ${booking.amount}.`,
  })
})





module.exports = {
  generateCode,
  confirmAdmin,
  lookupUsersTopUp,
  TopUp,
  getPastBooking,
  getFutureBooking,
  cancelBooking
}
