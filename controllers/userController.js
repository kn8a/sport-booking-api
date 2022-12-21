const User = require("../models/userModel")
const asyncHandler = require("express-async-handler")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const sanitize = require("mongo-sanitize");
const Booking = require("../models/bookingModel")
const axios = require("axios")

//const { use } = require("../routes/users")

const Invite = require("../models/inviteModel")
const Log = require("../models/logModel")

const { MailtrapClient } = require("mailtrap")
const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN })
const sender = {
  name: "Tennis Admin",
  email: process.env.MAILTRAP_SENDER_EMAIL,
}

//* jwt token generator
const genToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" })
}

//*create user with balance 0 and status approved
const userRegister = asyncHandler(async (req, res) => {
  req.body = sanitize(req.body)

  const {
    name_first,
    name_last,
    email,
    password,
    confirm_password,
    address,
    invitation,
  } = req.body

  if (
    !name_first ||
    !name_last ||
    !email ||
    !password ||
    !confirm_password ||
    !address ||
    !invitation
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

  const inviteExists = await Invite.findOne({
    address: address,
    code: invitation,
  })

  if (!inviteExists) {
    res
      .status(400)
      .json({
        message: `Your invitation code is invalid, please contact admin.`,
      })
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
    password: hashedPass,
    address,
    balance: 0,
    status: "approved",
  })

  if (newUser) {
    await Log.create({
      created_by: newUser._id,
      reference_user: newUser._id,
      user_address: address,
      user_email: email,
      text: `New user ${name_first} ${name_last} (${email}) registered with address ${address}, using invite code ${
        inviteExists.code
      }. Balance: ${0}`,
      type: "registration",
    })
    inviteExists.deleteOne()

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

    res
      .status(200)
      .json({ message: "Profile created successfully", id: newUser._id })
  } else {
    res.status(400).json({ message: "Failed to register, please retry." })
  }
})

//* user login
const userLogin = asyncHandler(async (req, res) => {
  req.body = sanitize(req.body)
  console.log(req.body)
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ message: "Please enter email and password" })
    return
  }

  const user = await User.findOne({ email })
  console.log(user)

  if (
    user &&
    (await bcrypt.compare(req.body.password, user.password)) &&
    user.status == "approved"
  ) {
    res.status(200).json({
      id: user.id,
      name_first: user.name_first,
      name_last: user.name_last,
      token: genToken(user.id),
      balance: user.balance,
      role: user.role,
    })
    return
  } else if (
    user &&
    (await bcrypt.compare(req.body.password, user.password)) &&
    user.status == "pending"
  ) {
    res
      .status(400)
      .json({
        message: "Your account is pending, please await admin approval.",
      })
    return
  } else if (
    user &&
    (await bcrypt.compare(req.body.password, user.password)) &&
    user.status == "suspended"
  ) {
    res
      .status(400)
      .json({
        message: "Your account has been suspended, please contact admin.",
      })
    return
  } else {
    res.status(400).json({ message: "Invalid credential" })
    return
  }
})

//* get account details
const getUserInfo = asyncHandler(async (req, res) => {
  console.log(req.user._id)
  const userInfo = await User.findById(req.user._id).select({ password: 0, role: 0, status: 0 })
  res.status(200).json({ userInfo: userInfo })
})

//* update user profile
const userUpdate = asyncHandler(async (req, res) => {
  console.log(req.body)
  if (req.body.email) {
    const user = await User.findByIdAndUpdate(req.user._id, {email: req.body.email})
    console.log(user)
    res.status(200).json({ message: "updated" })
    return
  }
  if (req.body.password && req.body.confirmPass && req.body.password.length>7) {
    const salt = await bcrypt.genSalt(10)
    const hashedPass = await bcrypt.hash(req.body.password, salt)
    const user = await User.findByIdAndUpdate(req.user._id, {password: hashedPass})
    console.log(user)
    res.status(200).json({message: 'updated'})
    return
  } else {
    res.status(400).json({ message: "Invalid update data." })
  }
  // const user = await User.findByIdAndUpdate(req.user._id, req.body, {
  //   new: true,
  // })
  // res.status(200).json({ message: "User updated" })
})

//* delete user account
const delAccount = asyncHandler(async (req, res) => {
  console.log('delete account')
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

  const futureBookings = await Booking.find({ user: req.user._id,
    status: {$in: ["confirmed", 'completed']},
    date: { $gt: unixDateCur },
  }).count()

  const user = await User.findById(req.user._id)

  console.log(futureBookings, user.balance)

  if (futureBookings > 0) {
    res.status(400).json({ message: "You have upcoming bookings. Please cancel them and clear balance with the office" })
    return
  }

  if (user.balance > 0) {
    res.status(400).json({ message: `You still have a balance of ${user.balance}. Please clear it with the office.` })
    return
  }

  const newLog = await Log.create({
    created_by: req.user._id,
    reference_user: user._id,
    user_address: user.address,
    user_email: req.user.email,
    type: "Other",
    text: `User ${user.name_first} ${user.name_last} at address  ${user.address} 
    deleted their account which had a balance of: ${user.balance}`,
  })

  client.send({
    from: sender,
    to: [{ email: newUser.email }],
    subject: `KortGo registration`,
    text: `
            Hi ${user.name_first}, 
            
            Your KortGo account has been deleted!

            This is an auto-generated email.
            `,
  })

  user.deleteOne()
  res.status(200).json({ message: "deleted" })
  // const userBal = await User.findById(req.user._id).select({ balance: 1 })
  // res.status(200).json({ balance: userBal })
})

//* get current balance
const getBalance = asyncHandler(async (req, res) => {
  const userBal = await User.findById(req.user._id).select({ balance: 1 })
  res.status(200).json({ balance: userBal })
})

//* check user role
const checkRole = asyncHandler(async (req, res) => {
  const userRole = req.user.role
  res.status(200).json({ role: userRole })
})

//* Get logs
const fetchLogs = asyncHandler(async (req, res) => {
  console.log(req.params.duration)
  if (req.params.duration != '3' && req.params.duration != '7' && req.params.duration != '30') {
    res.status(400).json({ message: `Invalid duration` })
    return
  }
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

  
    const allLogs = await Log.find({ reference_user: req.user._id,
      createdAt: { $gt: requestTime },
    }).sort({ createdAt: "descending" })
    res.status(200).json({ logs: allLogs })
  
})

module.exports = {
  userRegister,
  getBalance,
  userLogin,
  userUpdate,
  delAccount,
  fetchLogs,
  getUserInfo,
  checkRole
}
