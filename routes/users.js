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

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

router.post("/register", userRegister)
router.post("/login", userLogin)

router.get('/balance', protect, getBalance)

module.exports = router;
