var express = require('express');
const { route } = require(".")
var router = express.Router();
const { isAdmin} = require('../middleware/isAdminMiddleware')

const {
  userRegister,
  userLogin,
  userUpdate,
  getBalance
} = require("../controllers/userController");
const { protect } = require('../middleware/authMiddleware');

router.post("/register", userRegister)

module.exports = router;