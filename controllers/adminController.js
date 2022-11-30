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


//*Generate Invite Code
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
    letters: false,
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

//* confirm admin
const confirmAdmin = asyncHandler(async (req, res) => {
  res.status(200).json({ admin: true })
})

//* Look up users for top-up
const lookupUsersTopUp = asyncHandler(async (req, res) => {
  const users = await User.find({ status: "approved", role: "user" }).select({
    address: 1,
    name_first: 1,
    name_last: 1,
    email: 1,
    balance: 1,
    status: 1,
  }).sort({address:1})
  res.status(200).json({ users: users })
})

//* Look up users to manage
const lookupUsersManage = asyncHandler(async (req, res) => {
  const users = await User.find().select({
    password: 0,
    notes: 0,
  })
  res.status(200).json({ users: users })
})

//* Top-up
const TopUp = asyncHandler(async (req, res) => {
  const { userId, amount, receipt } = req.body
  //console.log(userId, amount, receipt)

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
    created_by: req.user._id,
    reference_user: user._id,
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
  res.status(200).json({
    message: `Added ${amount} to ${user.address}. New balance: ${newBal}`,
  })
})

//* Get past bookings (30 days)
const getPastBooking = asyncHandler(async (req, res) => {
  const localTime = await axios
    .get("https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok")
    .then((response) => {
      return response.data
    })

  const requestTime = new Date(
    Date.UTC(
      localTime.year,
      localTime.month - 1,
      localTime.day,
      localTime.hour,
      localTime.minute
    )
  )

  //console.log(localTime)
  console.log(requestTime)

  const unixDateCur = Math.floor(requestTime.getTime() / 1000)
  requestTime.setDate(requestTime.getDate() - 30)
  console.log(requestTime)
  const unixDatePast = Math.floor(requestTime.getTime() / 1000)

  const pastBookings = await Booking.find({
    status: {$in: ["confirmed", 'completed']},
    $and: [
      { date: { $gt: unixDatePast } },
      { date: { $lt: unixDateCur } },
    ],
  })
    .populate({
      path: "user",
      select: { name_first: 1, name_last: 1, address: 1 },
    })
    .sort({ date: -1 })
  res.status(200).json({ bookings: pastBookings })
})

//* Get future bookings
const getFutureBooking = asyncHandler(async (req, res) => {
  const localTime = await axios
    .get("https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok")
    .then((response) => {
      return response.data
    })

  const requestTime = new Date(
    Date.UTC(
      localTime.year,
      localTime.month - 1,
      localTime.day,
      localTime.hour,
      localTime.minute
    )
  )
  const unixDateCur = Math.floor(requestTime.getTime() / 1000)
  //console.log(requestTime)

  const futureBookings = await Booking.find({
    status: {$in: ["confirmed", 'completed']},
    date: { $gt: unixDateCur },
  })
    .populate({
      path: "user",
      select: { name_first: 1, name_last: 1, address: 1 },
    })
    .sort({ date: 1 })
  res.status(200).json({ bookings: futureBookings })
})

//* Cancel past or future booking
const cancelBooking = asyncHandler(async (req, res) => {
  console.log(req.body)
  const booking = await Booking.findById(req.body._id)
  if (booking.status == "cancelled") {
    res.json(400).json({
      message:
        "This booking has already been cancelled. Go back to main menu to refresh.",
    })
    return
  }
  const user = await User.findById(req.body.user._id)
  //console.log(booking)
  const newBal = user.balance + booking.amount
  const bookingupdate = await booking.update({ status: "cancelled" })
  const userUpdate = await user.update({ balance: newBal })
  const newLog = await Log.create({
    created_by: req.user._id,
    reference_user: user._id,
    user_address: user.address,
    user_email: req.user.email,
    type: "refund",
    text: `Admin (${req.user.name_first}) cancelled/refunded ${
      booking.slots.length / 2
    } hour/s, on ${booking.day}/${booking.month}/${booking.year}, totalling ${
      booking.amount
    }. For address: ${user.address} (${
      user.name_first
    }). User's balance is now: ${user.balance + booking.amount}. Reason: ${req.body.reason}`,
  })
  //console.log(newLog)
  client.send({
    from: sender,
    to: [{ email: user.email }],
    subject: `Tennis booking cancellation`,
    text: `
        Hi ${user.name_first}, 
        
        Your booking of time slots ${booking.slots_full.map((slot) => {
          return slot.time
        })} (${booking.slots.length / 2} hour/s) on ${booking.day}/${
      booking.month
    }/${booking.year}, has been cancelled by admin (${req.user.name_first}). Reason: ${req.body.reason}.
        
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

//* Update user profile
const userUpdate = asyncHandler(async (req, res) => {
  //console.log(req.body)

  const note = req.body.note
  const id = req.body.id

  if (!req.body.new) {
    res.status(400).json({ message: "No changes made, nothing to update." })
    return
  }

  if (!note) {
    res
      .status(400)
      .json({ message: "You must include a note explaining changes" })
    return
  }

  const user = await User.findByIdAndUpdate(id, req.body.new, {
    new: true,
  })
  await user.update({ $push: { notes: note } })

  const newLog = await Log.create({
    created_by: req.user._id,
    reference_user: user._id,
    user_address: user.address,
    user_email: user.email,
    type: "edit",
    text: `Admin (${req.user.name_first} ${
      req.user.name_last
    }) manually updated user from ${JSON.stringify(
      req.body.old
    )} to ${JSON.stringify(req.body.new)}`,
  })

  res.status(200).json({ message: "User updated" })
  //console.log(user)
})

//* Manually add a user
const addUser = asyncHandler(async (req, res) => {
  //console.log(req.body)
  const {
    name_first,
    name_last,
    email,
    password,
    confirm_password,
    address,
    role,
  } = req.body

  if (
    !name_first ||
    !name_last ||
    !email ||
    !password ||
    !confirm_password ||
    !address ||
    !role
  ) {
    res.status(400).json({ message: "Please fill out all required fields" })
    return
  }

  if (password != confirm_password) {
    res.status(400).json({ message: `Passwords don't match. Please retry.` })
    return
  }

  if (password.length < 8) {
    res
      .status(400)
      .json({ message: `Password is too short, must be at least 8 characters` })
    return
  }

  const userExists = await User.findOne({ email })

  if (userExists) {
    res.status(400).json({ message: `User with this email already exists` })
    return
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPass = await bcrypt.hash(password, salt)

  const newUser = await User.create({
    name_first,
    name_last,
    email,
    role: role,
    password: hashedPass,
    address,
    balance: 0,
    status: "approved",
  })

  if (newUser) {
    await Log.create({
      created_by: req.user._id,
      reference_user: newUser._id,
      user_address: address,
      user_email: email,
      text: `Admin (${req.user.name_first} ${
        req.user.name_last
      }) manually added a new ${role} ${newUser.name_first} ${
        newUser.name_last
      } (${newUser.email}) with address ${newUser.address}. Balance: ${0}`,
      type: "registration",
    })

    if (role == "user") {
      client.send({
        from: sender,
        to: [{ email: newUser.email }],
        subject: `KortGo registration`,
        text: `
              Hi ${newUser.name_first}, 
              
              Welcome to KortGo!
  
              Please top-up your account at the office to start making bookings.
  
              This is an auto-generated email.
              `,
      })
    }

    res
      .status(200)
      .json({ message: "User created successfully", id: newUser._id })
  } else {
    res.status(400).json({ message: "Failed to add user, please retry." })
  }
})

//* Get logs
const fetchLogs = asyncHandler(async (req, res) => {
  console.log(req.params)
  const localTime = await axios
    .get("https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok")
    .then((response) => {
      //console.log(response.data)
      return response.data
    })

  const requestTime = new Date(
    Date.UTC(
      localTime.year,
      localTime.month - 1,
      localTime.day,
      localTime.hour,
      localTime.minute
    )
  )
  //console.log(requestTime)
  requestTime.setDate(requestTime.getDate() - Number(req.params.duration))

  if (req.params.type == "all") {
    const allLogs = await Log.find({
      createdAt: { $gt: requestTime },
    }).sort({ createdAt: "descending" })
    res.status(200).json({ logs: allLogs })
    return
  }

  //console.log(requestTime)
  const fetchedLogs = await Log.find({
    type: req.params.type,
    createdAt: { $gt: requestTime },
  }).sort({ createdAt: "descending" })
  //console.log(fetchedLogs)
  res.status(200).json({ logs: fetchedLogs })
})

module.exports = {
  addUser,
  fetchLogs,
  generateCode,
  confirmAdmin,
  lookupUsersTopUp,
  TopUp,
  getPastBooking,
  getFutureBooking,
  cancelBooking,
  lookupUsersManage,
  userUpdate,
}
