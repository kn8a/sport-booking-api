var express = require('express');
const { route } = require(".")
var router = express.Router();
const { isGuard} = require('../middleware/isGuardMiddleware')
const { protect } = require('../middleware/authMiddleware');

const { confirmBooking, confirmGuard, getBookings} = require('../controllers/guardController')

//router.post("/invite", protect, isAdmin, generateCode)
// router.get("/check", protect, isAdmin, confirmAdmin)
// router.get("/users-top-up", protect, isAdmin, lookupUsersTopUp)
// router.get("/users-manage", protect, isAdmin, lookupUsersManage)
// router.post('/top-up', protect, isAdmin, TopUp)
// router.get("/bookings/past", protect, isAdmin, getPastBooking)
// router.get("/bookings/future", protect, isAdmin, getFutureBooking)
// router.put("/bookings/cancel", protect, isAdmin, cancelBooking)
// router.put("/users/update", protect, isAdmin, userUpdate)
// router.post("/users/add", protect, isAdmin, addUser)
// router.get('/logs/:type/:duration', protect, isAdmin, fetchLogs)
router.get('/bookings', protect, isGuard, getBookings)
router.put('/confirm', protect, isGuard, confirmBooking )
router.get('/check', protect, isGuard, confirmGuard )

module.exports = router;