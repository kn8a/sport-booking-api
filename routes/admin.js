var express = require('express');
const { route } = require(".")
var router = express.Router();
const { isAdmin} = require('../middleware/isAdminMiddleware')
const { protect } = require('../middleware/authMiddleware');

const {
  userRegister,
  userLogin,
  getBalance,
} = require("../controllers/userController");

const {generateCode, confirmAdmin, lookupUsersTopUp, TopUp, getPastBooking, getFutureBooking, cancelBooking, lookupUsersManage, userUpdate, addUser} = require('../controllers/adminController')

router.post("/invite", protect, isAdmin, generateCode)
router.get("/check", protect, isAdmin, confirmAdmin)
router.get("/users-top-up", protect, isAdmin, lookupUsersTopUp)
router.get("/users-manage", protect, isAdmin, lookupUsersManage)
router.post('/top-up', protect, isAdmin, TopUp)
router.get("/bookings/past", protect, isAdmin, getPastBooking)
router.get("/bookings/future", protect, isAdmin, getFutureBooking)
router.put("/bookings/cancel", protect, isAdmin, cancelBooking)
router.put("/users/update", protect, isAdmin, userUpdate)
router.post("/users/add", protect, isAdmin, addUser)

module.exports = router;