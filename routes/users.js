var express = require('express');
const { route } = require(".")
var router = express.Router();

const {
  userRegister,
  userLogin,
  userUpdate,
} = require("../controllers/userController")

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

router.post("/register", userRegister)
router.post("/login", userLogin)

module.exports = router;
