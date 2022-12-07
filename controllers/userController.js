const User = require("../models/userModel")
const asyncHandler = require("express-async-handler")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const sanitize = require("mongo-sanitize");

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

//* update user profile
const userUpdate = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
  })
  res.status(200).json({ message: "User updated" })
})

const getBalance = asyncHandler(async (req, res) => {
  const userBal = await User.findById(req.user._id).select({ balance: 1 })
  res.status(200).json({ balance: userBal })
})

module.exports = {
  userRegister,
  getBalance,
  userLogin,
  userUpdate,
}
