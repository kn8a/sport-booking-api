const User = require("../models/userModel")
const asyncHandler = require("express-async-handler")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

//*create user with balance 0 and status pending
const userRegister = asyncHandler(async (req,res) => { 
    const {name_first, name_last, email, password, confirm_password, address} = req.body

    if (!name_first || !name_last || !email || !password || !confirm_password || !address) {
        res.status(400).json({ message: "Please fill out all required fields" })
        return
    }

    if (password != confirm_password) {
        res.status(400).json({ message: `Passwords don't match. Please retry.` })
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

