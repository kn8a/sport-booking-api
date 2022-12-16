const asyncHandler = require("express-async-handler")

const isUser = asyncHandler(async (req, res, next) => {

  if (req.user.role != 'user') {
    res.status(400).json({message:'You are not authorized to access this resource'})
    return
  } else {
    next()
  }
})

module.exports = { isUser }