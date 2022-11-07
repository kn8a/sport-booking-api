const Booking = require("../models/bookingModel")
const User = require("../models/userModel")
const Invite = require('../models/inviteModel')
const Log = require('../models/logModel')
const asyncHandler = require("express-async-handler")
const axios = require("axios");
// const Hashids = require('hashids/cjs')
// const hashids = new Hashids()
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

    //if xists update, else create new
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

const checkAvailability = asyncHandler(async(req,res) => {
    
    //getBkkTime()

    const localTime = await axios.get('https://www.timeapi.io/api/Time/current/zone?timeZone=Asia/Bangkok')
    .then(response => {
        return response.data
    })
    
    console.log(localTime)

  
    
    const date= dateSlicer(req.params.date)

   

    if (futureDateChecker(date,localTime)) {
        res.status(400).json({message: "You cannot book in the past. Please select a future date"})
        return
    }
    

    
    //*get booking for date - add Select only slots
    const existingBookings = await Booking.find({year:date.year, month:date.month, day:date.day, status:{$not: {$eq: 'cancelled'}}}).select({slots:1})
    //console.log(existingBookings)
    let bookedSlots=[]
    if (existingBookings) {
        for (let i=0; i<existingBookings.length; i++) {
            bookedSlots.push(...existingBookings[i].slots)
        }
    }
    //console.log(bookedSlots)

    const times = buildTimes(bookedSlots, localTime, date)
    //console.log(times)
    res.status(200).json({times: times})
})

module.exports = {
    checkAvailability, generateCode, confirmAdmin
  }