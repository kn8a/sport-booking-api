const Booking = require("../models/bookingModel")
const User = require("../models/userModel")
const Invite = require('../models/inviteModel')
const Log = require('../models/logModel')
const asyncHandler = require("express-async-handler")
const axios = require("axios");

const randomString = require('random-string');

const generateCode = asyncHandler(async(req,res) => {
    
    //validate address format
    function useRegex(input) {
        let regex = /\d\d\/\d\d\d/i;
        return regex.test(input);
    }

    if (!useRegex(req.body.address)) {
        res.status(400).json({message: 'Incorrect address format'})
        return
    }

    //check if address already has code
    const alreadyExists = await Invite.findOne({address: req.body.address})

    //generate new code
    const code = randomString({
        length: 6,
        numeric: true,
        letters: true,
        exclude: ['0','O',"o",'l','I','L',"1"]
    })

    //if exists update, else create new
    if (alreadyExists) {
        await alreadyExists.update({code: code})
        res.status(200).json({code:code})
        return
    } else {
        await Invite.create({
            address: req.body.address,
            code: code
        })
        res.status(200).json({code: code})
    }
})

const confirmAdmin = asyncHandler(async(req,res)=> {
    res.status(200).json({admin: true})
})

const lookupUsersTopUp = asyncHandler(async(req,res)=> {
    const users = await User.find({status: 'approved', role:'admin'}).select({address:1, name_first:1, name_last:1, email:1, balance:1})
    res.status(200).json({users:users})
})

const TopUp = asyncHandler(async(req,res)=> {
    
    const {user, amount, receipt} = req.body
    console.log(user, amount, receipt)
    if (!user) {
        res.status(400).json({message:'Please select a user and try again'})
        return
    }
    if (!amount || Number(amount) % 50 != 0) {
        res.status(400).json({message:'Please enter valid amount and try again'})
        return
    }
    if (!receipt) {
        res.status(400).json({message:'Please enter a receipt number'})
        return
    }
    
})

module.exports = {
    generateCode, confirmAdmin, lookupUsersTopUp, TopUp
  }