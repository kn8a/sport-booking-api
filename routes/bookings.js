var express = require('express');
const { route } = require(".")
var router = express.Router();
const { protect } = require("../middleware/authMiddleware")
const { curDate } = require("../middleware/curDateTime")

const {
    checkAvailability, newBooking, getUpcomingBookings, cancelBooking
  } = require("../controllers/bookingController");
const { isAdmin } = require('../middleware/isAdminMiddleware');

router.get("/check/:date", checkAvailability)
router.post("/", protect, newBooking)
router.get("/upcoming", protect, getUpcomingBookings)
router.put("/cancel", protect, cancelBooking)

module.exports = router;