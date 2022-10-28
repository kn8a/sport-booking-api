const User = require("../models/userModel")
const asyncHandler = require("express-async-handler")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { use } = require("../routes/users")
//const nodemailer = require("nodemailer");
const sendMailMethod = require("../send-mail")




//jwt token generator
const genToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" })
}

//*create user with balance 0 and status pending
const userRegister = asyncHandler(async (req,res) => { 

    console.log('reg function hit')
    console.log(req.body)
    const {name_first, name_last, email, password, confirm_password, address} = req.body

    if (!name_first || !name_last || !email || !password || !confirm_password || !address) {
        res.status(400).json({ message: "Please fill out all required fields" })
        return
    }

    if (password != confirm_password) {
        res.status(400).json({ message: `Passwords don't match. Please retry.` })
        return
    }

    if (password.length < 8) {
        res.status(400).json({ message: `Password is too short, must be at least 8 characters` })
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
        status: 'pending'
      })

    if (newUser) {
        res.status(200).json({ message: "Profile created successfully" })
        
        
    } else {
        res.status(400).json({ message: "Failed to register, please retry." })
        
    }
})

//* user login
const userLogin = asyncHandler(async (req,res) => {
    const { email, password } = req.body

    if (!email || !password) {
        res.status(400).json({ message: "Please enter email and password" })
        return
    }

    const user = await User.findOne({ email })
    console.log(user)
    
    if (user && (await bcrypt.compare(req.body.password, user.password)) && user.status == 'approved') {
        res.status(200).json({
          id: user.id,
          name_first: user.name_first,
          name_last: user.name_last,
          token: genToken(user.id),
          balance: user.balance
          // profile_pic: user.profile_pic,
        })
        try {
            const result = await sendMailMethod({from: "contact@kn8dev.com", to:['admin@kn8dev.com'], subject: 'test', text:'test email'})
            console.log(result)
        } catch (error) {
          console.error(error.message);
        }
        return
      } else if (user && (await bcrypt.compare(req.body.password, user.password)) && user.status == 'pending') {
        res.status(400).json({ message: "Your account is pending, please await admin approval." })
        return
      } else if (user && (await bcrypt.compare(req.body.password, user.password)) && user.status == 'suspended') {
        res.status(400).json({ message: "Your account has been suspended, please contact admin." })
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
  
  module.exports = {
    userRegister,
//    getMe,
//    getAllUsers,
    userLogin,
    userUpdate,
//    getUser,
//    uploadProfilePic,
  }