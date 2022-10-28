var express = require('express');
const { route } = require(".")
var router = express.Router();
const { protect } = require("../middleware/authMiddleware")
const { curDate } = require("../middleware/curDateTime")

const {
    checkAvailability, newBooking
  } = require("../controllers/bookingController");
const { isAdmin } = require('../middleware/isAdminMiddleware');

router.get("/check/:date", checkAvailability)
router.post("/", protect, isAdmin, newBooking)

module.exports = router;