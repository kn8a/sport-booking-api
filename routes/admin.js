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

const {generateCode, confirmAdmin} = require('../controllers/adminController')

router.post("/invite", protect, isAdmin, generateCode)
router.get("/check", protect, isAdmin, confirmAdmin)

module.exports = router;