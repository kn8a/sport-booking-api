var express = require('express');
const { route } = require(".")
var router = express.Router();
const { isUser} = require('../middleware/isUserMiddleware')

const {
  userRegister,
  userLogin,
  userUpdate,
  getBalance,
  checkRole
} = require("../controllers/userController");
const { protect } = require('../middleware/authMiddleware');

router.get("/check", protect, checkRole)
router.post("/register", userRegister)
router.post("/login", userLogin)
router.get('/balance', protect, getBalance)

module.exports = router;
