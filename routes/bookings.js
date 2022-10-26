var express = require('express');
const { route } = require(".")
var router = express.Router();
const { protect } = require("../middleware/authMiddleware")
const { curDate } = require("../middleware/curDateTime")

const {
    checkAvailability, newBooking
  } = require("../controllers/bookingController")

router.get("/check/:date", checkAvailability)
router.post("/", protect, newBooking)

module.exports = router;