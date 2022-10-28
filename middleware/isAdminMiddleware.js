const asyncHandler = require("express-async-handler")

const isAdmin = asyncHandler(async (req, res, next) => {

  if (req.user.role != 'admin') {
    res.status(400).json({message:'You are not authorized to access this resource'})
    return
  } else {
    next()
  }
})

module.exports = { isAdmin }