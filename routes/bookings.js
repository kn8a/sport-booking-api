var express = require('express');
const { route } = require(".")
var router = express.Router();

const {
    checkAvailability
  } = require("../controllers/bookingController")

router.get("/check/:date", checkAvailability
)
//router.post("/login", userLogin)

module.exports = router;