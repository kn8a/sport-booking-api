const asyncHandler = require("express-async-handler")

const isGuard = asyncHandler(async (req, res, next) => {

  if (req.user.role != 'guard') {
    res.status(400).json({message:'You are not authorized to access this resource'})
    return
  } else {
    next()
  }
})

module.exports = { isGuard }