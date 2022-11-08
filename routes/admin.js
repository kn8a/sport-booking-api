var express = require('express');
const { route } = require(".")
var router = express.Router();
const { isAdmin} = require('../middleware/isAdminMiddleware')
const { protect } = require('../middleware/authMiddleware');

const {
  userRegister,
  userLogin,
  userUpdate,
  getBalance
} = require("../controllers/userController");

const {generateCode, confirmAdmin, lookupUsersTopUp, TopUp} = require('../controllers/adminController')

router.post("/invite", protect, isAdmin, generateCode)
router.get("/check", protect, isAdmin, confirmAdmin)
router.get("/users-top-up", protect, isAdmin, lookupUsersTopUp)
router.post('/top-up', protect, isAdmin, TopUp)

module.exports = router;