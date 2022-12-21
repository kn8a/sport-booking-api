var express = require('express');
const { route } = require(".")
var router = express.Router();
const { isUser} = require('../middleware/isUserMiddleware')

const {
  userRegister,
  userLogin,
  delAccount,
  userUpdate,
  getUserInfo,
  getBalance,
  fetchLogs,
  checkRole
} = require("../controllers/userController");
const { protect } = require('../middleware/authMiddleware');

router.get("/check", protect, checkRole)
router.post("/register", userRegister)
router.post("/login", userLogin)
router.get('/balance', protect, getBalance)
router.get('/user/:userId', protect, getUserInfo)
router.put('/update', protect, userUpdate)
router.delete('/delete', protect, delAccount)
router.get('/logs/:duration', protect, fetchLogs)

module.exports = router;
